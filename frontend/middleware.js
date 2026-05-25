import { NextResponse } from 'next/server';

// This middleware runs on the EDGE before any page loads.
// It provides a hard server-side block on all /xpanel/* routes.
// Even if client-side JS is bypassed, this stops the request.

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only applies to /xpanel routes
  if (!pathname.startsWith('/xpanel')) return NextResponse.next();

  // Allow login page through (unauthenticated)
  if (pathname === '/xpanel/login') return NextResponse.next();

  // Check for the super admin session token in cookies
  // The frontend stores it in localStorage (Zustand persist),
  // but we also set a httpOnly cookie on login for this middleware check.
  const superToken = request.cookies.get('sq-sx-token')?.value;

  // No token cookie → redirect to login
  if (!superToken) {
    const loginUrl = new URL('/xpanel/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists → let the page load (full JWT verify happens in SuperGuard on the client
  // and in every API call via superAuth middleware on the backend).
  // This middleware is a fast first-line defense; the real auth is still backend-verified.
  return NextResponse.next();
}

export const config = {
  matcher: ['/xpanel/:path*'],
};
