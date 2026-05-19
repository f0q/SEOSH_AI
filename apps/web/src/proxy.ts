import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const path = request.nextUrl.pathname;

  // Unauthenticated users hitting / get the public landing, not the login form.
  if (!token) {
    if (path === "/") {
      return NextResponse.redirect(new URL("/landing", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated users have no business on the landing page.
  if (token && path === "/landing") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Public: landing, auth flows, share/invite, payment webhook entry point.
    '/((?!api|_next/static|_next/image|favicon.ico|landing|legal|login|register|forgot-password|reset-password|invite|content-plan/shared).*)',
  ],
};
