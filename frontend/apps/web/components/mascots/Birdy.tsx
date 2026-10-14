"use client";

import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "motion/react";
import birdyImage from "./birdy.webp";

export type BirdyMood = "idle" | "flying" | "happy" | "listening";

type Props = {
  mood?: BirdyMood;
  size?: number;
  className?: string;
  title?: string;
  /** Face left instead of right. */
  flip?: boolean;
};

const MOODS: Record<BirdyMood, { animate: TargetAndTransition; transition: Transition }> = {
  // slow breathing
  idle: {
    animate: { scaleY: [1, 1.035, 1], scaleX: [1, 0.985, 1], rotate: 0, y: 0 },
    transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
  },
  // bobbing through the air
  flying: {
    animate: { y: [0, -8, 0], rotate: [-4, 3, -4] },
    transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
  },
  // two little hops with squash and stretch
  happy: {
    animate: { y: [0, -14, 0, -9, 0], scaleY: [1, 1.06, 0.94, 1.04, 1], scaleX: [1, 0.96, 1.05, 0.98, 1], rotate: 0 },
    transition: { duration: 0.9, ease: "easeOut" },
  },
  // head tilted, paying attention
  listening: {
    animate: { rotate: -10, y: 0, scaleX: 1, scaleY: 1 },
    transition: { type: "spring", stiffness: 140, damping: 11 },
  },
};

/**
 * Birdy, the storyteller bird. A cut-out of the team's chosen bird
 * (birdy.webp, next to this file) brought to life with motion instead of drawing.
 */
export function Birdy({ mood = "idle", size = 160, className, title = "Birdy", flip = false }: Props) {
  const reduce = useReducedMotion();
  const m = MOODS[mood];

  return (
    <span
      role="img"
      aria-label={title}
      className={`relative inline-block ${className ?? ""}`}
      style={{ width: size, height: size, transform: flip ? "scaleX(-1)" : undefined }}
    >
      {mood !== "flying" && (
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
          style={{
            bottom: size * 0.07,
            width: size * 0.55,
            height: size * 0.07,
            background: "radial-gradient(closest-side, rgba(20,10,30,0.45), rgba(20,10,30,0))",
          }}
        />
      )}
      <motion.span
        className="absolute inset-0 block"
        style={{ originX: 0.5, originY: 0.85 }}
        animate={reduce ? undefined : m.animate}
        transition={m.transition}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={birdyImage.src}
          alt=""
          width={size}
          height={size}
          draggable={false}
          decoding="async"
          className="h-full w-full select-none object-contain drop-shadow-[0_10px_18px_rgba(20,10,30,0.35)]"
        />
      </motion.span>
    </span>
  );
}
