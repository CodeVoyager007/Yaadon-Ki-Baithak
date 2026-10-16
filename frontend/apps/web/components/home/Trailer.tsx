"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef, useState } from "react";
import { useSound } from "@/components/sound/SoundProvider";
import { SceneDip } from "./SceneDip";
import dholki from "@/components/illustrations/trailer/dholki.jpg";
import eid from "@/components/illustrations/trailer/eid.jpg";
import listen from "@/components/illustrations/trailer/listen.jpg";
import train from "@/components/illustrations/trailer/train.jpg";

const CUTS = [
  { img: eid.src, ur: "امی کے کھانے", en: "Ammi's recipes." },
  { img: train.src, ur: "دادی کا سفر", en: "Dadi's journey." },
  { img: dholki.src, ur: "نانی کی شادی کے گیت", en: "Nani's wedding songs." },
  { img: listen.src, ur: "ان کی اپنی آواز میں", en: "Saved in their own voice." },
];
const N = CUTS.length;

/**
 * The scroll trailer. The screen holds while each bit of scrolling cuts to
 * the next full-screen shot: it opens from a thin slit of light, pushes in,
 * and the line slams onto the screen. A whoosh plays on every cut.
 */
export function Trailer() {
  const reduce = useReducedMotion();
  const track = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: track, offset: ["start start", "end end"] });
  const { sfx } = useSound();
  const [cut, setCut] = useState(-1); // drives the whoosh on each new shot
  useMotionValueEvent(p, "change", (v) => {
    const next = v <= 0 ? -1 : Math.min(N - 1, Math.floor(v * N * 0.999));
    if (next !== cut) {
      if (next > cut && next >= 0) sfx("whoosh");
      setCut(next);
    }
  });

  if (reduce) {
    return (
      <section aria-label="Stories worth keeping" className="space-y-2 bg-[#05050f]">
        {CUTS.map((c) => (
          <figure key={c.en} className="relative h-[60vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
            <figcaption className="absolute inset-x-0 bottom-10 text-center">
              <p className="font-urdu text-4xl leading-[2] text-lantern-soft" dir="rtl" lang="ur">
                {c.ur}
              </p>
              <p className="font-display text-2xl italic text-moon">{c.en}</p>
            </figcaption>
          </figure>
        ))}
      </section>
    );
  }

  return (
    <section ref={track} data-scene="Stories worth keeping" data-shots={N} aria-label="Stories worth keeping" className="relative bg-[#05050f]" style={{ height: `${N * 90 + 60}vh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {CUTS.map((c, i) => (
          <Cut key={c.en} index={i} p={p} {...c} />
        ))}
        <SceneDip p={p} target={track} />
      </div>
    </section>
  );
}

function Cut({ img, ur, en, index, p }: { img: string; ur: string; en: string; index: number; p: MotionValue<number> }) {
  const start = index / N;
  const end = (index + 1) / N;
  const open = start + (end - start) * 0.22;

  // opens from a vertical slit of light (the first shot is already open)
  const clip = useTransform(p, [start, open], index === 0 ? ["inset(0% 0% 0% 0%)", "inset(0% 0% 0% 0%)"] : ["inset(0% 50% 0% 50%)", "inset(0% 0% 0% 0%)"]);
  const scale = useTransform(p, [start, end], [1.25, 1.02]);
  // offsets must stay inside 0..1 and in order, or the browser rejects the animation
  const shown = useTransform(p, [Math.max(0, start - 0.002), start + 0.002], index === 0 ? [1, 1] : [0, 1]);
  const bright = useTransform(p, [start, open, end], [1.8, 0.8, 0.6]);
  const filter = useTransform(bright, (b) => `brightness(${b})`);
  // the line slams in, holds, then lifts away before the next cut
  const textScale = useTransform(p, [open - 0.02, open + 0.04], [1.6, 1]);
  const textO = useTransform(p, [open - 0.02, open + 0.03, end - 0.04, end], [0, 1, 1, 0]);
  const textBlur = useTransform(p, [open - 0.02, open + 0.04], [16, 0]);
  const blur = useTransform(textBlur, (b) => `blur(${b}px)`);

  return (
    <motion.div className="absolute inset-0" style={{ clipPath: clip, opacity: shown, zIndex: index + 1 }}>
      <motion.img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ scale, filter }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_30%,rgba(0,0,0,0.85)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />
      <motion.div style={{ scale: textScale, opacity: textO, filter: blur }} className="absolute inset-x-0 bottom-[17vh] z-20 px-6 text-center">
        <p className="font-urdu text-[clamp(2.6rem,6.5vw,5.5rem)] leading-[1.9] text-lantern-soft drop-shadow-[0_6px_30px_rgba(0,0,0,0.95)]" dir="rtl" lang="ur">
          {ur}
        </p>
        <p className="font-display text-[clamp(1.4rem,3vw,2.4rem)] italic text-moon drop-shadow-[0_6px_30px_rgba(0,0,0,0.95)]">{en}</p>
      </motion.div>
    </motion.div>
  );
}
