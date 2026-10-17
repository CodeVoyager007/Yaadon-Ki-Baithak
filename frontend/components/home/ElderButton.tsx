import Link from "next/link";
import { Diya } from "@/components/mascots/Diya";

/**
 * The big, simple door for elders who land here themselves:
 * one tap goes straight to recording.
 */
export function ElderButton() {
  return (
    <Link
      href="/record"
      className="glass-night group inline-flex min-h-[76px] items-center gap-3 rounded-[26px] py-2 pl-3 pr-6 text-moon transition hover:border-lantern/60"
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-[#12133a]/60">
        <Diya size={48} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-urdu text-2xl text-lantern-soft" lang="ur" dir="rtl">
          کہانی سنائیں
        </span>
        <span className="text-sm font-bold text-moon/85">Record a story</span>
      </span>
    </Link>
  );
}
