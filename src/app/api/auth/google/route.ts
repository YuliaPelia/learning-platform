import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GOOGLE_STATE_COOKIE, googleAuthUrl, safeNext } from "@/lib/google-auth";
import { appBase, googleRedirectUri } from "@/lib/google-oauth";

const TEN_MINUTES = 60 * 10;

/** Старт входу: запам'ятовуємо state і відправляємо людину на Google. */
export async function GET(request: Request) {
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set(GOOGLE_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TEN_MINUTES,
  });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(`${appBase()}/login?error=google`);
  return NextResponse.redirect(googleAuthUrl({ state, redirectUri: googleRedirectUri(), clientId }));
}
