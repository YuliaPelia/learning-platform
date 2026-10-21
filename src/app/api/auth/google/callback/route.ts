import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/db";
import {
  GOOGLE_SIGNUP_COOKIE,
  GOOGLE_STATE_COOKIE,
  applyGoogleProfile,
  safeNext,
  signGoogleSignup,
  type GoogleAccount,
} from "@/lib/google-auth";
import { appBase, exchangeCode, verifyIdToken } from "@/lib/google-oauth";
import { homePath } from "@/lib/roles";
import { createSession } from "@/lib/session";

const TEN_MINUTES = 60 * 10;

function loginError() {
  return NextResponse.redirect(`${appBase()}/login?error=google`);
}

function account(row: {
  id: string;
  role: GoogleAccount["role"];
  email: string | null;
  login: string;
  googleSub: string | null;
}): GoogleAccount {
  return row;
}

/** Повернення з Google: або сесія, або квиток на сторінку вибору ролі. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const raw = jar.get(GOOGLE_STATE_COOKIE)?.value;
  jar.delete(GOOGLE_STATE_COOKIE);

  let saved: { state?: string; next?: string | null } = {};
  try {
    saved = raw ? (JSON.parse(raw) as { state?: string; next?: string | null }) : {};
  } catch {
    saved = {};
  }
  const next = safeNext(saved.next);
  if (url.searchParams.get("error") || !code || !state || saved.state !== state) return loginError();

  let profile;
  try {
    profile = await verifyIdToken(await exchangeCode(code));
  } catch {
    return loginError();
  }

  const userBySub = await prisma.user.findUnique({ where: { googleSub: profile.sub } });
  const userByEmail = profile.email ? await prisma.user.findUnique({ where: { email: profile.email } }) : null;
  const decision = applyGoogleProfile(
    userBySub ? account(userBySub) : null,
    userByEmail ? account(userByEmail) : null,
    profile,
  );

  if (decision.type === "reject") return loginError();

  if (decision.type === "signup") {
    const token = await signGoogleSignup({ email: profile.email, name: profile.name, sub: profile.sub, next });
    jar.set(GOOGLE_SIGNUP_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TEN_MINUTES,
    });
    return NextResponse.redirect(`${appBase()}/login/google`);
  }

  const data: { googleSub?: string; email?: string; login?: string } = {};
  if (decision.linkSub) data.googleSub = profile.sub;
  if (decision.emailUpdate) Object.assign(data, decision.emailUpdate);
  if (Object.keys(data).length) await prisma.user.update({ where: { id: decision.userId }, data });

  await createSession(decision.userId, decision.role);
  jar.delete(GOOGLE_SIGNUP_COOKIE);
  return NextResponse.redirect(`${appBase()}${next ?? homePath(decision.role)}`);
}
