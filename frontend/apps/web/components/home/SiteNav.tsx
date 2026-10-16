import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { SoundToggle } from "@/components/sound/SoundToggle";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#stories", label: "Stories" },
  { href: "#promise", label: "Our promise" },
];

export function SiteNav() {
  return (
    <header className="site-nav fixed inset-x-0 top-4 z-50 px-4 transition-[transform,opacity] duration-300 ease-out">
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
          <Link
            href="/signup?mode=signin"
            className="hidden h-10 items-center rounded-full px-4 text-sm font-semibold text-moon hover:text-lantern-soft sm:inline-flex"
          >
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  );
}
