import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False until the team adds Supabase keys to .env.local. */
export const hasSupabase = Boolean(url && anonKey);

/**
 * Demo mode lets you click through without accounts, but only on your own
 * computer. A deployed site without keys never lets anyone in.
 */
export const demoMode = !hasSupabase && process.env.NODE_ENV !== "production";

export function supabaseBrowser() {
  if (!url || !anonKey) throw new Error("Supabase keys are missing. Add them to apps/web/.env.local.");
  return createBrowserClient(url, anonKey);
}
