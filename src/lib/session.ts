import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Сесія — це "перепустка" в cookie. Вона підписана секретом (SESSION_SECRET),
 * тому користувач не може її підробити, наприклад змінити собі роль.
 */
export type SessionPayload = {
  userId: string;
  role: "parent" | "student" | "teacher" | "admin";
  expiresAt: string;
};

const COOKIE = "itc_session";
const MAX_AGE_DAYS = 7;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET має бути не коротшим за 32 символи (див. .env.example)");
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(key());
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, role: SessionPayload["role"]) {
  const expires = new Date(Date.now() + MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const token = await encrypt({ userId, role, expiresAt: expires.toISOString() });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true, // JavaScript на сторінці не бачить cookie — захист від крадіжки
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/",
  });
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function readSession() {
  const store = await cookies();
  return decrypt(store.get(COOKIE)?.value);
}

export const SESSION_COOKIE = COOKIE;
