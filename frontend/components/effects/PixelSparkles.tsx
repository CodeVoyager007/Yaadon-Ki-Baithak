"use client";

import { useEffect } from "react";

const COLORS = ["#ffd58a", "#f2a93b", "#fff4dc", "#f0654f"];

/**
 * Leaves a short trail of pixel sparkles while the pointer moves over
 * buttons and links. Off for touch screens and reduced-motion users.
 */
export function PixelSparkles() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (reduce || !fine) return;

    let last = 0;
    const onMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("a, button, [data-sparkle]")) return;
      const now = performance.now();
      if (now - last < 45) return;
      last = now;

      const px = document.createElement("span");
      const size = Math.random() > 0.6 ? 6 : 4;
      Object.assign(px.style, {
        position: "fixed",
        left: `${e.clientX + (Math.random() * 16 - 8)}px`,
        top: `${e.clientY + (Math.random() * 16 - 8)}px`,
        width: `${size}px`,
        height: `${size}px`,
        background: COLORS[Math.floor(Math.random() * COLORS.length)],
        pointerEvents: "none",
        zIndex: "100",
        boxShadow: "0 0 6px rgba(255, 213, 138, 0.9)",
      });
      document.body.appendChild(px);
      px.animate(
        [
          { transform: "translateY(0)", opacity: 1 },
          { transform: `translateY(${-14 - Math.random() * 14}px)`, opacity: 0 },
        ],
        { duration: 650, easing: "steps(5)" },
      ).onfinish = () => px.remove();
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return null;
}
