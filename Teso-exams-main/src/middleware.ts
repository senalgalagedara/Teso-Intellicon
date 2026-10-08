import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@teso/auth/middleware';

const PROTECTED_ROUTES = ['/host'];

export async function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const pathname = request.nextUrl.pathname;

  // Skip rate limiting for static assets, page document requests, and client-side page prefetches.
  const isPrefetch = request.headers.get('x-middleware-prefetch') === '1' || 
                     request.headers.get('purpose') === 'prefetch';
  const isStaticAsset = !!pathname.match(/\.(png|jpe?g|gif|svg|ico|css|js|json|woff2?|map)$/i);
  const isApi = pathname.startsWith('/api');
  const isMutation = request.method !== 'GET' && request.method !== 'HEAD';
  
  const shouldRateLimit = (isApi || isMutation) && !isPrefetch && !isStaticAsset && !pathname.startsWith('/api/rate-limit');

  if (shouldRateLimit) {
    try {
      const rateLimitUrl = new URL(`/api/rate-limit?ip=${encodeURIComponent(ip)}`, request.url);
      const res = await fetch(rateLimitUrl);
      if (res.status === 429) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests, please try again later.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (err) {
      console.error('Rate limiter fetch error:', err);
    }
  }

  // Supabase session verification across subdomains
  const { supabaseResponse, user } = await updateSession(request);

  // Security Headers
  supabaseResponse.headers.set('X-Frame-Options', 'DENY');
  supabaseResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block');
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected && !user) {
    // Redirect to THIS app's sign-in page (not the main study platform).
    // Pass returnUrl so the user lands back on their original destination after login.
    const redirectUrl = new URL('/auth/sign-in', request.url);
    redirectUrl.searchParams.set('returnUrl', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  // Role-based protection under /host
  if (user && pathname.startsWith('/host')) {
    const isStudent = (user.user_metadata?.role as string) !== 'host' && (user.user_metadata?.role as string) !== 'admin';
    const isAccessingCandidates = pathname.startsWith('/host/candidates');

    if (isStudent && !isAccessingCandidates) {
      const redirectUrl = new URL('/host/candidates', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    if (!isStudent && isAccessingCandidates) {
      const redirectUrl = new URL('/host', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
