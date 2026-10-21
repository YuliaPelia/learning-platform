import { SignJWT, jwtVerify } from "jose";

/** Ролі, які вже є в базі і можуть увійти через Google. */
export type GoogleRole = "parent" | "student" | "teacher" | "admin";

export type GoogleAccount = {
  id: string;
  role: GoogleRole;
  email: string | null;
  login: string;
  googleSub: string | null;
};

export type GoogleDecision =
  | {
      type: "sign-in";
      userId: string;
      role: GoogleRole;
      /** googleSub ще не був записаний — треба прив'язати. */
      linkSub: boolean;
      /** Пошта Google змінилась і вільна. login міняємо, лише якщо він дорівнював старій пошті. */
      emailUpdate?: { email: string; login?: string };
    }
  | { type: "signup" }
  | { type: "reject"; reason: "sub-mismatch" | "unverified" };

/** Лише внутрішній шлях. Зовнішні адреси й `//host` відсікаємо. */
export function safeNext(v: string | null | undefined) {
  if (!v || !v.startsWith("/") || v.startsWith("//")) return null;
  return v;
}

export function googleAuthUrl({ state, redirectUri, clientId }: { state: string; redirectUri: string; clientId: string }) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/**
 * Що робити з профілем Google.
 * `userBySub` і `userByEmail` шукає викликач; тут лише рішення, без бази.
 */
export function applyGoogleProfile(
  userBySub: GoogleAccount | null,
  userByEmail: GoogleAccount | null,
  profile: { sub: string; email: string; emailVerified: boolean },
): GoogleDecision {
  const email = profile.email.trim().toLowerCase();
  if (!profile.emailVerified || !email) return { type: "reject", reason: "unverified" };
  if (userBySub && userByEmail && userBySub.id !== userByEmail.id) return { type: "reject", reason: "sub-mismatch" };

  const user = userBySub ?? userByEmail;
  if (!user) return { type: "signup" };
  if (user.googleSub && user.googleSub !== profile.sub) return { type: "reject", reason: "sub-mismatch" };

  const previous = user.email?.toLowerCase() ?? "";
  const emailFree = !userByEmail || userByEmail.id === user.id;
  let emailUpdate: { email: string; login?: string } | undefined;
  if (previous !== email && emailFree) {
    emailUpdate = { email };
    if (user.login.toLowerCase() === previous) emailUpdate.login = email;
  }

  return { type: "sign-in", userId: user.id, role: user.role, linkSub: user.googleSub !== profile.sub, emailUpdate };
}

export const GOOGLE_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_SIGNUP_COOKIE = "google_signup";

export type GoogleSignup = { email: string; name: string; sub: string; next: string | null };

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET має бути не коротшим за 32 символи (див. .env.example)");
  return new TextEncoder().encode(secret);
}

/** Короткий підписаний квиток, поки людина обирає роль. Це ще не сесія. */
export async function signGoogleSignup(payload: GoogleSignup) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secretKey());
}

export async function readGoogleSignup(token: string | undefined): Promise<GoogleSignup | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.email !== "string" || typeof payload.sub !== "string" || typeof payload.name !== "string") return null;
    return {
      email: payload.email,
      name: payload.name,
      sub: payload.sub,
      next: safeNext(typeof payload.next === "string" ? payload.next : null),
    };
  } catch {
    return null;
  }
}
