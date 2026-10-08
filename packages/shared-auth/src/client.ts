import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be configured in environment variables.');
  }

  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || 
    (process.env.NODE_ENV === 'production' ? '.teso.lk' : undefined);

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });
};

export const createBrowserClientAlias = createClient;
export { createClient as createBrowserClient };
