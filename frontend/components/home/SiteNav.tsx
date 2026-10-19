import { Wordmark } from "@/components/brand/Wordmark";
import { AccountButton } from "@/components/nav/AccountButton";
import { SoundToggle } from "@/components/sound/SoundToggle";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#stories", label: "Stories" },
  { href: "#promise", label: "Our promise" },
];

export function SiteNav() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <nav className="glass-nav mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full py-2 pl-4 pr-2">
        <Wordmark />
        <ul className="hidden items-center gap-7 text-sm font-semibold text-moon/80 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition-colors hover:text-lantern-soft">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <AccountButton />
        </div>
      </nav>
    </header>
  );
}
