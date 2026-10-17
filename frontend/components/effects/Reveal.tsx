"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Lifts its children into view once, the first time they scroll into frame.
 * Uses the `.reveal` / `.reveal.is-in` pair from globals.css, so a visitor
 * with prefers-reduced-motion simply sees the content (the CSS skips it).
 * The hiding class is added by script, and only below the fold, so without
 * JavaScript (or for anything already on screen) the content is just there.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.getBoundingClientRect().top < window.innerHeight) return;
    el.classList.add("reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-in");
            io.disconnect(); // one lift per element; scrolling back never replays it
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
