import { useId } from "react";

/**
 * A hanging brass lantern (qandeel) with a warm flame. Hudhud perches on its
 * cap in the hero; a row of them lights up at the end of the page.
 * `lit` turns the glow on; the flame flickers unless motion is reduced.
 */
export function Lantern({ size = 160, lit = true, className }: { size?: number; lit?: boolean; className?: string }) {
  // Several lanterns share a page; each needs its own gradient ids.
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 170" width={size * (100 / 170)} height={size} className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}-glass`} cx="50%" cy="60%" r="60%">
          <stop offset="0" stopColor="#fff1c4" />
          <stop offset="0.45" stopColor="#ffc861" />
          <stop offset="1" stopColor="#d9792c" />
        </radialGradient>
        <linearGradient id={`${id}-brass`} x1="0" x2="1">
          <stop offset="0" stopColor="#7a4a1c" />
          <stop offset="0.5" stopColor="#c99442" />
          <stop offset="1" stopColor="#6b3f17" />
        </linearGradient>
      </defs>
      {/* chain */}
      <line x1="50" y1="0" x2="50" y2="22" stroke="#c99442" strokeWidth="2" strokeDasharray="3 2" />
      <circle cx="50" cy="25" r="4" fill="none" stroke={`url(#${id}-brass)`} strokeWidth="2.5" />
      {/* cap: Hudhud sits here */}
      <path d="M30 44 Q50 22 70 44 Z" fill={`url(#${id}-brass)`} />
      <rect x="26" y="43" width="48" height="6" rx="2" fill={`url(#${id}-brass)`} />
      {/* glass */}
      <path d="M30 49 L70 49 L74 120 L26 120 Z" fill={lit ? `url(#${id}-glass)` : "#3a2a3a"} opacity={lit ? 0.95 : 0.8} />
      {lit && (
        <path
          className="origin-[50px_100px] motion-safe:animate-[flame_1.6s_ease-in-out_infinite]"
          d="M50 78 C58 90 58 102 50 108 C42 102 42 90 50 78 Z"
          fill="#fff8e1"
        />
      )}
      {/* frame bars */}
      <path d="M30 49 L26 120 M43 49 L41 120 M57 49 L59 120 M70 49 L74 120" stroke={`url(#${id}-brass)`} strokeWidth="2.5" />
      <rect x="22" y="119" width="56" height="7" rx="2" fill={`url(#${id}-brass)`} />
      <path d="M34 126 L66 126 L58 138 L42 138 Z" fill={`url(#${id}-brass)`} />
      <circle cx="50" cy="144" r="4" fill="#c99442" />
    </svg>
  );
}
