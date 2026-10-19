import Link from "next/link";
import { NightSky } from "@/components/scene/NightSky";
import { SiteFooter } from "@/components/home/SiteFooter";

/** A plain, readable page for the privacy policy and terms: night sky behind, text on a soft panel. */
export function LegalPage({ title, ur, updated, children }: { title: string; ur: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-[100svh] overflow-hidden text-moon">
      <NightSky full={false} skyline="dim" />
      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-20 pt-14">
        <Link href="/" className="text-sm font-bold text-lantern-soft hover:text-lantern">
          ← Yaadon ki Baithak
        </Link>
        <p className="font-urdu mt-8 text-2xl leading-[2] text-lantern-soft" dir="rtl" lang="ur">
          {ur}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-moon/60">Last updated {updated}</p>
        <div className="legal glass-night mt-8 rounded-[28px] p-6 leading-relaxed text-moon/85 sm:p-9">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
