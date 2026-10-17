"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { SkyLantern } from "@/components/effects/SkyLantern";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSound } from "@/components/sound/SoundProvider";
import doorway from "@/components/illustrations/trailer/doorway.jpg";
import dholki from "@/components/illustrations/trailer/dholki.jpg";
import listen from "@/components/illustrations/trailer/listen.jpg";
import river from "@/components/illustrations/trailer/river.jpg";
import train from "@/components/illustrations/trailer/train.jpg";

type Shot = { img?: string; ur: string; en: string; ms: number; sound: "whoosh" | "boom" | null };

/** The teaser: one line per shot, hard cuts, Urdu first. */
const SHOTS: Shot[] = [
  { img: train.src, ur: "انیس سو سینتالیس", en: "1947.", ms: 1700, sound: "whoosh" },
  { img: doorway.src, ur: "ایک دروازہ جو اجنبیوں کے لیے کھلا", en: "A door that opened for strangers.", ms: 1900, sound: "whoosh" },
  { img: dholki.src, ur: "سات راتیں، گیت ہی گیت", en: "Seven nights of songs.", ms: 1800, sound: "whoosh" },
  { img: river.src, ur: "لالٹین کی روشنی میں سنی کہانیاں", en: "Stories told by lantern light.", ms: 1900, sound: "whoosh" },
  { ur: "یہ کہانیاں کسی نے لکھی نہیں", en: "Nobody ever wrote them down.", ms: 2100, sound: null },
  { img: listen.src, ur: "اب ہدہد سن رہا ہے", en: "Now, someone is listening.", ms: 2100, sound: "whoosh" },
];
const LOGO_MS = 2700;
const TITLE_MS = 3200;

type Phase = "off" | "gate" | "logo" | number | "title" | "exit";

/** True after the gate has opened once in this document: route changes keep
 * the module, a fresh load (or refresh) replaces it, so the intro shows on
 * every real load but never when someone simply clicks "Home". */
let introPlayedThisLoad = false;

/** Did this document (not this route) open on the home page? The navigation
 * entry keeps the URL the tab was loaded with, even after client-side route
 * changes — so "book → Home" never counts as a load, while a direct visit or
 * refresh of "/" always does. */
function loadedOnHome() {
  try {
    const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return new URL(nav?.name ?? window.location.href).pathname === "/";
  } catch {
    return false;
  }
}

/**
 * A studio-style intro, played from the footer's "Watch the intro": a tap to begin (so the
 * sound can play), a "ta-dum" logo, a teaser of hard cuts, then the title.
 * Always skippable. Never shown to people who prefer reduced motion.
 */
