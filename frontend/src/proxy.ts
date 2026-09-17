import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge proxy (Next.js 16's replacement for `middleware.ts`):
 * cheap route gate + security headers.
 *
 * ⚠️ This is UX-level only. It checks that *a* session cookie exists; it does
 * NOT verify the JWT. Real authorisation happens in your Express backend on
 * every request. Never rely on middleware for access control.
 */

const PROTECTED = ['/dashboard', '/requests', '/profile', '/security'];
const ADMIN_ONLY = ['/admin'];
const AUTH_PAGES = ['/login', '/register', '/forgot-password'];

const SESSION_COOKIE = process.env.NEXT_PUBLIC_SESSION_COOKIE ?? 'access_token';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession =
    req.cookies.has(SESSION_COOKIE) || req.cookies.has('refresh_token');

  const needsAuth = [...PROTECTED, ...ADMIN_ONLY].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (needsAuth && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Already signed in → keep users off the login page.
  if (hasSession && AUTH_PAGES.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();

  // Defence-in-depth headers (mirror these in Helmet on the backend too).
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
};
