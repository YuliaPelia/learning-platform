import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type VerifiedGoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

export function appBase() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function googleRedirectUri() {
  return `${appBase()}/api/auth/google/callback`;
}

/** Обмін authorization code на ID token. Кидає помилку, якщо Google відмовив. */
export async function exchangeCode(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Google не віддав токен");
  const json = (await res.json()) as { id_token?: string };
  if (!json.id_token) throw new Error("У відповіді Google немає id_token");
  return json.id_token;
}

/**
 * Перевірка підпису ID token і audience нашого клієнта.
 * Мобільний додаток передає свої client ID (iOS/Android) — вони відрізняються від веб-клієнта.
 */
export async function verifyIdToken(token: string, audience?: string | string[]): Promise<VerifiedGoogleIdentity> {
  const clientId = audience ?? process.env.GOOGLE_CLIENT_ID;
  if (!clientId || (Array.isArray(clientId) && clientId.length === 0)) throw new Error("GOOGLE_CLIENT_ID не задано");
  const { payload } = await jwtVerify(token, JWKS, {
    audience: clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) throw new Error("У токені Google немає sub");
  return {
    sub,
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : "",
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : "",
  };
}
