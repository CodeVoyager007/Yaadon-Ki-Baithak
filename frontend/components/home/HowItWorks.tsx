"use client";

import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { AJRAK_BORDER } from "@/components/app/AppBackdrop";
import howBook from "@/components/illustrations/scenes/how-book.jpg";
import howChai from "@/components/illustrations/scenes/how-chai.jpg";
import howListen from "@/components/illustrations/scenes/how-listen.jpg";

const STEPS = [
  {
    title: "Sit together",
    body: "Open Baithak on your phone, add your Nani or Dada, and pick something to talk about: childhood, 1947, a wedding, the kitchen.",
    art: howChai,
  },
  {
    title: "They talk, Birdy listens",
    body: "Birdy asks one gentle question at a time, in Urdu, and follows the details they mention. No typing, no reading.",
    art: howListen,
  },
  {
    title: "A chapter appears",
    body: "Their words become an illustrated chapter in Urdu and English, with their real voice attached, ready to share with family anywhere.",
    art: howBook,
  },
];

/** Phones, tablets and reduced motion: the three circles joined by a pixel path. */
function HowItWorksClassic() {
  const listRef = useRef<HTMLOListElement>(null);
  const circleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [path, setPath] = useState<{ d: string; w: number; h: number } | null>(null);

  // Draw the path from the real circle positions so it always meets them,
  // whatever the screen width or the middle step's offset.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const draw = () => {
      const box = list.getBoundingClientRect();
      const pts = circleRefs.current.map((el) => {
        const r = el!.getBoundingClientRect();
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, r: r.width / 2 };
      });
      // Stacked on mobile: no path.
      if (pts.length < 3 || Math.abs(pts[0].y - pts[2].y) > 120) return setPath(null);
      const gap = 10; // breathing room between line and circle
      let d = "";
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const sx = a.x + Math.cos(ang) * (a.r + gap);
        const sy = a.y + Math.sin(ang) * (a.r + gap);
        const ex = b.x - Math.cos(ang) * (b.r + gap);
        const ey = b.y - Math.sin(ang) * (b.r + gap);
        const mx = (sx + ex) / 2;
        // A soft S-curve: leave flat, arrive flat.
        d += `M${sx.toFixed(1)} ${sy.toFixed(1)} C${mx.toFixed(1)} ${sy.toFixed(1)} ${mx.toFixed(1)} ${ey.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)} `;
      }
      setPath({ d, w: box.width, h: box.height });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(list);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="relative scroll-mt-24 px-5 py-28 lg:motion-safe:hidden">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display max-w-xl text-4xl font-semibold leading-tight text-moon sm:text-5xl">
          One evening, one cup of chai, one chapter.
        </h2>

        <ol ref={listRef} className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
          {/* pixel path joining the steps */}
          {path && (
            <svg aria-hidden className="pointer-events-none absolute inset-0" width={path.w} height={path.h}>
              <path d={path.d} fill="none" stroke="#f2a93b" strokeWidth="4" strokeDasharray="8 8" opacity="0.85" />
            </svg>
          )}
          {STEPS.map((s, i) => (
            <li key={s.title} className={`relative ${i === 1 ? "md:mt-14" : ""}`}>
              <div
                ref={(el) => {
                  circleRefs.current[i] = el;
                }}
                className="glass-night relative z-10 mx-auto h-[172px] w-[172px] overflow-hidden rounded-full p-1.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.art.src} alt="" loading="lazy" className="h-full w-full rounded-full object-cover" />
              </div>
              <div className="mt-6 text-center">
                <span className="font-pixel text-3xl text-lantern">{i + 1}</span>
                <h3 className="font-display mt-1 text-2xl text-moon">{s.title}</h3>
                <p className="mx-auto mt-3 max-w-[19rem] leading-relaxed text-moon/85">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const URDU_STEPS = ["مل کر بیٹھیں", "وہ بولیں، برڈی سنے", "ایک نیا باب"];

export function HowItWorks() {
  return (
    <div id="how" className="scroll-mt-0">
      <HowItWorksFilm />
      <HowItWorksClassic />
    </div>
  );
}

/**
 * Large screens: the section holds still while scrolling plays the three
 * steps like scenes. The painted frame cross-fades with a slow zoom and
 * the matching step lights up.
 */
function HowItWorksFilm() {
  const track = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: track, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(p, "change", (v) => setActive(v < 0.34 ? 0 : v < 0.67 ? 1 : 2));
  const progress = useTransform(p, [0.02, 0.98], [0, 1]);

  return (
    <section ref={track} aria-label="How it works" className="relative hidden h-[330vh] lg:motion-safe:block">
      <div className="how-film sticky top-0 flex h-[100svh] items-center overflow-hidden pt-16">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-center gap-16 px-5">
          {/* the film frame */}
          <div className="mx-auto w-full max-w-[min(100%,72vh)] rounded-[36px] p-[8px] shadow-[0_40px_80px_-40px_rgba(5,5,30,0.9)]" style={AJRAK_BORDER}>
            <div className="relative aspect-square overflow-hidden rounded-[29px] bg-raat">
              {STEPS.map((s, i) => (
                <FilmShot key={s.title} src={s.art.src} index={i} p={p} />
              ))}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-raat/90 to-transparent" />
              <p
                key={active}
                className="font-urdu absolute bottom-5 right-7 text-3xl leading-[2] text-lantern-soft drop-shadow-[0_2px_12px_rgba(5,5,15,0.9)]"
                dir="rtl"
                lang="ur"
              >
                {URDU_STEPS[active]}
              </p>
              <span className="font-pixel absolute left-5 top-5 rounded-md bg-raat/70 px-2.5 py-1 text-sm text-lantern-soft">
                {active + 1} / 3
              </span>
            </div>
          </div>

          {/* the script */}
          <div>
            <p className="font-urdu mb-1 text-2xl leading-[2] text-lantern-soft" dir="rtl" lang="ur" style={{ textAlign: "left" }}>ایک شام، ایک چائے، ایک باب</p>
            <h2 className="how-title font-display text-5xl font-semibold leading-tight text-moon">One evening, one cup of chai, one chapter.</h2>
            <div className="how-steps relative mt-12 pl-8">
              <span className="absolute left-0 top-1 bottom-1 w-1 rounded-full bg-white/10" aria-hidden />
              <motion.span style={{ scaleY: progress }} className="absolute left-0 top-1 bottom-1 w-1 origin-top rounded-full bg-lantern" aria-hidden />
              <ol className="space-y-9">
                {STEPS.map((s, i) => (
                  <li key={s.title} className={`transition-opacity duration-500 ${i === active ? "is-active opacity-100" : "opacity-35"}`}>
                    <span className="font-pixel text-2xl text-lantern">{i + 1}</span>
                    <h3 className="font-display mt-1 text-3xl text-moon">{s.title}</h3>
                    <p className="mt-2 max-w-md text-lg leading-relaxed text-moon/85">{s.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** One painted shot: fades in, drifts closer (a slow Ken Burns zoom), fades out. */
function FilmShot({ src, index, p }: { src: string; index: number; p: MotionValue<number> }) {
  const windows = [
    [0, 0, 0.3, 0.38],
    [0.3, 0.38, 0.63, 0.71],
    [0.63, 0.71, 1, 1],
  ][index];
  const opacity = useTransform(p, windows, index === 0 ? [1, 1, 1, 0] : index === 2 ? [0, 1, 1, 1] : [0, 1, 1, 0]);
  const scale = useTransform(p, [windows[0], windows[3]], [1.16, 1]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <motion.img src={src} alt="" style={{ opacity, scale }} className="absolute inset-0 h-full w-full object-cover" />
  );
}
