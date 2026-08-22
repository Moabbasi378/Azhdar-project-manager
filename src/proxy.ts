import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = /authjs\.session-token|__Secure-authjs\.session-token/;

/**
 * Lightweight edge check: bounces obviously-unauthenticated requests away
 * from app pages. The authoritative check happens server-side in layouts
 * and every server action (`requireUser` / permission checks).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = SESSION_COOKIE.test(request.headers.get("cookie") ?? "");

  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!hasSession && !isAuthPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
        "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2?)$).*)",
  ],
};
