import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/db";
import { applyGoogleProfile, type GoogleAccount } from "@/lib/google-auth";
import { verifyIdToken } from "@/lib/google-oauth";
import { MOBILE_ROLES } from "./http";
import { issueTokens, signSignupTicket } from "./tokens";

export type Provider = "google" | "apple";
export type SocialProfile = { sub: string; email: string; emailVerified: boolean; name: string };

const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

/** Client ID мобільних додатків Google (iOS/Android/web), через кому. */
function googleAudiences() {
  return (process.env.GOOGLE_MOBILE_CLIENT_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export async function verifyGoogleToken(idToken: string): Promise<SocialProfile> {
  const p = await verifyIdToken(idToken, googleAudiences());
  return p;
}

/** Перевірка identity token від Sign in with Apple: підпис Apple, видавець і bundle ID нашого додатка. */
export async function verifyAppleToken(identityToken: string, fullName?: string): Promise<SocialProfile> {
  const audience = process.env.APPLE_BUNDLE_ID ?? "tech.itcodecraft.app";
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, { issuer: "https://appleid.apple.com", audience });
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) throw new Error("У токені Apple немає sub");
  const verified = payload.email_verified;
  return {
    sub,
    // Apple може віддати приватну пошту-ретранслятор (…@privaterelay.appleid.com) — це нормальна адреса
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : "",
    emailVerified: verified === true || verified === "true",
    name: fullName?.trim() ?? "",
  };
}

function toAccount(u: { id: string; role: GoogleAccount["role"]; email: string | null; login: string }, sub: string | null): GoogleAccount {
  // applyGoogleProfile працює з полем googleSub; для Apple підставляємо apple_sub — логіка однакова
  return { id: u.id, role: u.role, email: u.email, login: u.login, googleSub: sub };
}

export type SocialResult =
  | { type: "tokens"; user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>; tokens: Awaited<ReturnType<typeof issueTokens>> }
  | { type: "signup"; signupToken: string; email: string | null; name: string }
  | { type: "reject"; reason: "unverified" | "conflict" | "role" };

/**
 * Вхід через Google/Apple: або пара токенів (акаунт знайдено чи прив'язано за email),
 * або квиток реєстрації, якщо це нова людина.
 */
export async function signInWithProvider(provider: Provider, profile: SocialProfile): Promise<SocialResult> {
  const field = provider === "google" ? "googleSub" : "appleSub";
  const bySub = await prisma.user.findUnique({ where: { [field]: profile.sub } as { googleSub: string } | { appleSub: string } });

  let userId: string;
  if (bySub) {
    // Apple віддає email лише в токені, і той може змінитись; за sub людину вже впізнано
    userId = bySub.id;
  } else {
    const email = profile.email.trim().toLowerCase();
    // Без підтвердженої пошти прив'язати до наявного акаунта не можна — це дало б перехоплення акаунта
    const byEmail = email && profile.emailVerified ? await prisma.user.findUnique({ where: { email } }) : null;
    const decision = applyGoogleProfile(null, byEmail ? toAccount(byEmail, byEmail[field]) : null, {
      sub: profile.sub,
      email: profile.email,
      emailVerified: profile.emailVerified,
    });
    if (decision.type === "reject") {
      // Apple без пошти — окремий випадок: реєструємо за sub без email
      if (!(provider === "apple" && !email)) return { type: "reject", reason: decision.reason === "sub-mismatch" ? "conflict" : "unverified" };
      return { type: "signup", signupToken: await signSignupTicket({ provider, sub: profile.sub, email: null, name: profile.name }), email: null, name: profile.name };
    }
    if (decision.type === "signup") {
      return {
        type: "signup",
        signupToken: await signSignupTicket({ provider, sub: profile.sub, email: email || null, name: profile.name }),
        email: email || null,
        name: profile.name,
      };
    }
    const data: Record<string, string> = {};
    if (decision.linkSub) data[field] = profile.sub;
    if (decision.emailUpdate) Object.assign(data, decision.emailUpdate);
    if (Object.keys(data).length) await prisma.user.update({ where: { id: decision.userId }, data });
    userId = decision.userId;
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(MOBILE_ROLES as readonly string[]).includes(user.role)) return { type: "reject", reason: "role" };
  return { type: "tokens", user, tokens: await issueTokens(user) };
}
