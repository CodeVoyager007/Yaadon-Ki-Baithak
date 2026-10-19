"use client";

import { useId } from "react";

type Props = {
  lit?: boolean;
  /** 0 to 1. While recording, the flame grows with the speaker's voice. */
  level?: number;
  /** A small, steady flame: the lamp is lit and waiting, nobody is speaking yet. */
  calm?: boolean;
  size?: number;
  className?: string;
};

/** Diya, the clay lamp: always lit, and its flame leaps up while an elder is speaking. */
export function Diya({ lit = true, level = 0, calm = false, size = 64, className }: Props) {
  const id = useId().replace(/:/g, "");
  const grow = calm ? 0.78 : 1 + Math.min(Math.max(level, 0), 1) * 0.6;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden>
      <defs>
        <radialGradient id={`glow-${id}`} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="rgba(255,213,138,0.9)" />
          <stop offset="100%" stopColor="rgba(255,213,138,0)" />
        </radialGradient>
        <linearGradient id={`clay-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e07a52" />
          <stop offset="100%" stopColor="#8a3a22" />
        </linearGradient>
        <linearGradient id={`flame-${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#f2a93b" />
          <stop offset="60%" stopColor="#ffd666" />
          <stop offset="100%" stopColor="#fff8e0" />
        </linearGradient>
      </defs>
      {lit && <circle cx="50" cy="44" r={38 * grow} fill={`url(#glow-${id})`} opacity={calm ? 0.6 : 1} className="anim-flicker" />}
      {lit && (
        <g style={{ transform: `scale(${grow})`, transformOrigin: "50px 60px", transition: "transform 120ms ease-out" }}>
          <path className="anim-flame" d="M50 30 C58 42 58 52 50 60 C42 52 42 42 50 30 Z" fill={`url(#flame-${id})`} />
        </g>
      )}
      <path d="M50 60 L50 64" stroke="#3b2a20" strokeWidth="2" />
      <path d="M14 62 Q50 60 86 62 Q80 84 50 86 Q20 84 14 62 Z" fill={`url(#clay-${id})`} />
      <path d="M86 62 L96 58 L88 66 Z" fill="#b5532f" />
      <path d="M22 66 Q50 72 78 66" stroke="rgba(255,220,190,0.5)" strokeWidth="2" fill="none" />
      <g fill="#f2d7a0" opacity="0.8">
        <circle cx="34" cy="74" r="2" />
        <circle cx="50" cy="77" r="2" />
        <circle cx="66" cy="74" r="2" />
      </g>
    </svg>
  );
}
