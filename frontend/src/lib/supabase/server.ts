import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project-id.supabase.co";
// Prefer service role key for administrative/server-side routes, fallback to anon key
const supabaseKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  "your-supabase-key";

/**
 * Server-side Supabase client instance.
 * For use in Next.js Route Handlers and Server Components.
 */
export const getSupabaseServer = () => {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const isSupabaseServerConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    !supabaseUrl.includes("your-project-id") &&
    Boolean(supabaseKey) &&
    !supabaseKey.includes("your-supabase-key")
  );
};
