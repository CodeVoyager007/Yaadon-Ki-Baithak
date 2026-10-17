"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { ChapterCard } from "@/components/stories/ChapterCard";
import { SAMPLE_CHAPTERS } from "@/lib/samples";
import { SceneDip } from "./SceneDip";

const HEADING = "The stories Nani told at bedtime";
const BLURB =
  "Umro Ayyar, Ali Baba, Gul Bakawali. Every family tells them a little differently, and that version deserves to be kept. These sample chapters show the format; your book will hold your own family's voices.";

export function StoryShelf() {
  return (
    <div id="stories" className="scroll-mt-0">
      <StoryReel />
      <StoryShelfClassic />
    </div>
  );
}

/** A strip of film: the sprocket holes that run above and below the reel. */
function Sprockets() {
  return (
    <div className="flex h-8 items-center bg-[#07071a]/90" aria-hidden>
      <div className="h-3 w-full bg-[repeating-linear-gradient(90deg,rgba(255,244,220,0.22)_0_16px,transparent_16px_36px)]" />
    </div>
  );
}

/**
 * Large screens: the section holds while scrolling down slides the stories
 * sideways, like a reel of film running past.
 */
function StoryReel() {
  const track = useRef<HTMLElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const { scrollYProgress: p } = useScroll({ target: track, offset: ["start start", "end end"] });
  const x = useTransform(p, [0.05, 0.95], [0, -distance]);

  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const measure = () => setDistance(Math.max(0, el.scrollWidth - window.innerWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section
      ref={track}
      aria-label={HEADING}
      data-scene="Nani's stories"
      className="relative hidden lg:motion-safe:block"
      style={{ height: `calc(100svh + ${distance}px)` }}
    >
      <div className="story-reel sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden pb-4 pt-24">
        <SceneDip p={p} target={track} />
        <div className="mx-auto w-full max-w-6xl px-5">
          <p className="font-urdu text-2xl leading-[2] text-lantern-soft" dir="rtl" lang="ur" style={{ textAlign: "left" }}>نانی کی کہانیاں</p>
          <h2 className="font-display text-4xl font-semibold leading-tight text-moon xl:text-5xl">{HEADING}</h2>
          <p className="mt-3 max-w-2xl text-moon/80">Every family tells them a little differently. That version deserves to be kept.</p>
        </div>
        <motion.div style={{ x }} className="mt-8 w-max">
          <Sprockets />
          <div
            ref={row}
            className="flex gap-7 bg-[#07071a]/60 py-5"
            style={{ paddingInline: "max(1.25rem, calc((100vw - 72rem) / 2 + 1.25rem))" }}
          >
            {SAMPLE_CHAPTERS.map((c) => (
              <ChapterCard key={c.slug} chapter={c} className="w-[320px] shrink-0" />
            ))}
          </div>
          <Sprockets />
        </motion.div>
      </div>
    </section>
  );
}

/** Phones, tablets and reduced motion: a swipeable shelf with buttons. */
function StoryShelfClassic() {
  const shelf = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = shelf.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 380), behavior: "smooth" });
  };

  return (
    <section className="relative scroll-mt-24 py-24 lg:motion-safe:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-5">
        <div className="max-w-xl">
          <h2 className="font-display text-4xl font-semibold leading-tight text-moon sm:text-5xl">{HEADING}</h2>
          <p className="mt-4 text-moon/80">{BLURB}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous stories" className="glass-night grid h-12 w-12 place-items-center rounded-full text-moon">
            <ChevronLeft />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Next stories" className="glass-night grid h-12 w-12 place-items-center rounded-full text-moon">
            <ChevronRight />
          </button>
        </div>
      </div>

      <div
        ref={shelf}
        className="shelf mt-12 flex gap-6 overflow-x-auto pb-6"
        style={{ paddingInline: "max(1.25rem, calc((100vw - 72rem) / 2 + 1.25rem))", scrollPaddingInline: "max(1.25rem, calc((100vw - 72rem) / 2 + 1.25rem))" }}
        tabIndex={0}
        aria-label="Sample chapters"
      >
        {SAMPLE_CHAPTERS.map((c) => (
          <ChapterCard key={c.slug} chapter={c} className="w-[300px] shrink-0 sm:w-[340px]" />
        ))}
      </div>
    </section>
  );
}
