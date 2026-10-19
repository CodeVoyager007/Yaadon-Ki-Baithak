import type { CSSProperties } from "react";

/**
 * A paper sky lantern rising through the night: a domed paper body narrowing to an open mouth,
 * bamboo ribs, the flame glowing through the paper from inside, and a warm halo. It drifts up
 * and sideways forever. A negative `delay` starts it part-way through its flight, so the sky is
 * already full when the page opens. `size` scales it; `far` makes it a dimmer, softer lantern in
 * the distance. Pure CSS animation, so it costs nothing on the main thread.
 */
export function SkyLantern({
  delay = 0,
  duration = 14,
  size = 1,
  drift = -18,
  far = false,
  className,
}: {
  delay?: number;
  duration?: number;
  size?: number;
  /** Sideways travel over the whole flight, in vw (negative drifts left). */
  drift?: number;
  far?: boolean;
  className?: string;
}) {
  const style = {
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    "--lantern-drift": `${drift}vw`,
    width: `${3 * size}rem`,
    height: `${4.2 * size}rem`,
  } as CSSProperties;

  return (
    <div aria-hidden className={`anim-lantern-fly pointer-events-none absolute ${far ? "opacity-60 blur-[0.6px]" : ""} ${className ?? ""}`} style={style}>
      {/* warm halo, gently breathing */}
      <span className="anim-lantern-halo absolute left-1/2 top-[62%] h-[230%] w-[230%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,214,102,0.45),rgba(242,169,59,0.14)_55%,transparent)]" />
      <svg viewBox="0 0 40 56" className="anim-lantern-sway relative h-full w-full overflow-visible" role="presentation">
        <defs>
          <linearGradient id="lantern-paper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe9b4" />
            <stop offset="0.45" stopColor="#ffcf73" />
            <stop offset="0.85" stopColor="#f5a23a" />
            <stop offset="1" stopColor="#e9862a" />
          </linearGradient>
          {/* the flame lighting the paper from inside, brightest near the mouth */}
          <radialGradient id="lantern-inner" cx="0.5" cy="0.86" r="0.62">
            <stop offset="0" stopColor="#fffaf0" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#fff0c2" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff0c2" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lantern-flame" cx="0.5" cy="0.7" r="0.6">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.45" stopColor="#ffe08a" />
            <stop offset="1" stopColor="#ff9d2e" />
          </radialGradient>
        </defs>
        {/* paper body: rounded dome, tapering to the open bottom */}
        <path d="M5 9 C5 2.5 35 2.5 35 9 L30.5 47 C27 49.6 13 49.6 9.5 47 Z" fill="url(#lantern-paper)" />
        <path d="M5 9 C5 2.5 35 2.5 35 9 L30.5 47 C27 49.6 13 49.6 9.5 47 Z" fill="url(#lantern-inner)" />
        {/* bamboo ribs */}
        <g fill="none" stroke="#b5532f" strokeOpacity="0.32" strokeWidth="0.7">
          <path d="M13 4.6 C12 20 11.6 34 12.6 48" />
          <path d="M20 3.6 L20 49.3" />
          <path d="M27 4.6 C28 20 28.4 34 27.4 48" />
          <path d="M5.6 18 C14 20 26 20 34.4 18" strokeOpacity="0.18" />
        </g>
        {/* the rim of the mouth, and the flame inside it */}
        <ellipse cx="20" cy="47.6" rx="10.6" ry="2.1" fill="#9e3b22" />
        <ellipse cx="20" cy="47.2" rx="8.4" ry="1.3" fill="#ffd27a" opacity="0.9" />
        <path className="anim-flame" d="M20 39.5 C22.6 42.5 22.8 45.6 20 47 C17.2 45.6 17.4 42.5 20 39.5 Z" fill="url(#lantern-flame)" />
      </svg>
    </div>
  );
}
