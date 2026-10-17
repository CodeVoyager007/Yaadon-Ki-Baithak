"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import type { RefObject } from "react";

/**
 * Film edits between pinned scenes. As a scene slides in under the previous
 * one's last black frame it lifts out of the dark, and as it ends it fades
 * back down to black, so scenes cut through black like a film.
 * `p` is the scene's pinned progress, `target` its section.
 */
export function SceneDip({ p, target, exit = true }: { p: MotionValue<number>; target: RefObject<HTMLElement | null>; exit?: boolean }) {
  // offsets stay inside 0..1 and in order (the browser rejects anything else)
  const { scrollYProgress: entering } = useScroll({ target, offset: ["start end", "start start"] });
  const enterO = useTransform(entering, [0, 0.75], [0.85, 0]);
  const exitO = useTransform(p, [0.9, 1], [0, exit ? 1 : 0]);
  return (
    <>
      <motion.div aria-hidden style={{ opacity: enterO }} className="pointer-events-none absolute inset-0 z-[35] bg-[#05050f]" />
      <motion.div aria-hidden style={{ opacity: exitO }} className="pointer-events-none absolute inset-0 z-[35] bg-[#05050f]" />
    </>
  );
}
