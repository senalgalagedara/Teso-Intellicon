import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be configured in environment variables.');
  }

  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || 
    (process.env.NODE_ENV === 'production' ? '.teso.lk' : undefined);

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              ...(cookieDomain ? { domain: cookieDomain } : {}),
              path: '/',
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          });
        } catch (error) {
          // Ignored if called from Server Component during rendering
        }
      },
    },
    cookieOptions: {
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });
}
