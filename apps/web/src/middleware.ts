import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Simple check for the better-auth session cookie
  const token = request.cookies.get("better-auth.session_token")?.value || 
                request.cookies.get("__Secure-better-auth.session_token")?.value;
                
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect all routes except auth pages, api routes, and static assets
    '/((?!api|_next/static|_next/image|favicon.ico|login|register).*)',
  ],
};
