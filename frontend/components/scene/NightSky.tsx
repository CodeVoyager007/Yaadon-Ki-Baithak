"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useMemo, useRef } from "react";
import { seeded } from "@/lib/random";
import skyline from "./karachi-skyline.jpg";

const STAR_COUNT = 90;

type Props = {
  /** Lanterns are only needed on the home hero. */
  full?: boolean;
  /** The painted Karachi skyline along the bottom. "dim" keeps it low and quiet behind forms. */
  skyline?: boolean | "dim";
  /**
   * Hero "camera" progress (0 to 1) from a pinned scroll scene. When given,
   * the sky drifts, the moon rises and the city pushes in like a film shot.
   */
  camera?: MotionValue<number>;
};

/**
 * Karachi at night: pixel stars, a soft moon, paper lanterns drifting up,
 * and a painted skyline (Mazar-e-Quaid, Empress Market, the port).
 */
export function NightSky({ full = true, skyline: showSkyline = true, camera }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const p = camera ?? scrollYProgress;
  const still = reduce ?? false;
  // With a camera: stars and moon rise away, the city pushes in. Without: gentle parallax.
  const starsY = useTransform(p, [0, 1], still ? [0, 0] : camera ? [0, -110] : [0, 60]);
  const moonY = useTransform(p, [0, 1], still ? [0, 0] : camera ? [0, -190] : [0, 120]);
  const moonX = useTransform(p, [0, 1], still || !camera ? [0, 0] : [0, -90]);
  const cityScale = useTransform(p, [0, 1], still || !camera ? [1, 1] : [1, 1.3]);
  const cityY = useTransform(p, [0, 1], still || !camera ? ["0%", "0%"] : ["0%", "-7%"]);

  const stars = useMemo(() => {
    const r = seeded(1947);
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      left: r() * 100,
      top: r() * 70,
      size: r() > 0.85 ? 4 : r() > 0.5 ? 3 : 2,
      delay: r() * 4,
      dur: 2 + r() * 3,
      key: i,
    }));
  }, []);

  const lanterns = useMemo(() => {
    const r = seeded(1962);
    return Array.from({ length: full ? 7 : 0 }, (_, i) => ({
      left: i % 2 === 0 ? r() * 3 : 90 + r() * 8,
      scale: 0.45 + r() * 0.7,
      dur: 26 + r() * 22,
      delay: -r() * 40,
      key: i,
    }));
  }, [full]);

  const fireflies = useMemo(() => {
    const r = seeded(1938);
    return Array.from({ length: full ? 14 : 6 }, (_, i) => ({
      left: r() * 100,
      top: 55 + r() * 40,
      delay: r() * 6,
      key: i,
    }));
  }, [full]);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* sky */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0c0d2e_0%,#12133a_25%,#2b2d5c_58%,#4a3366_80%,#8a4a5a_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[radial-gradient(ellipse_at_50%_120%,rgba(242,169,59,0.45),transparent_65%)]" />

      {/* pixel stars */}
      <motion.div style={{ y: starsY }} className="absolute inset-0">
        {stars.map((s) => (
          <span
            key={s.key}
            className="anim-twinkle absolute bg-moon"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
              boxShadow: s.size > 2 ? "0 0 6px rgba(255,244,220,0.8)" : undefined,
            }}
          />
        ))}
      </motion.div>

      {/* moon */}
      <motion.div style={{ y: moonY, x: moonX }} className="absolute right-[6%] top-[11%] h-16 w-16 opacity-80 sm:h-40 sm:w-40 sm:opacity-100 md:top-[9%] md:right-[8%]">
        <div className="absolute -inset-16 rounded-full bg-[radial-gradient(circle,rgba(255,244,220,0.35),transparent_65%)]" />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fffaf0,#fff4dc_45%,#f0d9a8_100%)] shadow-[0_0_60px_rgba(255,244,220,0.55)]" />
        <div className="absolute left-[30%] top-[55%] h-3 w-3 bg-[#ecd3a0] opacity-70" />
        <div className="absolute left-[58%] top-[30%] h-2 w-2 bg-[#ecd3a0] opacity-60" />
        <div className="absolute left-[62%] top-[62%] h-4 w-4 bg-[#ecd3a0] opacity-50" />
      </motion.div>

      {/* paper lanterns drifting up */}
      {lanterns.map((l) => (
        <div
          key={l.key}
          className="absolute bottom-[-12%] hidden md:block"
          style={{
            left: `${l.left}%`,
            animation: reduce ? undefined : `rise ${l.dur}s linear ${l.delay}s infinite`,
            zIndex: l.scale > 0.85 ? 2 : 0,
          }}
        >
          <div style={{ transform: `scale(${l.scale})`, animation: reduce ? undefined : "sway 6s ease-in-out infinite" }}>
            <Lantern />
          </div>
        </div>
      ))}

      {showSkyline && (
        <motion.div
          style={{ scale: cityScale, y: cityY, transformOrigin: "50% 92%" }}
          className={`skyline-painting absolute inset-x-0 bottom-0 ${showSkyline === "dim" ? "is-dim h-[34vh] min-h-[200px] opacity-45" : "h-[56vh] min-h-[300px]"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={skyline.src}
            alt=""
            className="h-full w-full object-cover object-bottom"
          />
          {/* darken behind the headline so the text stays easy to read */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_22%_30%,rgba(12,13,46,0.55),transparent_60%)]" />
          {/* melt the bottom edge into the section below */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-[#100f2e]" />
        </motion.div>
      )}

      {/* fireflies */}
      {fireflies.map((f) => (
        <span
          key={f.key}
          className="anim-drift absolute h-[3px] w-[3px] bg-lantern-soft"
          style={{
            left: `${f.left}%`,
            top: `${f.top}%`,
            animationDelay: `${f.delay}s`,
            boxShadow: "0 0 10px 3px rgba(255,213,138,0.6)",
          }}
        />
      ))}
    </div>
  );
}

function Lantern() {
  return (
    <div className="relative h-[70px] w-[46px]">
      <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(242,169,59,0.45),transparent_65%)]" />
      <div className="absolute left-1/2 top-0 h-2 w-6 -translate-x-1/2 rounded-sm bg-[#5a2a1a]" />
      <div className="absolute inset-x-0 top-1.5 bottom-1.5 rounded-[45%] bg-[radial-gradient(ellipse_at_50%_60%,#fff1c2_0%,#ffc35a_35%,#e0751f_75%,#a8441a_100%)] shadow-[0_0_30px_rgba(242,169,59,0.7)]" />
      <div className="absolute inset-x-[30%] top-2 bottom-2 rounded-full bg-[rgba(255,255,255,0.18)]" />
      <div className="absolute bottom-0 left-1/2 h-2 w-5 -translate-x-1/2 rounded-sm bg-[#5a2a1a]" />
    </div>
  );
}
