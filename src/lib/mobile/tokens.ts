import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/db";
import type { Role } from "@/generated/prisma/enums";

/**
 * Токени мобільного додатка. Окремо від веб-сесії (cookie) і зі своїм секретом:
 *  - access  — короткий JWT (15 хв) у заголовку Authorization: Bearer;
 *  - refresh — довгий випадковий токен (30 днів), у базі лише його хеш, одноразовий.
 */
export const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ISSUER = "itcodecraft";

function key() {
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("MOBILE_JWT_SECRET має бути не коротшим за 32 символи (див. .env.example)");
  return new TextEncoder().encode(secret);
}

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function signAccessToken(userId: string, role: Role) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience("mobile")
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(key());
}

/** id користувача з access-токена або null (прострочений, підроблений, чужий). */
export async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], issuer: ISSUER, audience: "mobile" });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

async function issueRefreshToken(userId: string, now: Date) {
  const token = randomBytes(32).toString("base64url");
  await prisma.refreshToken.create({
    data: { userId, tokenHash: sha256(token), expiresAt: new Date(now.getTime() + REFRESH_TTL_MS) },
  });
  return token;
}

export async function issueTokens(user: { id: string; role: Role }, now = new Date()) {
  const [accessToken, refreshToken] = await Promise.all([signAccessToken(user.id, user.role), issueRefreshToken(user.id, now)]);
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SEC };
}

/**
 * Обмін refresh-токена на нову пару. Токен одноразовий: повторне використання вже
 * відкликаного означає, що його, ймовірно, вкрали, тож відкликаємо всі сесії користувача.
 */
export async function rotateRefreshToken(token: string, now = new Date()) {
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!row) return null;
  if (row.revokedAt) {
    await prisma.refreshToken.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: now } });
    return null;
  }
  if (row.expiresAt <= now) return null;
  // Умовне оновлення: з двох паралельних запитів перемагає лише один
  const { count } = await prisma.refreshToken.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: now } });
  if (count === 0) return null;
  return { user: row.user, tokens: await issueTokens(row.user, now) };
}

export async function revokeRefreshToken(token: string, now = new Date()) {
  await prisma.refreshToken.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: now } });
}

/** Видаляє прострочені й давно відкликані токени. Викликається з cron. */
export async function deleteExpiredRefreshTokens(now = new Date()) {
  const week = 7 * 24 * 60 * 60 * 1000;
  const res = await prisma.refreshToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: new Date(now.getTime() - week) } }] },
  });
  return res.count;
}

// ── Квиток реєстрації через Google/Apple ──
// Новий користувач після соцвходу ще має обрати роль і підтвердити згоду.
export type SignupTicket = { provider: "google" | "apple"; sub: string; email: string | null; name: string };

export async function signSignupTicket(ticket: SignupTicket) {
  return new SignJWT({ ...ticket })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience("mobile-signup")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key());
}

export async function readSignupTicket(token: string): Promise<SignupTicket | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], issuer: ISSUER, audience: "mobile-signup" });
    const { provider, sub, email, name } = payload;
    if ((provider !== "google" && provider !== "apple") || typeof sub !== "string" || typeof name !== "string") return null;
    return { provider, sub, email: typeof email === "string" ? email : null, name };
  } catch {
    return null;
  }
}
