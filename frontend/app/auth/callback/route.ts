import { NextResponse } from "next/server";
import { safePath } from "@/lib/safe-path";
import { supabaseServer } from "@/lib/supabase/server";

/** Google sign-in and email confirmation links land here. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safePath(searchParams.get("next"));

  const supabase = await supabaseServer();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/signup?error=callback`);
}
