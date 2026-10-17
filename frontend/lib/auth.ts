/**
 * One place to know who is signed in.
 *
 * With Supabase keys, the session lives in cookies (the middleware refreshes
 * them), so a refresh keeps you signed in until you sign out.
 * Without keys — demo mode on your own machine — the sign-in is remembered in
 * localStorage under `baithak-demo-auth`, so a refresh no longer looks logged
 * out. Signing out clears it in both modes.
 */
import { useCallback, useEffect, useState } from "react";
import { demoMode, hasSupabase, supabaseBrowser } from "@/lib/supabase/client";

const DEMO_KEY = "baithak-demo-auth";
const EVENT = "baithak:auth-changed";

export type AuthUser = { email: string; name?: string };

function readDemo(): AuthUser | null {
  if (!demoMode) return null;
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function emit() {
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

/** Demo-mode sign-in: remember until the visitor signs out. */
export function rememberDemoUser(email: string, name?: string) {
  if (!demoMode) return;
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify({ email, name }));
  } catch {
    /* storage blocked: demo login simply won't survive a refresh */
  }
  emit();
}

export function forgetDemoUser() {
  try {
    localStorage.removeItem(DEMO_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/** Clears both the demo flag and the real Supabase session. */
export async function signOutAll() {
  forgetDemoUser();
  if (hasSupabase) {
    try {
      await supabaseBrowser().auth.signOut();
    } catch {
      /* a dead network must still feel like "signed out" on this device */
    }
  }
  emit();
}

function fromSession(session: { user: { email?: string; user_metadata?: Record<string, unknown> } } | null): AuthUser | null {
  if (!session) return null;
  const meta = session.user.user_metadata ?? {};
  const name = typeof meta.full_name === "string" ? meta.full_name : undefined;
  return { email: session.user.email ?? "", name };
}

/** The signed-in family historian, or null. `ready` is false until checked. */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hasSupabase) {
      const supabase = supabaseBrowser();
      let live = true;
      void supabase.auth.getSession().then(({ data }) => {
        if (live) {
          setUser(fromSession(data.session));
          setReady(true);
        }
      });
      const sub = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(fromSession(session));
      });
      const onChanged = () => setUser(readDemo());
      window.addEventListener(EVENT, onChanged);
      return () => {
        live = false;
        void sub.data.subscription.unsubscribe();
        window.removeEventListener(EVENT, onChanged);
      };
    }
    setUser(readDemo());
    setReady(true);
    const onChanged = () => setUser(readDemo());
    window.addEventListener(EVENT, onChanged);
    return () => window.removeEventListener(EVENT, onChanged);
  }, []);

  return { user, ready };
}

/** Sign out and run `after` once the state has settled. */
export function useSignOut() {
  return useCallback(async (after?: () => void) => {
    await signOutAll();
    after?.();
  }, []);
}
