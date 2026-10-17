"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mic, BookOpen, User } from "lucide-react";

const BOOK_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/record", label: "Record", icon: Mic },
  { href: "/book", label: "Chapters", icon: BookOpen },
  { href: "/book/elders/new", label: "Add elder", icon: User },
];

/** Persistent bottom bar for all book‑section pages. */
export function BookNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0c0d2e]/90 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-around px-4 py-2">
        {BOOK_LINKS.map((l) => {
          const Icon = l.icon;
          const active =
            l.href === "/book"
              ? pathname === "/book" || pathname.startsWith("/book/chapter") || pathname.startsWith("/book/writing")
              : l.href === "/"
                ? pathname === "/"
                : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold transition ${
                active ? "text-lantern-soft" : "text-moon/60 hover:text-moon"
              }`}
            >
              <Icon size={20} aria-hidden />
              <span>{l.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
