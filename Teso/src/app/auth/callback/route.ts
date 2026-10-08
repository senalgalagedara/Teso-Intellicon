import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@teso/auth/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/plan';

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next.startsWith('http://') || next.startsWith('https://')) {
        return NextResponse.redirect(next);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to a fallback page on authentication failure
  return NextResponse.redirect(`${origin}/auth/sign-in?error=OAuthCallbackFailed`);
}
