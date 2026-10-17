import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The service-role client. It bypasses row level security, so the rules are
 * strict: server-side only, imported only by backend route handlers, never logged,
 * and used in exactly two places — the illustrate image upload and the
 * public share read. Everything else signs in as the real user.
 */
let cached: SupabaseClient | null | undefined;

export function supabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cached =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return cached;
}
