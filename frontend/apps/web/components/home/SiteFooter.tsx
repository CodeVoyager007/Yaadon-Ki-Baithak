import { Wordmark } from "@/components/brand/Wordmark";
import { ReplayIntro } from "./ReplayIntro";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-moon/10 px-5 py-14">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lantern/50 to-transparent" />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <Wordmark />
        <p className="text-sm text-moon/60">
          Made by Ayesha, Faria and Humema for the NYLP AI Hackathon 2026.
        </p>
        <ReplayIntro />
        <p className="font-urdu text-lg text-lantern-soft" lang="ur" dir="rtl">
          یادوں کی بیٹھک
        </p>
      </div>
    </footer>
  );
}
