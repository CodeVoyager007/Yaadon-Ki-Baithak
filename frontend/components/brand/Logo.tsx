import { useId } from "react";

/**
 * The Baithak emblem: a lamp-lit diya under a gold Mughal arch, the window of
 * an evening baithak, on a night-indigo tile. The same drawing is the favicon
 * (app/icon.svg), so the tab and the page match.
 */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2d5c" />
          <stop offset="1" stopColor="#0c0d2e" />
        </linearGradient>
        <linearGradient id={`dusk-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3366" />
          <stop offset="1" stopColor="#7a2a35" />
        </linearGradient>
        <linearGradient id={`gold-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe7a6" />
          <stop offset="1" stopColor="#d9a94f" />
        </linearGradient>
        <radialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffd58a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd58a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#sky-${id})`} />
      <path
        d="M16 55 V31 C16 19 25 11.5 32 8 C39 11.5 48 19 48 31 V55 Z"
        fill={`url(#dusk-${id})`}
        stroke={`url(#gold-${id})`}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="37" r="13" fill={`url(#glow-${id})`} className="anim-flicker" />
      <path className="anim-flame" d="M32 26 C36.5 32 36.5 37 32 41 C27.5 37 27.5 32 32 26 Z" fill="#ffe7a3" />
      <path d="M32 31 C34 34 34 36.5 32 38.5 C30 36.5 30 34 32 31 Z" fill="#fff8e0" />
      <path d="M21 43 Q32 42 43 43 Q40.5 51.5 32 52 Q23.5 51.5 21 43 Z" fill="#e07a52" />
      <path d="M24 45.5 Q32 47.5 40 45.5" stroke="#fbe0c4" strokeOpacity="0.6" strokeWidth="1.4" fill="none" />
      <path d="M51 12 l1.3 3.2 3.2 1.3 -3.2 1.3 -1.3 3.2 -1.3 -3.2 -3.2 -1.3 3.2 -1.3 z" fill="#fbe7a6" />
    </svg>
  );
}
