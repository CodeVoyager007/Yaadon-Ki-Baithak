"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import { useCinema } from "@/lib/use-cinema";
import { NightSky } from "@/components/scene/NightSky";
import { Birdy, type BirdyMood } from "@/components/mascots/Birdy";
import { ChapterCard } from "@/components/stories/ChapterCard";
import { HERO_CHAPTER } from "@/lib/samples";
import { useSound } from "@/components/sound/SoundProvider";
import { ElderButton } from "./ElderButton";

export function Hero() {
  const reduce = useReducedMotion();
  const { chirp } = useSound();
  const [mood, setMood] = useState<BirdyMood>(reduce ? "idle" : "flying");
  const [landed, setLanded] = useState(!!reduce);

  // Opening shot: the hero stays pinned while scrolling plays a camera move.
  const cinema = useCinema();
  const track = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: track, offset: ["start start", "end end"] });
  const textY = useTransform(p, [0, 0.45], [0, -150]);
  const textO = useTransform(p, [0, 0.38], [1, 0]);
  const cardY = useTransform(p, [0, 0.55], [0, -100]);
  const cardO = useTransform(p, [0.08, 0.5], [1, 0]);
  const cardS = useTransform(p, [0, 0.55], [1, 0.92]);
  const bars = useTransform(p, [0.22, 0.55], [0, 1]);
  const titleO = useTransform(p, [0.48, 0.64, 0.86, 0.97], [0, 1, 1, 0]);
  const titleY = useTransform(p, [0.48, 0.64], [28, 0]);
  const curtain = useTransform(p, [0.9, 1], [0, 1]);

  return (
    <div ref={track} className="relative lg:motion-safe:h-[220vh]">
    <section className="hero-section relative isolate flex min-h-[100svh] items-center overflow-hidden pb-[clamp(110px,20vh,200px)] pt-28 lg:motion-safe:sticky lg:motion-safe:top-0 lg:motion-safe:h-[100svh]">
      <NightSky camera={cinema ? p : undefined} />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div style={cinema ? { y: textY, opacity: textO } : undefined}>
          <p className="hero-urdu font-urdu text-3xl text-lantern-soft sm:text-4xl" lang="ur" dir="rtl" style={{ textAlign: "left" }}>
            ہر بزرگ ایک کتاب ہے
          </p>
          <h1 className="hero-title font-display mt-2 text-[clamp(2.6rem,min(7.2vw,11vh),6.2rem)] font-semibold leading-[0.95] tracking-[-0.02em] text-moon">
            Every elder is a&nbsp;library.
          </h1>
          <p className="hero-lede mt-6 max-w-[34rem] text-lg leading-relaxed text-moon/80">
            Birdy sits with your Nani, asks gentle questions in her own language, and turns her answers into an
            illustrated storybook with her real voice inside.
          </p>
          <div className="hero-ctas mt-9 flex flex-wrap items-center gap-4">
            <Link href="/signup" className="btn-lantern pixel-corners inline-flex h-[60px] items-center px-7 text-base font-extrabold">
              Start your family book
            </Link>
            <ElderButton />
          </div>
        </motion.div>

        <motion.div style={cinema ? { y: cardY, opacity: cardO, scale: cardS } : undefined} className="hero-card relative mx-auto w-full max-w-sm">
          <motion.div
            className="hero-birdy absolute -top-[104px] right-2 z-20 cursor-pointer"
            initial={reduce ? false : { x: 520, y: -420, rotate: 12, scale: 0.7 }}
            animate={
              reduce
                ? { x: 0, y: 0, rotate: 0, scale: 1 }
                : { x: [520, 300, 90, 0], y: [-420, -300, -40, 0], rotate: [12, 6, -4, 0], scale: [0.7, 0.85, 1, 1] }
            }
            transition={{ duration: 2.6, delay: 0.5, ease: [0.3, 0.1, 0.25, 1], times: [0, 0.35, 0.8, 1] }}
            onAnimationComplete={() => {
              setMood("idle");
              setLanded(true);
              chirp();
            }}
            onHoverStart={() => {
              if (!landed) return;
              setMood("happy");
              chirp();
            }}
            onHoverEnd={() => landed && setMood("idle")}
            onTap={() => {
              if (!landed) return;
              setMood("happy");
              chirp();
              window.setTimeout(() => setMood("idle"), 900);
            }}
          >
            <Birdy mood={mood} size={128} flip title="Birdy, the storyteller bird" />
          </motion.div>

          <ChapterCard chapter={HERO_CHAPTER} />
          <p className="mt-3 text-center text-xs text-moon/60">A sample chapter. Yours will hold your family&apos;s voice.</p>
        </motion.div>
      </div>

      {cinema && (
        <>
          {/* cinema bars slide in as the camera pushes into the city */}
          <motion.div aria-hidden style={{ scaleY: bars }} className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[11vh] origin-top bg-[#05050f]" />
          <motion.div aria-hidden style={{ scaleY: bars }} className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[11vh] origin-bottom bg-[#05050f]" />

          {/* title card */}
          <motion.div
            aria-hidden
            style={{ opacity: titleO, y: titleY }}
            className="pointer-events-none absolute inset-x-0 top-[17vh] z-20 flex flex-col items-center text-center"
          >
            <p className="font-urdu text-5xl leading-[2] text-lantern-soft drop-shadow-[0_4px_24px_rgba(5,5,15,0.9)]" dir="rtl" lang="ur">
              آج رات، کراچی میں
            </p>
            <p className="font-display mt-1 text-3xl italic text-moon drop-shadow-[0_4px_24px_rgba(5,5,15,0.9)]">Tonight in Karachi, a story begins.</p>
          </motion.div>

          {/* fade to the next scene */}
          <motion.div aria-hidden style={{ opacity: curtain }} className="pointer-events-none absolute inset-0 z-40 bg-[#100f2e]" />
        </>
      )}
    </section>
    </div>
  );
}
