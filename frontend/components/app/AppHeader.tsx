import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { AccountButton } from "@/components/nav/AccountButton";
import { SoundToggle } from "@/components/sound/SoundToggle";

/** Top bar inside the app: wordmark, optional way back, sound, and any extra actions. */
export function AppHeader({ back, children }: { back?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 pt-7">
      <div className="flex min-w-0 items-center gap-4">
        <Wordmark tone="night" href="/book" />
        {back && (
          <Link href={back.href} className="hidden items-center gap-1.5 text-sm font-bold text-moon/70 hover:text-moon sm:inline-flex">
            <ArrowLeft size={16} />
            {back.label}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2">
        <SoundToggle tone="night" />
        <AccountButton tone="night" />
        {children}
      </div>
    </header>
  );
}
