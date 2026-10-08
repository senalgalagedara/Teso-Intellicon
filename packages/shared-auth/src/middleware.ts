import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be configured in environment variables.');
  }

  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || 
    (process.env.NODE_ENV === 'production' ? '.teso.lk' : undefined);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.cookies.set(name, value, {
            ...options,
            ...(cookieDomain ? { domain: cookieDomain } : {}),
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          });
        });
      },
    },
    cookieOptions: {
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });

  // IMPORTANT: getUser() checks the database/JWT validity. Do not use getSession() for middleware protection.
  const { data: { user } } = await supabase.auth.getUser();

  return { supabaseResponse, user, supabase };
}