export function IntroFilm() {
  const reduce = useReducedMotion();
  const { sfx, enabled: soundOn, toggle: toggleSound } = useSound();
  const [phase, setPhase] = useState<Phase>("off");
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const close = useCallback(() => {
    clear();
    setPhase("exit");
    timers.current.push(window.setTimeout(() => setPhase("off"), 900));
  }, []);

  // It plays when asked for (the footer button), and also on a real page load
  // of the site. Clicking "Home" from another page is navigation, not a load,
  // so the film stays out of the way — a module-level flag survives route
  // changes (same bundle) but resets on every fresh load/refresh.
  useEffect(() => {
    if (reduce) return;
    const play = () => {
      // warm the images while the visitor reads the gate
      SHOTS.map((s) => s.img).forEach((src) => {
        if (src) new Image().src = src;
      });
      setPhase("gate");
    };
    if (!introPlayedThisLoad && loadedOnHome()) {
      introPlayedThisLoad = true;
      play();
    }
    window.addEventListener("baithak:intro", play);
    return () => window.removeEventListener("baithak:intro", play);
  }, [reduce]);

  // Lock page scroll while it plays; Escape skips.
  useEffect(() => {
    if (phase === "off") return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, close]);

  useEffect(() => clear, []);

  function play() {
    clear();
    setPhase("logo");
    sfx("hit");
    let at = LOGO_MS;
    SHOTS.forEach((shot, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setPhase(i);
          if (shot.sound) sfx(shot.sound);
        }, at),
      );
      at += shot.ms;
    });
    timers.current.push(
      window.setTimeout(() => {
        setPhase("title");
        sfx("boom");
      }, at),
    );
    timers.current.push(window.setTimeout(close, at + TITLE_MS));
  }

  if (phase === "off") return null;
  const shot = typeof phase === "number" ? SHOTS[phase] : null;

  return (
    <motion.div
      role="dialog"
      aria-label="Baithak intro"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === "exit" ? 0 : 1 }}
      transition={{ duration: 0.85, ease: "easeInOut" }}
      className="fixed inset-0 z-[100] overflow-hidden bg-[#030308] text-moon"
    >
      {/* letterbox bars, always on during the film */}
      {phase !== "gate" && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[9vh] bg-black" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[9vh] bg-black" />
        </>
      )}

      {/* Flying lanterns on the gate: the story's bright beginning */}
      {phase === "gate" && (
        <>
          <SkyLantern delay={0.4} duration={9} className="bottom-[4vh] right-[14vw]" />
          <SkyLantern delay={2.4} duration={11} className="bottom-[2vh] right-[42vw]" />
          <SkyLantern delay={4.6} duration={10} className="bottom-[6vh] right-[68vw]" />
        </>
      )}

      <AnimatePresence mode="wait">
        {phase === "gate" && (
          <motion.button
            key="gate"
            type="button"
            onClick={play}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            className="group absolute inset-0 flex flex-col items-center justify-center gap-6 focus:outline-none"
          >
            <span className="relative grid h-28 w-28 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-lantern/15" />
              <span className="absolute inset-3 rounded-full bg-[radial-gradient(circle,rgba(242,169,59,0.55),transparent_70%)] blur-md" />
              <span className="anim-flame relative block h-10 w-6 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-[radial-gradient(ellipse_at_50%_70%,#fff6d8,#ffd58a_45%,#f2a93b_75%,#c8553d)]" />
            </span>
            <span className="font-urdu text-4xl leading-[2] text-lantern-soft" dir="rtl" lang="ur">
              کہانی شروع کریں
            </span>
            <span className="font-display -mt-3 text-xl text-moon/85 group-hover:text-moon">Tap to begin the story</span>
            <span className="text-xs text-moon/40">{soundOn ? "Best with sound on" : "Sound is off"}</span>
          </motion.button>
        )}

      {phase === "logo" && <Logo key="logo" />}

        {shot && (
          <motion.div key={`shot-${phase}`} className="absolute inset-0" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
            {shot.img ? (
              <motion.img
                src={shot.img}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ scale: 1.22, filter: "brightness(1.6) blur(6px)" }}
                animate={{ scale: 1.04, filter: "brightness(0.78) blur(0px)" }}
                transition={{ scale: { duration: shot.ms / 1000 + 0.4, ease: "linear" }, filter: { duration: 0.35 } }}
              />
            ) : (
              <div className="absolute inset-0 bg-black" />
            )}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_30%,rgba(3,3,8,0.85)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />
            <ShotText ur={shot.ur} en={shot.en} big={!shot.img} />
          </motion.div>
        )}

        {phase === "title" && <Title key="title" />}
      </AnimatePresence>

      {/* Sound switch: on the gate (bottom left) and during the film (left of Skip). */}
      {phase !== "exit" && (
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Turn the intro sound off" : "Turn the intro sound on"}
          className="absolute bottom-8 left-6 z-40 inline-flex h-10 items-center gap-2 rounded-full border border-moon/25 bg-black/40 px-4 text-sm font-bold text-moon/85 backdrop-blur transition hover:bg-black/70 hover:text-moon"
        >
          {soundOn ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
          <span className="hidden sm:inline">{soundOn ? "Sound on" : "Sound off"}</span>
        </button>
      )}
      {phase !== "gate" && phase !== "exit" && (
        <button
          type="button"
          onClick={close}
          className="absolute bottom-[11vh] right-6 z-40 rounded-full border border-moon/30 bg-black/40 px-5 py-2 text-sm font-bold text-moon/85 backdrop-blur hover:bg-black/70 hover:text-moon"
        >
          Skip intro
        </button>
      )}
      {phase === "gate" && (
        <button type="button" onClick={close} className="absolute bottom-8 right-6 z-40 text-sm font-bold text-moon/50 hover:text-moon">
          Skip intro
        </button>
      )}
    </motion.div>
  );
}

