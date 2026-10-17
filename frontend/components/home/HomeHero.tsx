"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Birdy, type BirdyMood } from "@/components/mascots/Birdy";
import skyline from "@/components/scene/karachi-skyline.jpg";
import { useSound } from "@/components/sound/SoundProvider";
import { ElderButton } from "./ElderButton";
import { Lantern } from "./Lantern";

const LANTERN = 300;
const BIRD = 118;

/**
 * Sunset: the first moment of the evening. The laali glow sits on the
 * horizon behind the Karachi skyline; Hudhud flies in and perches on a
 * lantern. One screen, nothing pinned: scrolling moves the page.
 */
export function HomeHero() {
  const reduce = useReducedMotion();
  const { chirp } = useSound();
  // Server and browser must render the same first frame (the server can't know the
  // motion preference), so he always starts "flying"; with reduced motion he's
  // simply perched right after hydration, with no flight.
  const [mood, setMood] = useState<BirdyMood>("flying");
  const landed = mood !== "flying";
  useEffect(() => {
    if (reduce) setMood("idle");
  }, [reduce]);

  const greet = () => {
    if (!landed) return;
    setMood("happy");
    chirp();
    window.setTimeout(() => setMood("idle"), 900);
  };

  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden pb-[clamp(150px,28vh,280px)] pt-28">
      {/* the horizon: the last red of the sunset, then the city */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[75%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(236,120,76,0.6)_0%,rgba(200,85,61,0.3)_35%,rgba(74,51,102,0.15)_60%,transparent_75%)]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={skyline.src}
        alt=""
        aria-hidden
        fetchPriority="high"
        className="absolute inset-x-0 bottom-0 h-[42vh] w-full object-cover object-bottom [mask-image:linear-gradient(to_top,black_55%,transparent)]"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#2b2d5c] to-transparent" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="reveal">
          <p className="font-urdu text-3xl leading-[2] text-lantern-soft sm:text-4xl" lang="ur" dir="rtl" style={{ textAlign: "left" }}>
            ہر بزرگ ایک کتاب ہے
          </p>
          <h1 className="font-display mt-1 text-[clamp(2.6rem,min(7vw,11vh),6rem)] font-semibold leading-[0.95] tracking-[-0.02em] text-moon">
            Every elder is a&nbsp;library.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-moon/85">
            Hudhud sits with your Nani, asks gentle questions in her own language, and turns her answers into an illustrated
            storybook with her real voice inside.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/signup" className="btn-lantern pixel-corners inline-flex h-[60px] items-center px-7 text-base font-extrabold">
              Start your family book
            </Link>
            <ElderButton />
          </div>
        </div>

        {/* the lantern Hudhud perches on, swaying gently on its chain. Phones get the same
            scene at 60% (scaled inside a smaller box, so no empty space is left behind). */}
        <div className="relative order-first h-[180px] w-[106px] justify-self-end lg:order-none lg:h-[300px] lg:w-[176px] lg:justify-self-center">
        <div className="absolute left-0 top-0 origin-top-left scale-[0.6] lg:scale-100">
        <div className="relative origin-top motion-safe:animate-[lantern-sway_6s_ease-in-out_infinite]" style={{ width: (LANTERN * 100) / 170, height: LANTERN }}>
          <div aria-hidden className="absolute left-1/2 top-[62%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lantern/35 blur-3xl" />
          <Lantern size={LANTERN} className="relative" />
          <motion.button
            type="button"
            aria-label="Say hello to Hudhud"
            onClick={greet}
            onHoverStart={() => landed && setMood("happy")}
            onHoverEnd={() => landed && setMood("idle")}
            className="absolute"
            // feet on the lantern's dome: the bird's feet sit at ~82% of its image
            style={{ left: (LANTERN * 50) / 170 - BIRD / 2, top: LANTERN * (26 / 170) - BIRD * 0.82 }}
            initial={{ x: 520, y: -380, rotate: 12, scale: 0.7 }}
            animate={{ x: [520, 300, 80, 0], y: [-380, -280, -30, 0], rotate: [12, 6, -4, 0], scale: [0.7, 0.85, 1, 1] }}
            transition={reduce ? { duration: 0 } : { duration: 2.4, delay: 0.4, ease: [0.3, 0.1, 0.25, 1], times: [0, 0.35, 0.8, 1] }}
            onAnimationComplete={() => {
              setMood("idle");
              if (!reduce) chirp();
            }}
          >
            <Birdy mood={mood} size={BIRD} flip title="Hudhud, the storyteller bird" />
          </motion.button>
        </div>
        </div>
        </div>
      </div>
    </section>
  );
}
