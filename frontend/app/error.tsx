"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Birdy } from "@/components/mascots/Birdy";

/** Shown if a page crashes. Recordings already saved stay safe on the device. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[100svh] place-items-center bg-raat px-5 text-center text-moon">
      <div className="flex flex-col items-center">
        <Birdy mood="idle" size={120} />
        <h1 className="font-display mt-4 text-3xl sm:text-4xl">Something went wrong on this page.</h1>
        <p className="mt-3 max-w-sm text-moon/70">Your saved stories and recordings are safe. Try again, or go back to your family book.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn-lantern pixel-corners inline-flex h-12 items-center px-6 font-extrabold">
            Try again
          </button>
          <Link href="/book" className="glass-night inline-flex h-12 items-center rounded-2xl px-5 font-bold hover:bg-white/15">
            Family book
          </Link>
        </div>
      </div>
    </div>
  );
}
