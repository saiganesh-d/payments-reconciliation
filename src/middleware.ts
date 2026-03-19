import { NextRequest, NextResponse } from "next/server";

// Middleware runs on every matched route to check for session cookie presence.
// The actual session validation (DB check, inactivity timeout) happens in getSession().
// This middleware just provides fast redirects for unauthenticated users.
export function middleware(request: NextRequest) {
  const token = request.cookies.get("pc_session_token") || request.cookies.get("pc_session");
  const { pathname } = request.nextUrl;

  // Public routes that don't need auth
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // If no session token, redirect to login
  if (!token) {
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
