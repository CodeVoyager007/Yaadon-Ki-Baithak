"use client";

import { useEffect, useRef } from "react";
import { useCinema } from "@/lib/use-cinema";

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * One letterbox for the whole home-page film, so every scene feels like the
 * same movie. The bars close in during the opening shot, stay through the
 * trailer, How it works and the story reel, then open again ("house lights
 * up") when the promise section arrives. The nav slides away while the film
 * plays. The bottom bar names the current scene, the top bar counts shots.
 *
 * Sections opt in with data attributes:
 *   data-film-open   the element whose scroll closes the bars (the hero track)
 *   data-film-end    the element that opens them again
 *   data-scene="…"   a scene name; data-shots="4" adds a shot counter
 *
 * Driven by one rAF scroll handler writing a CSS variable (--cine), so React
 * never re-renders while scrolling.
 */
export function CinemaFrame() {
  const on = useCinema();
  const scene = useRef<HTMLSpanElement>(null);
  const shot = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (!on) {
      root.style.setProperty("--cine", "0");
      return;
    }
    let frame = 0;
    let lastScene = "";
    let lastShot = "";

    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const open = document.querySelector<HTMLElement>("[data-film-open]");
      const end = document.querySelector<HTMLElement>("[data-film-end]");
      let cine = 0;
      if (open && end) {
        const o = open.getBoundingClientRect();
        const range = Math.max(1, o.height - vh);
        const pIn = clamp((-o.top / range - 0.22) / 0.33);
        const e = end.getBoundingClientRect();
        const pOut = clamp((vh - e.top) / (vh * 0.6));
        cine = Math.min(pIn, 1 - pOut);
      }
      root.style.setProperty("--cine", cine.toFixed(3));

      // which scene fills the middle of the screen
      let name = "";
      let count = "";
      for (const el of document.querySelectorAll<HTMLElement>("[data-scene]")) {
        const r = el.getBoundingClientRect();
        if (r.top <= vh / 2 && r.bottom >= vh / 2) {
          name = el.dataset.scene ?? "";
          const n = Number(el.dataset.shots ?? 0);
          if (n > 0) {
            const p = clamp(-r.top / Math.max(1, r.height - vh));
            const i = Math.min(n - 1, Math.floor(p * n * 0.999));
            count = `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
          }
          break;
        }
      }
      if (name !== lastScene && scene.current) scene.current.textContent = lastScene = name;
      if (count !== lastShot && shot.current) shot.current.textContent = lastShot = count;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.style.setProperty("--cine", "0");
    };
  }, [on]);

  if (!on) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40">
      <div className="cine-bar cine-bar-top">
        <span ref={shot} className="cine-shot" />
      </div>
      <div className="cine-bar cine-bar-bottom">
        <span ref={scene} className="cine-scene" />
        <span className="cine-hint">Keep scrolling</span>
      </div>
    </div>
  );
}
