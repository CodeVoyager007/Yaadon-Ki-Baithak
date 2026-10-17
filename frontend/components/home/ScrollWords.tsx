"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * A line that lights up word by word as it scrolls through the screen,
 * like subtitles being read aloud.
 */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "start 0.3"] });
  const words = text.split(" ");
  // Decided after hydration: the server can't know the motion preference, and
  // both must render the same first frame.
  const [still, setStill] = useState(false);
  useEffect(() => setStill(Boolean(reduce)), [reduce]);

  if (still) return <h2 className={className}>{text}</h2>;

  return (
    <h2 ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <Word key={i} p={scrollYProgress} from={i / words.length} to={(i + 1) / words.length}>
          {w}
        </Word>
      ))}
    </h2>
  );
}

function Word({ p, from, to, children }: { p: MotionValue<number>; from: number; to: number; children: string }) {
  const opacity = useTransform(p, [from, to], [0.16, 1]);
  return (
    <>
      <motion.span aria-hidden style={{ opacity }}>
        {children}
      </motion.span>{" "}
    </>
  );
}
