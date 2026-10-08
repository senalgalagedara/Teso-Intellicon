import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@teso/auth/middleware';

// Basic in-memory rate limiting for Edge
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 200; // General limit
const AUTH_MAX_REQUESTS = 50; // Stricter limit for auth routes

const PROTECTED_ROUTES = ['/dashboard', '/exams', '/profile', '/adaptive-learning'];

export async function middleware(request: NextRequest) {
  // 1. Rate Limiting Check
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const pathname = request.nextUrl.pathname;
  
  if (pathname.startsWith('/api/auth/session') || pathname.startsWith('/api/auth/providers')) {
    return NextResponse.next();
  }

  const isAuthRoute = pathname.startsWith('/api/auth');

  if (Math.random() < 0.05) {
    const now = Date.now();
    for (const [key, val] of rateLimitMap.entries()) {
      if (now - val.lastReset > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(key);
      }
    }
  }

  const now = Date.now();
  let rateLimitInfo = rateLimitMap.get(ip);

  if (!rateLimitInfo || now - rateLimitInfo.lastReset > RATE_LIMIT_WINDOW_MS) {
    rateLimitInfo = { count: 1, lastReset: now };
  } else {
    rateLimitInfo.count++;
  }

  rateLimitMap.set(ip, rateLimitInfo);

  const limit = isAuthRoute ? AUTH_MAX_REQUESTS : MAX_REQUESTS_PER_WINDOW;

  if (rateLimitInfo.count > limit) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests, please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Supabase Auth Integration & Subdomain Session Syncing
  const { supabaseResponse, user } = await updateSession(request as any);

  // 3. Security Headers
  supabaseResponse.headers.set('X-Frame-Options', 'DENY');
  supabaseResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block');
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  supabaseResponse.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  supabaseResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  supabaseResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected && !user) {
    const loginUrl = new URL('/auth/sign-in', request.url);
    loginUrl.searchParams.set('returnUrl', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
