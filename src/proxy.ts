/**
 * Proxy (раніше "middleware") — швидка перевірка ще до рендеру сторінки:
 * немає перепустки (cookie сесії) — на вхід; роль не підходить — у свій кабінет.
 * Це "оптимістична" перевірка; справжня — у DAL (src/lib/dal.ts) на кожній сторінці й дії.
 */
import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { canAccess, homePath } from "@/lib/roles";

const PROTECTED = ["/cabinet", "/learn", "/checkout", "/teacher", "/admin"];

async function roleFromCookie(token: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!PROTECTED.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = request.cookies.get("itc_session")?.value;
  const role = token ? await roleFromCookie(token) : null;
  if (!role) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  // Дитина не потрапляє в кабінет батьків і навпаки
  if (!canAccess(role, pathname)) return NextResponse.redirect(new URL(homePath(role), request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/cabinet/:path*", "/learn/:path*", "/checkout/:path*", "/teacher/:path*", "/admin/:path*"],
};
