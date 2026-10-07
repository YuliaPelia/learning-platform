/**
 * Proxy (раніше "middleware") — швидка перевірка ще до рендеру сторінки:
 * немає перепустки (cookie сесії) — одразу на вхід.
 * Це "оптимістична" перевірка; справжня — у DAL (src/lib/dal.ts) на кожній сторінці.
 */
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/cabinet", "/learn", "/checkout", "/teacher", "/admin"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PROTECTED.some((p) => pathname.startsWith(p)) && !request.cookies.get("itc_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/cabinet/:path*", "/learn/:path*", "/checkout/:path*", "/teacher/:path*", "/admin/:path*"],
};
