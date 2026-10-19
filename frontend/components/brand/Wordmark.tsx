import Link from "next/link";
import { Logo } from "./Logo";

export function Wordmark({ tone = "night", href = "/" }: { tone?: "night" | "day"; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2" aria-label="Yaadon ki Baithak, home">
      <Logo size={34} className="shrink-0 drop-shadow-[0_2px_8px_rgba(242,169,59,0.35)]" />
      <span className={`font-display text-xl font-semibold ${tone === "night" ? "text-moon" : "text-ink"}`}>Baithak</span>
      <span className={`font-urdu text-base ${tone === "night" ? "text-lantern-soft" : "text-ajrak"}`} lang="ur" dir="rtl">
        بیٹھک
      </span>
    </Link>
  );
}
