"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, UserRound } from "lucide-react";
import { useAuth, useSignOut } from "@/lib/auth";

/**
 * The navbar's account control: "Sign in" when nobody is signed in, and an
 * account icon (with the name, on wider screens) plus a way out once they are.
 * The session itself lives in cookies (Supabase) or localStorage (demo mode),
 * so a refresh keeps this state until the visitor signs out.
 */
export function AccountButton({ tone = "night" }: { tone?: "night" | "day" }) {
  const { user, ready } = useAuth();
  const signOut = useSignOut();
  const router = useRouter();
  const night = tone === "night";
  const base = `${night ? "glass-night text-moon" : "glass-day text-ink"} inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold`;

  if (!ready) {
    // One frame of nothing is better than flashing the wrong state.
    return <span className={`${base} opacity-0`} aria-hidden />;
  }

  if (!user) {
    return (
      <Link href="/signup?mode=signin" className={`${base} hover:bg-white/15`} aria-label="Sign in">
        <LogIn size={16} aria-hidden />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const label = user.name || user.email || "Account";
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/book"
        className={`${base} hover:bg-white/15`}
        aria-label={`Signed in as ${label}. Open your family book.`}
        title={label}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lantern font-display text-xs font-bold text-ink">
          {label.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[9rem] truncate sm:inline">{label}</span>
      </Link>
      <button
        type="button"
        onClick={() => void signOut(() => router.push("/"))}
        aria-label="Sign out"
        title="Sign out"
        className={`${base} px-3 hover:bg-white/15 hover:text-terracotta`}
      >
        <LogIn size={16} className="rotate-180" aria-hidden />
        <span className="hidden md:inline">Sign out</span>
      </button>
    </div>
  );
}
