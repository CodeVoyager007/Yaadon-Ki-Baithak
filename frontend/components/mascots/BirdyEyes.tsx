"use client";

import { useAnimate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef } from "react";

/*
 * A vector eye drawn exactly over the painted one in birdy.webp, so the
 * cut-out can blink and widen. Measured from the image: the dark eye is
 * 5.94% of the image wide, centred at (46.56%, 38.44%). In this SVG's 0..100
 * box the pupil has r = 36, so the box is 5.94 * 100 / 72 = 8.25% of the bird.
 */
const BOX = 8.25;
const CX = 46.56;
const CY = 38.44;

/** Feathers around the eye, for the eyelids. */
const LID = "#c8432b";
const LID_EDGE = "#7a2416";

export type EyeLook = "open" | "soft";

/*
 * Lid offsets in the 0..100 box. The top lid's lower edge sits at 52 and the
 * bottom lid's upper edge at 48 when both are at 0 (closed).
 */
const OPEN = { top: -60, bottom: 62 };
const SOFT = { top: -22, bottom: 34 }; // gentle: half-lowered, softer eyes
const SQUINT = { top: -16, bottom: 16 };
const SHUT = { top: 0, bottom: 4 };

/**
 * The bird's eye. `take` widens it (the classic cartoon double take): a quick
 * squint, a springy pop past full size that shows more of the cream ring and a
 * second sparkle, then it settles. `onTake` lets the parent jolt the body on
 * the pop. Idle: a blink every few seconds while on screen. `look="soft"`
 * lowers the lids for the gentle mood. Reduced motion: no blinks, no takes.
 */
export function BirdyEyes({ take, look = "open", onPop }: { take: number; look?: EyeLook; onPop?: () => void }) {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<SVGSVGElement>();
  const inView = useInView(scope, { amount: 0.6 });
  const busy = useRef(false);
  const ids = useId().replace(/:/g, "");
  const lids = look === "soft" ? SOFT : OPEN;
  const lidsRef = useRef(lids);
  lidsRef.current = lids;

  // Rest position whenever the look changes (gentle mood lowers the lids).
  useEffect(() => {
    if (!scope.current) return;
    void animate(".lid-top", { y: lids.top }, { duration: reduce ? 0 : 0.6, ease: "easeInOut" });
    void animate(".lid-bottom", { y: lids.bottom }, { duration: reduce ? 0 : 0.6, ease: "easeInOut" });
  }, [lids.top, lids.bottom, animate, reduce, scope]);

  // The double take. One requested while he's off screen waits until he's seen.
  const played = useRef(0);
  useEffect(() => {
    if (take <= played.current || !inView || reduce || !scope.current) return;
    played.current = take;
    busy.current = true;
    const rest = lidsRef.current;
    const run = async () => {
      // 1. notice: a quick squint
      await Promise.all([
        animate(".lid-top", { y: SQUINT.top }, { duration: 0.09, ease: "easeIn" }),
        animate(".lid-bottom", { y: SQUINT.bottom }, { duration: 0.09, ease: "easeIn" }),
      ]);
      // 2. pop: lids fly open, ring opens wider than the pupil, glint grows, sparkle twinkles
      onPop?.();
      // A fixed-length spring: bouncy, but finishes on time (an open-ended one lingers).
      const spring = { type: "spring", duration: 0.3, bounce: 0.5 } as const;
      await Promise.all([
        animate(".lid-top", { y: OPEN.top }, { duration: 0.12 }),
        animate(".lid-bottom", { y: OPEN.bottom }, { duration: 0.12 }),
        animate(".ring", { scale: 1.7 }, spring),
        animate(".pupil", { scale: 1.32 }, spring),
        animate(".glint", { scale: 1.45 }, spring),
        animate(".sparkle", { scale: [0, 1.2, 1], opacity: [0, 1, 1] }, { duration: 0.32 }),
      ]);
      // 3. hold the stare, then settle back
      await new Promise((r) => setTimeout(r, 160));
      await Promise.all([
        animate(".ring, .pupil, .glint", { scale: 1 }, { duration: 0.26, ease: "easeOut" }),
        animate(".sparkle", { scale: 0, opacity: 0 }, { duration: 0.25 }),
        animate(".lid-top", { y: rest.top }, { duration: 0.26 }),
        animate(".lid-bottom", { y: rest.bottom }, { duration: 0.26 }),
      ]);
    };
    run().finally(() => {
      busy.current = false;
    });
  }, [take, inView, reduce, animate, onPop, scope]);

  // Idle blinks, only while visible, never during a take.
  useEffect(() => {
    if (reduce || !inView) return;
    let timer = 0;
    const blink = async () => {
      if (!busy.current && scope.current) {
        const rest = lidsRef.current;
        await Promise.all([
          animate(".lid-top", { y: SHUT.top }, { duration: 0.07, ease: "easeIn" }),
          animate(".lid-bottom", { y: SHUT.bottom }, { duration: 0.07, ease: "easeIn" }),
        ]);
        await Promise.all([
          animate(".lid-top", { y: rest.top }, { duration: 0.13, ease: "easeOut" }),
          animate(".lid-bottom", { y: rest.bottom }, { duration: 0.13, ease: "easeOut" }),
        ]);
      }
      timer = window.setTimeout(blink, 2800 + Math.random() * 3200);
    };
    timer = window.setTimeout(blink, 1200 + Math.random() * 2000);
    return () => window.clearTimeout(timer);
  }, [inView, reduce, animate, scope]);

  const center = { transformOrigin: "50px 50px" };

  return (
    <svg
      ref={scope}
      aria-hidden
      viewBox="0 0 100 100"
      className="pointer-events-none absolute overflow-visible"
      style={{ left: `${CX - BOX / 2}%`, top: `${CY - BOX / 2}%`, width: `${BOX}%`, height: `${BOX}%` }}
    >
      <defs>
        <radialGradient id={`${ids}-pupil`} cx="42%" cy="38%" r="70%">
          <stop offset="0" stopColor="#2a3440" />
          <stop offset="0.55" stopColor="#0d1218" />
          <stop offset="1" stopColor="#05080b" />
        </radialGradient>
        <clipPath id={`${ids}-clip`}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>
      {/* cream ring, then the dark eye, then the glints */}
      <circle className="ring" cx="50" cy="50" r="40.5" fill="#f4e7cf" opacity="0.85" style={center} />
      <circle className="pupil" cx="50" cy="50" r="37" fill={`url(#${ids}-pupil)`} style={center} />
      <g className="glint" style={center}>
        <ellipse cx="41" cy="34" rx="12" ry="7.5" fill="#fff" opacity="0.9" transform="rotate(-18 41 34)" />
        <circle cx="62" cy="63" r="3.6" fill="#fff" opacity="0.55" />
      </g>
      <path
        className="sparkle"
        d="M74 22 l3 -9 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 z"
        fill="#fff"
        opacity="0"
        style={{ transformOrigin: "77px 25px", transform: "scale(0)" }}
      />
      {/* eyelids in the feather colour, kept inside the eye */}
      <g clipPath={`url(#${ids}-clip)`}>
        <g className="lid-top" style={{ transform: `translateY(${lids.top}px)` }}>
          <rect x="-10" y="-10" width="120" height="62" fill={LID} />
          <path d="M-10 52 Q50 60 110 52" stroke={LID_EDGE} strokeWidth="4" fill="none" />
        </g>
        <g className="lid-bottom" style={{ transform: `translateY(${lids.bottom}px)` }}>
          <rect x="-10" y="48" width="120" height="62" fill={LID} />
        </g>
      </g>
    </svg>
  );
}
