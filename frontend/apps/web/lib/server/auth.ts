import type { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { error } from "./http";

export type AuthResult =
  | { ok: true; userId: string | null }
  | { ok: false; response: NextResponse };

/**
 * The API counterpart of proxy.ts, with the same rules:
 * - Supabase configured: the caller must be signed in (the cookie is
 *   verified against Supabase, so a forged cookie fails).
 * - Not configured: allowed only on your own computer (local demo mode).
 * - Not configured in production: locked, same as a deployed site with no keys.
 */
export async function requireUser(): Promise<AuthResult> {
  const supabase = await supabaseServer();
  if (!supabase) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, response: error(503, "This site isn't set up with its keys yet.") };
    }
    return { ok: true, userId: null };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: error(401, "Please sign in to continue.") };
  return { ok: true, userId: user.id };
}
