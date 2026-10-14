"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Birdy, type BirdyMood } from "@/components/mascots/Birdy";
import { PixelLantern } from "@/components/effects/PixelLantern";
import { useSound } from "@/components/sound/SoundProvider";
import { claimBook, loadBook } from "@/lib/book-store";
import { safePath } from "@/lib/safe-path";
import { demoMode, hasSupabase, supabaseBrowser } from "@/lib/supabase/client";

type Mode = "signup" | "signin";

const NOT_SET_UP = "Sign-in isn't set up on this site yet. Please try again later.";

/**
 * Plain, safe messages. We never repeat raw server errors, so the page
 * can't be used to check whether an email already has an account.
 */
function friendlyError(err: unknown, signup: boolean) {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  if (msg.includes("rate") || msg.includes("too many")) return "Too many tries. Wait a minute and try again.";
  if (msg.includes("password") && msg.includes("weak")) return "Pick a stronger password: longer, and not a common one.";
  if (msg.includes("network") || msg.includes("fetch")) return "Couldn't reach the server. Check your internet and try again.";
  return signup ? "We couldn't create that account. Check your details and try again." : "Email or password is incorrect.";
}

const START_ERRORS: Record<string, string> = {
  callback: "That sign-in link didn't work. Try again, or use email and password.",
  setup: NOT_SET_UP,
};

export function SignupForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { chirp } = useSound();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signin" ? "signin" : "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    START_ERRORS[params.get("error") ?? ""] ?? null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [mood, setMood] = useState<BirdyMood>("idle");

  const signup = mode === "signup";
  const requested = params.get("next");
  // Where to go after signing in: the page they asked for, else their book.
  const nextPath = () => (requested ? safePath(requested) : loadBook() ? "/book" : "/onboarding");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (!hasSupabase) {
        if (!demoMode) throw new Error(NOT_SET_UP);
        await new Promise((r) => setTimeout(r, 900));
        setMood("happy");
        chirp();
        router.push(nextPath());
        return;
      }
      const supabase = supabaseBrowser();
      if (signup) {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim().slice(0, 80) },
            emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}`,
          },
        });
        if (err) throw err;
        if (!data.session) {
          // Same message whether or not the email was already registered.
          setNotice(`We sent a confirmation link to ${email}. Open it on this device to continue.`);
          setMood("happy");
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) claimBook(user.id);
      setMood("happy");
      chirp();
      router.push(nextPath());
    } catch (err) {
      setMood("idle");
      setError(err instanceof Error && err.message === NOT_SET_UP ? NOT_SET_UP : friendlyError(err, signup));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    if (!hasSupabase) {
      if (!demoMode) return setError(NOT_SET_UP);
      chirp();
      router.push(nextPath());
      return;
    }
    const { error: err } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}` },
    });
    if (err) setError(friendlyError(err, signup));
  }

  return (
    <div className="relative w-full max-w-[440px]">
      <div className="absolute -top-[86px] left-1/2 z-10 -translate-x-1/2">
        <Birdy mood={mood} size={110} />
      </div>

      <div className="glass-night rounded-[32px] px-7 pb-8 pt-10 text-moon sm:px-9">
        <p className="font-urdu text-center text-xl text-lantern-soft" lang="ur" dir="rtl">
          خوش آمدید
        </p>
        <h1 className="font-display text-center text-3xl font-semibold leading-tight sm:text-4xl">
          {signup ? "Start your family book" : "Welcome back"}
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm text-moon/70">
          {signup ? "Only the family historian needs an account. Your elders just talk." : "Sign in to keep adding stories."}
        </p>

        <button
          type="button"
          onClick={google}
          className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-moon font-bold text-ink transition hover:bg-white"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-moon/50" aria-hidden>
          <span className="h-px flex-1 bg-moon/20" />
          or with email
          <span className="h-px flex-1 bg-moon/20" />
        </div>

        {notice ? (
          <p className="rounded-2xl bg-leaf/25 p-4 text-sm leading-relaxed text-moon" role="status">
            {notice}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {signup && (
              <Field label="Your name" value={name} onChange={setName} autoComplete="name" onFocus={() => setMood("listening")} onBlur={() => setMood("idle")} />
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" onFocus={() => setMood("listening")} onBlur={() => setMood("idle")} />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={signup ? "new-password" : "current-password"}
              hint={signup ? "At least 8 characters" : undefined}
              onFocus={() => setMood("listening")}
              onBlur={() => setMood("idle")}
            />

            {error && (
              <p className="rounded-xl bg-terracotta/25 px-4 py-3 text-sm text-moon" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !email || !password}
              className="btn-lantern pixel-corners flex h-14 w-full items-center justify-center gap-3 text-base font-extrabold disabled:opacity-60"
            >
              {busy ? (
                <>
                  <PixelLantern size={26} />
                  {signup ? "Setting up your book" : "Signing in"}
                </>
              ) : signup ? (
                "Create account"
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-moon/70">
          {signup ? "Already have a family book? " : "New here? "}
          <button
            type="button"
            onClick={() => {
              setMode(signup ? "signin" : "signup");
              setError(null);
              setNotice(null);
            }}
            className="font-bold text-lantern-soft underline-offset-4 hover:underline"
          >
            {signup ? "Sign in" : "Create an account"}
          </button>
        </p>

        {demoMode && (
          <p className="mt-5 rounded-xl border border-moon/15 px-4 py-3 text-center text-xs leading-relaxed text-moon/60">
            Demo mode: accounts aren&apos;t connected yet, so any details take you straight in.
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-moon/70">
        Here to tell a story yourself?{" "}
        <Link href="/record" className="font-bold text-lantern-soft hover:underline">
          Record without an account
        </Link>
      </p>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

function Field({ label, value, onChange, type = "text", autoComplete, hint, onFocus, onBlur }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-moon/85">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        onFocus={onFocus}
        onBlur={onBlur}
        required
        className="mt-1.5 h-12 w-full rounded-2xl border border-moon/20 bg-[#0c0d2e]/50 px-4 text-moon placeholder:text-moon/40 focus:border-lantern focus:outline-none"
      />
      {hint && <span className="mt-1 block text-xs text-moon/50">{hint}</span>}
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