/** Studio logo: light ribbons burst outward, then the name settles from wide and blurred to sharp. */
function Logo() {
  const ribbons = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  return (
    <motion.div className="absolute inset-0 grid place-items-center" exit={{ opacity: 0, scale: 1.08, transition: { duration: 0.3 } }}>
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
        {ribbons.map((i) => (
          <motion.span
            key={i}
            className="absolute h-[140vh] w-[3vw] rounded-full"
            style={{
              background: `linear-gradient(180deg, transparent, ${i % 3 === 0 ? "#c8553d" : i % 2 ? "#f2a93b" : "#ffd58a"}, transparent)`,
              filter: "blur(2px)",
            }}
            initial={{ x: 0, scaleY: 0.2, opacity: 0 }}
            animate={{ x: `${i * 7.5}vw`, scaleY: [0.2, 1, 1.2], opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.9, delay: 0.25 + Math.abs(i) * 0.03, ease: [0.2, 0.8, 0.2, 1] }}
          />
        ))}
      </div>
      <div className="relative text-center">
        <motion.p
          className="font-display text-[clamp(4rem,12vw,10rem)] font-semibold leading-none text-moon"
          initial={{ letterSpacing: "0.6em", opacity: 0, filter: "blur(18px)", scale: 1.25 }}
          animate={{ letterSpacing: "0.02em", opacity: 1, filter: "blur(0px)", scale: 1 }}
          transition={{ duration: 1.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ textShadow: "0 0 60px rgba(242,169,59,0.55)" }}
        >
          Baithak
        </motion.p>
        <motion.p
          className="font-urdu mt-2 text-4xl leading-[2] text-lantern-soft"
          dir="rtl"
          lang="ur"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.3 }}
        >
          یادوں کی بیٹھک
        </motion.p>
        {/* a glint sweeping across the name */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-24 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          initial={{ left: "-20%", opacity: 0 }}
          animate={{ left: "110%", opacity: [0, 1, 0] }}
          transition={{ duration: 0.9, delay: 1.55, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

function ShotText({ ur, en, big }: { ur: string; en: string; big: boolean }) {
  return (
    <div className={`absolute inset-x-0 z-20 px-6 text-center ${big ? "top-1/2 -translate-y-1/2" : "bottom-[16vh]"}`}>
      <div className="overflow-hidden">
        <motion.p
          className={`font-urdu leading-[2.1] text-lantern-soft drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] ${big ? "text-[clamp(2.4rem,6vw,4.5rem)]" : "text-[clamp(2rem,4.6vw,3.6rem)]"}`}
          dir="rtl"
          lang="ur"
          initial={{ y: "100%" }}
          animate={{ y: "0%" }}
          transition={{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          {ur}
        </motion.p>
      </div>
      <motion.p
        className={`font-display italic text-moon drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] ${big ? "text-[clamp(1.6rem,3.4vw,2.6rem)]" : "text-[clamp(1.3rem,2.6vw,2rem)]"}`}
        initial={{ opacity: 0, letterSpacing: "0.18em" }}
        animate={{ opacity: 1, letterSpacing: "0em" }}
        transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {en}
      </motion.p>
    </div>
  );
}

/** Final title over the city: the boom, the name, the tagline. */
function Title() {
  return (
    <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Night gradient instead of a second skyline: the title carries the screen. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(236,120,76,0.4)_0%,rgba(74,51,102,0.35)_40%,#030308_78%)]"
        initial={{ opacity: 0.35, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 3.4, ease: [0.16, 1, 0.3, 1] }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/25 to-black/60" />
      <div className="absolute inset-x-0 top-[22vh] z-20 text-center">
        <motion.p
          className="font-urdu text-[clamp(3rem,8vw,6.5rem)] leading-[1.9] text-lantern-soft"
          dir="rtl"
          lang="ur"
          initial={{ opacity: 0, scale: 1.4, filter: "blur(14px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ textShadow: "0 0 50px rgba(242,169,59,0.5)" }}
        >
          یادوں کی بیٹھک
        </motion.p>
        <motion.p
          className="font-display text-[clamp(1.5rem,3vw,2.4rem)] italic text-moon"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          Every elder is a library.
        </motion.p>
      </div>
    </motion.div>
  );
}
