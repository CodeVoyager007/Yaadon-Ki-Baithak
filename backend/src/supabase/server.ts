import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A Supabase client that acts as the signed-in caller, built from the
 * request's own cookies. Row level security decides what it can touch.
 * Read-only on cookies: frontend/proxy.ts runs before every API request and
 * already refreshes the session, so handlers never need to write one back.
 * Null when Supabase isn't configured (local demo mode).
 */
export function supabaseForRequest(request: Request): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const cookies = parseCookieHeader(request.headers.get("cookie") ?? "");
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookies.map(({ name, value }) => ({ name, value: value ?? "" })),
      setAll: () => {
        /* the proxy owns cookie refresh */
      },
    },
  });
}
