"use client";

import { useEffect, useState } from "react";

/**
 * A sky lantern that rises from the lower corner of the screen, drifting
 * sideways while it glows — the "start" of the story. Bright by design:
 * a warm radial halo plus a pulsing drop-shadow from `lantern-glow`.
 * It cleans itself up when the flight ends.
 */
export function SkyLantern({ delay = 0, duration = 12, className }: { delay?: number; duration?: number; className?: string }) {
  const [flown, setFlown] = useState(false);

  // Unmount through React when the flight ends; removing the node by hand crashes the parent's next render.
  useEffect(() => {
    const timeout = window.setTimeout(() => setFlown(true), (delay + duration) * 1000 + 600);
    return () => window.clearTimeout(timeout);
  }, [delay, duration]);

  if (flown) return null;

  return (
    <div
      aria-hidden
      className={`anim-lantern-fly pointer-events-none absolute h-16 w-12 ${className ?? ""}`}
      style={{ animationDuration: `${duration}s, 2.4s`, animationDelay: `${delay}s, ${delay}s` }}
    >
      {/* warm halo */}
      <span className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,214,102,0.55),rgba(242,169,59,0.18)_55%,transparent_72%)] blur-md" />
      {/* paper body */}
      <span className="relative block h-16 w-12 rounded-[50%_50%_44%_44%] bg-[linear-gradient(180deg,#ffe9b0_0%,#ffd58a_38%,#f2a93b_78%,#e68a00_100%)] shadow-[0_0_26px_rgba(255,214,102,0.95)]">
        {/* flame window */}
        <span className="absolute bottom-1.5 left-1/2 h-4 w-3 -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_50%_80%,#fff6d8,#ffd58a_55%,#f2a93b_85%)] anim-flame" />
        {/* rim */}
        <span className="absolute bottom-0 left-0.5 right-0.5 h-2 rounded-b-md bg-[#c8553d]/85" />
      </span>
    </div>
  );
}
