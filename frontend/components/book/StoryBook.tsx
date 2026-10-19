"use client";

import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import { AJRAK_BORDER } from "@/components/app/AppBackdrop";
import { SCENE_IMAGES } from "@/components/illustrations/SceneByName";
import { elderLabel, type Elder } from "@/lib/book-store";
import { bookPages, coverImage, shownQuote, type BookPage } from "@/lib/book-pages";
import { voiceLength, type StoredChapter } from "@/lib/chapter-store";
import { StoryImage } from "./StoryImage";
import { WholeStory } from "./WholeStory";

type Lang = "both" | "ur" | "en";
/** One side of an open spread. `full` sides are boards (the cover, the inside of the cover), not paper. */
type Side = { node: ReactNode; full?: boolean } | null;
type View = { key: string; label: string; left: Side; right: Side };
/** A sheet being turned: from one view to the next, by a button, a key or a hand. */
type Flip = { from: number; to: number; dir: 1 | -1; start: number; end: number };

const TURN_S = 0.9;
const isUrdu = (text: string) => /[؀-ۿ]/.test(text);

function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

/** The recording a page was written from, so the reader can hear it in the elder's own voice. */
/** How far through the turn a sheet is, 0 to 1. */
function progressOf(angle: number, flip: Flip | null) {
  if (!flip) return 0;
  return Math.min(1, Math.max(0, Math.abs(angle - flip.start) / 180));
}

/**
 * A finished story as a hardcover picture book. It starts closed: a leather
 * cover with the title in gold and the painting in an arch. "Open the book"
 * swings the cover over the spine; inside, every spread is a painting on the
 * left and the words on the right, and the pages turn like paper (shaded as
 * they lift, casting a shadow on the page beneath). Pages can be dragged by
 * hand, or turned with the buttons, the dots and the arrow keys. On phones it
 * is one page at a time, turning off the left binding. Reduced motion: pages
 * change without the turn.
 */
export function StoryBook({ stored, elder, family }: { stored: StoredChapter; elder: Elder | null; family?: string }) {
  const reduce = useReducedMotion();
  const wide = useWide();
  const [lang, setLang] = useState<Lang>("both");
  const [at, setAt] = useState(0);
  const [flip, setFlip] = useState<Flip | null>(null);
  const flipRef = useRef<Flip | null>(null);
  flipRef.current = flip;
  const angle = useMotionValue(0);
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; t: number; lastX: number; lastT: number; side: "left" | "right"; started: boolean } | null>(null);

  const { chapter, turns } = stored;
  const who = elder ? elderLabel(elder) : "their storyteller";
  const pages = useMemo(() => bookPages(stored), [stored]);
  const quote = shownQuote(chapter);
  const date = (() => {
    const d = new Date(stored.createdAt);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  })();
  const cover = coverImage(stored);
  const coverFallback = SCENE_IMAGES[stored.scene].src;

  // ---- the pieces of the book ----
  const frontCover = (
    <div className="book-board relative h-full w-full overflow-hidden rounded-r-[14px] rounded-l-[4px]">
      <div aria-hidden className="absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-black/45 via-white/10 to-transparent" />
      <div aria-hidden className="absolute inset-3 rounded-[10px] p-[5px] sm:inset-4" style={AJRAK_BORDER}>
        <div className="book-board h-full w-full rounded-[7px]" />
      </div>
      <div className="relative flex h-full flex-col items-center justify-center px-8 py-10 text-center sm:px-12">
        <p className="gilt font-urdu text-lg leading-[2]" dir="rtl" lang="ur">
          یادوں کی بیٹھک
        </p>
        <div className="mt-3 aspect-[4/5] w-[62%] max-w-[260px] overflow-hidden rounded-t-full border-[3px] border-[#d9a94f] shadow-[0_0_0_4px_rgba(58,32,22,0.9),0_10px_30px_-8px_rgba(0,0,0,0.8)]">
          <StoryImage src={cover} fallback={coverFallback} className="h-full w-full object-cover" />
        </div>
        {chapter.title.ur && (
          <h2 className="gilt font-urdu mt-5 text-2xl leading-[2] sm:text-3xl sm:leading-[2]" dir="rtl" lang="ur">
            {chapter.title.ur}
          </h2>
        )}
        <h2 className="gilt font-display text-2xl font-semibold leading-tight sm:text-3xl">{chapter.title.en}</h2>
        <p className="mt-3 text-sm text-[#e9cf96]/85">Told by {who}</p>
      </div>
    </div>
  );

  const endpaper = (
    <div className="endpaper relative h-full w-full overflow-hidden rounded-l-[14px] rounded-r-[4px]">
      <div className="relative flex h-full flex-col items-center justify-center px-10 text-center">
        <div className="rounded-[18px] border-2 border-[#9e2b25]/50 bg-[#fbf1dc]/90 px-7 py-8 shadow-sm">
          <p className="font-urdu text-xl leading-[2] text-[#9e2b25]" dir="rtl" lang="ur">
            یہ کتاب اس خاندان کی امانت ہے
          </p>
          <p className="font-display mt-1 text-lg text-[#24160e]">This storybook belongs to {family ? `the ${family}` : "the family"}</p>
          <div className="mx-auto my-4 h-px w-16 bg-[#c9ad7f]" />
          <p className="text-sm text-[#5a4636]">
            Told by {who}
            {date ? `, ${date}` : ""}
          </p>
          <p className="mt-1 text-xs text-[#7a5a3a]">{voiceLength(turns)} of their real voice inside</p>
        </div>
      </div>
    </div>
  );

  const titlePage = (
    <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center">
      <p className="font-urdu text-xl text-[#9e2b25]" dir="rtl" lang="ur">
        یادوں کی بیٹھک
      </p>
      <div className="my-5 h-px w-24 bg-[#c9ad7f]" />
      {chapter.title.ur && (
        <p className="font-urdu text-3xl leading-[2] text-[#24160e] sm:text-4xl sm:leading-[2]" dir="rtl" lang="ur">
          {chapter.title.ur}
        </p>
      )}
      <p className="font-display mt-1 text-3xl leading-tight text-[#24160e] sm:text-4xl">{chapter.title.en}</p>
      <p className="mt-5 text-[#5a4636]">
        Told by {who}
        {chapter.place ? `, ${chapter.place}` : ""}
        {chapter.year ? `, ${chapter.year}` : ""}
      </p>
      <p className="mt-1 text-sm text-[#7a5a3a]">
        {pages.length} {pages.length === 1 ? "page" : "pages"}
      </p>
      {stored.draft && (
        <p className="mt-4 rounded-md bg-[#f2a93b]/25 px-3 py-1 text-xs font-bold text-[#5a4636]">Draft: the story in their words, word for word</p>
      )}
    </div>
  );

  const words = (p: BookPage, n: number) => {
    const ur = paragraphs(p.ur);
    const en = paragraphs(p.en);
    const showUr = ur.length > 0 && lang !== "en";
    const showEn = en.length > 0 && (lang !== "ur" || ur.length === 0);
    return (
      <div className="flex h-full flex-col px-7 py-8 sm:px-9">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1" data-scroll>
          {showUr && (
            <div dir="rtl" lang="ur" className="space-y-2">
              {ur.map((t, i) => (
                <p key={i} className="font-urdu text-[1.35rem] leading-[2.15] text-[#24160e] sm:text-2xl sm:leading-[2.2]">
                  {t}
                </p>
              ))}
            </div>
          )}
          {showEn && (
            <div className={`space-y-2 ${showUr ? "mt-4 border-t border-[#c9ad7f]/60 pt-4" : ""}`}>
              {en.map((t, i) => (
                <p key={i} className="font-display text-[1.05rem] leading-relaxed text-[#3b2a20] sm:text-lg">
                  {t}
                </p>
              ))}
            </div>
          )}
          {!showUr && !showEn && <p className="font-display italic text-[#7a5a3a]">This page is in {lang === "ur" ? "English" : "Urdu"} only.</p>}
        </div>
        <p className="mt-3 text-center font-display text-xs text-[#7a5a3a]">{n}</p>
      </div>
    );
  };

  const picture = (p: BookPage) => <StoryImage src={p.image} fallback={p.fallback} className="h-full w-full object-cover" />;

  const quotePage = quote ? (
    <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center">
      <blockquote
        className={isUrdu(quote.text) ? "font-urdu text-2xl leading-[2.2] text-[#9e2b25] sm:text-3xl" : "font-display text-2xl italic leading-snug text-[#9e2b25]"}
        dir="auto"
      >
        «{quote.text}»
      </blockquote>
      <p className="mt-2 text-sm text-[#7a5a3a]">{who}, in their own words</p>
    </div>
  ) : (
    <StoryImage src={cover} fallback={coverFallback} className="h-full w-full object-cover" />
  );

  const endPage = (
    <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center">
      <p className="font-urdu text-4xl leading-[2] text-[#24160e]" dir="rtl" lang="ur">
        ختم شد
      </p>
      <p className="font-display text-2xl text-[#24160e]">The End</p>
      <div className="my-5 h-px w-24 bg-[#c9ad7f]" />
      <p className="max-w-xs text-sm leading-relaxed text-[#5a4636]">Written only from {who}&apos;s own words. Every page keeps the recording it came from.</p>
    </div>
  );

  // Wide screens show spreads; phones show one page at a time (cover, title, then a page per side).
  const views: View[] = useMemo(() => {
    if (wide) {
      return [
        { key: "closed", label: "Cover", left: null, right: { node: frontCover, full: true } },
        { key: "title", label: "Title page", left: { node: endpaper, full: true }, right: { node: titlePage } },
        ...pages.map((p, i) => ({
          key: `p${i}`,
          label: `Page ${i + 1} of ${pages.length}`,
          left: { node: picture(p) },
          right: { node: words(p, i + 1) },
        })),
        { key: "end", label: "The End", left: { node: quotePage }, right: { node: endPage } },
      ];
    }
    const single = (key: string, label: string, node: ReactNode, full = false): View => ({ key, label, left: null, right: { node, full } });
    return [
      single("closed", "Cover", frontCover, true),
      single("title", "Title page", titlePage),
      ...pages.map((p, i) =>
        single(
          `p${i}`,
          `Page ${i + 1} of ${pages.length}`,
          <div className="flex h-full flex-col">
            <div className="h-[42%] shrink-0 overflow-hidden">{picture(p)}</div>
            <div className="min-h-0 flex-1">{words(p, i + 1)}</div>
          </div>,
        ),
      ),
      single(
        "end",
        "The End",
        <div className="flex h-full flex-col justify-center">
          {quote && <div className="h-1/2">{quotePage}</div>}
          <div className={quote ? "h-1/2" : "h-full"}>{endPage}</div>
        </div>,
      ),
    ];
    // the page builders read lang, who and the rest from this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wide, stored, pages, lang, who, date, family, quote]);

  const last = views.length - 1;
  // An edit can make the book shorter than the page we're on.
  useEffect(() => {
    if (at > last) setAt(last);
  }, [at, last]);
  // A new layout (rotating a tablet) starts again from the cover.
  useEffect(() => {
    setAt(0);
    setFlip(null);
    angle.set(0);
  }, [wide, angle]);

  // ---- turning ----
  const angles = useCallback(
    (dir: 1 | -1) => (wide ? (dir > 0 ? { start: 0, end: -180 } : { start: 0, end: 180 }) : dir > 0 ? { start: 0, end: -180 } : { start: -180, end: 0 }),
    [wide],
  );

  // Closed, the book sits centred; open, it spreads across. Set at the very start of a turn too,
  // so the first frame doesn't jump.
  const bookX = useMotionValue("0%");
  const xAt = useCallback(
    (f: Flip | null, p: number) => {
      if (!wide || !f) return "0%";
      const fromX = f.from === 0 ? -25 : 0;
      const toX = f.to === 0 ? -25 : 0;
      return `${fromX + (toX - fromX) * p}%`;
    },
    [wide],
  );
  useMotionValueEvent(angle, "change", (a) => bookX.set(xAt(flipRef.current, progressOf(a, flipRef.current))));
  const startFlip = useCallback(
    (f: Flip) => {
      flipRef.current = f;
      angle.set(f.start);
      bookX.set(xAt(f, 0));
      setFlip(f);
    },
    [angle, bookX, xAt],
  );
  // Set while a long jump lands on its last page, so another turn can't start from the wrong place.
  const landing = useRef(false);

  const settle = useCallback(
    (f: Flip, commit: boolean, fromProgress: number) => {
      const remaining = commit ? 1 - fromProgress : fromProgress;
      void animate(angle, commit ? f.end : f.start, { duration: Math.max(0.18, TURN_S * remaining), ease: [0.32, 0.02, 0.24, 1] }).then(() => {
        if (commit) setAt(f.to);
        setFlip(null);
        angle.set(0);
      });
    },
    [angle],
  );

  const go = useCallback(
    (target: number) => {
      if (flipRef.current || landing.current || target < 0 || target > last || target === at) return;
      if (reduce) {
        setAt(target);
        return;
      }
      // The cover only ever swings between "closed" and the title page; longer jumps skip the pages between.
      let from = at;
      let to = target;
      if (to === 0 && from > 1) from = 1;
      if (from === 0 && to > 1) to = 1;
      if (from !== at) setAt(from);
      const dir: 1 | -1 = to > from ? 1 : -1;
      const f: Flip = { from, to, dir, ...angles(dir) };
      startFlip(f);
      requestAnimationFrame(() => {
        void animate(angle, f.end, { duration: TURN_S, ease: [0.45, 0.05, 0.25, 1] }).then(() => {
          setAt(to);
          setFlip(null);
          angle.set(0);
          if (to !== target) {
            landing.current = true;
            requestAnimationFrame(() => {
              setAt(target);
              landing.current = false;
            });
          }
        });
      });
    },
    [angle, angles, at, last, reduce, startFlip],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.key === "ArrowRight") go(at + 1);
      if (e.key === "ArrowLeft") go(at - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, go]);

  // ---- turning by hand ----
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (reduce || flipRef.current || landing.current || e.button > 0) return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, [role=tab]")) return;
    const rect = area.current?.getBoundingClientRect();
    if (!rect) return;
    const side = wide && e.clientX < rect.left + rect.width / 2 ? "left" : "right";
    drag.current = { x: e.clientX, t: e.timeStamp, lastX: e.clientX, lastT: e.timeStamp, side, started: false };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const rect = area.current?.getBoundingClientRect();
    if (!d || !rect) return;
    // The mouse button came up outside the window: finish the turn instead of following the pointer.
    if (e.pointerType === "mouse" && e.buttons === 0) {
      onPointerUp(e);
      return;
    }
    const dx = e.clientX - d.x;
    if (!d.started) {
      if (Math.abs(dx) < 10) return;
      // Wide: drag the right page leftwards to go on, the left page rightwards to go back. Phone: either way.
      const dir: 1 | -1 = wide ? (d.side === "right" ? 1 : -1) : dx < 0 ? 1 : -1;
      const to = at + dir;
      const wrongWay = (dir > 0 && dx > 0) || (dir < 0 && dx < 0);
      if (wrongWay || to < 0 || to > last) {
        drag.current = null;
        return;
      }
      d.started = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      startFlip({ from: at, to, dir, ...angles(dir) });
    }
    const f = flipRef.current;
    if (!f) return;
    const pageW = wide ? rect.width / 2 : rect.width;
    const p = Math.min(1, Math.max(0, Math.abs(dx) / (pageW * 1.25)));
    angle.set(f.start + (f.end - f.start) * p);
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    const f = flipRef.current;
    if (!d?.started || !f) return;
    const p = progressOf(angle.get(), f);
    const speed = (e.clientX - d.lastX) / Math.max(1, e.timeStamp - d.lastT); // px per ms
    const flick = f.dir > 0 ? speed < -0.5 : speed > 0.5;
    settle(f, p > 0.45 || flick, p);
  }

  // The system took the pointer away (a call, a scroll gesture): the page falls back, never turns.
  function onPointerCancel() {
    const d = drag.current;
    drag.current = null;
    const f = flipRef.current;
    if (!d?.started || !f) return;
    settle(f, false, progressOf(angle.get(), f));
  }

  // ---- what is drawn ----
  const progress = useTransform(angle, (a) => progressOf(a, flipRef.current));
  const shadeFront = useTransform(progress, [0, 0.5], [0, 0.45]);
  const shadeBack = useTransform(progress, [0.5, 1], [0.35, 0]);
  const castShadow = useTransform(progress, (p) => Math.sin(p * Math.PI) * 0.55);
  // The left board appears as the cover lands on it.
  const leftBoard = useTransform(progress, (p) => {
    const f = flipRef.current;
    if (!f) return at === 0 ? 0 : 1;
    if (f.from === 0) return p >= 0.5 ? 1 : 0;
    if (f.to === 0) return p >= 0.5 ? 0 : 1;
    return 1;
  });

  const v = (i: number) => views[Math.min(Math.max(i, 0), last)];
  const base = flip
    ? wide
      ? { left: v(flip.dir > 0 ? flip.from : flip.to).left, right: v(flip.dir > 0 ? flip.to : flip.from).right }
      : { left: null, right: v(flip.dir > 0 ? flip.to : flip.from).right }
    : { left: v(at).left, right: v(at).right };
  const leaf = flip
    ? wide
      ? flip.dir > 0
        ? { front: v(flip.from).right, back: v(flip.to).left, side: "right" as const }
        : { front: v(flip.from).left, back: v(flip.to).right, side: "left" as const }
      : { front: v(flip.dir > 0 ? flip.from : flip.to).right, back: null, side: "right" as const }
    : null;
  const isCoverSheet = !!flip && (flip.from === 0 || flip.to === 0);
  const shown = flip ? flip.to : at;
  const readFraction = last > 0 ? Math.min(1, Math.max(0, (shown - 1) / Math.max(1, last - 1))) : 0;

  const sheet = (side: Side, edge: "left" | "right", shade?: MotionValue<number>) => {
    if (!side) return null;
    return (
      <div className={`relative h-full w-full overflow-hidden ${side.full ? "" : `storybook-paper ${edge === "left" ? "rounded-l-[6px]" : "rounded-r-[6px]"}`}`}>
        {side.node}
        {!side.full && (
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 w-12 ${edge === "left" ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"} from-[rgba(60,35,15,0.32)] to-transparent`}
          />
        )}
        {shade && <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-[#2a1608]" style={{ opacity: shade }} />}
      </div>
    );
  };

  /** Paper sits inside the boards; the cover and endpaper are the boards themselves. */
  const slot = (side: Side, edge: "left" | "right") =>
    side?.full ? (
      <div className="absolute inset-0">{sheet(side, edge)}</div>
    ) : (
      <div className={`absolute inset-y-[10px] ${edge === "left" ? "left-[10px] right-0" : "left-0 right-[10px]"}`}>{sheet(side, edge)}</div>
    );

  const leafBox = (side: "left" | "right") =>
    isCoverSheet ? `inset-y-0 w-1/2 ${side === "right" ? "right-0" : "left-0"}` : `inset-y-[10px] w-[calc(50%-10px)] ${side === "right" ? "right-[10px]" : "left-[10px]"}`;

  const pageEdges = (count: number, edge: "left" | "right") =>
    count > 0 ? (
      <div
        aria-hidden
        className={`absolute inset-y-[14px] ${edge === "left" ? "left-[3px]" : "right-[3px]"} bg-[repeating-linear-gradient(to_right,#f4e6c8_0_1px,#c9ad7f_1px_2px)]`}
        style={{ width: Math.round(count) }}
      />
    ) : null;

  return (
    <section aria-roledescription="storybook" aria-label={chapter.title.en || chapter.title.ur} className="select-none">
      <div className="mb-5 flex flex-col items-center gap-3">
        <WholeStory turns={turns} who={who} />
        <div className="glass-night inline-flex rounded-full p-1" role="tablist" aria-label="Language">
          {(
            [
              ["both", "Both"],
              ["ur", "اردو"],
              ["en", "English"],
            ] as [Lang, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={lang === id}
              onClick={() => setLang(id)}
              className={`h-10 rounded-full px-5 text-sm font-bold transition ${lang === id ? "bg-lantern text-ink" : "text-moon/75 hover:text-moon"} ${id === "ur" ? "font-urdu text-base" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={area}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className={`relative mx-auto touch-pan-y ${wide ? "h-[clamp(440px,calc(100svh-290px),660px)] max-w-[1120px]" : "h-[min(640px,calc(100svh-230px))] min-h-[480px] max-w-[460px]"} ${flip ? "cursor-grabbing" : "cursor-grab"}`}
      >
        {wide ? (
          <motion.div className="absolute inset-0 [perspective:2600px]" style={{ x: flip ? bookX : at === 0 ? "-25%" : "0%" }}>
            {/* the book's shadow on the table */}
            <div aria-hidden className="absolute inset-x-[6%] -bottom-6 h-10 rounded-[50%] bg-black/50 blur-2xl" />
            {/* left board: the back of the front cover, with the pages already read */}
            <motion.div className="book-board absolute inset-y-0 left-0 w-1/2 rounded-l-[16px] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]" style={{ opacity: flip ? leftBoard : at === 0 ? 0 : 1 }}>
              {pageEdges(2 + readFraction * 8, "left")}
              {slot(base.left, "left")}
            </motion.div>
            {/* right board: the pages still to read */}
            <div className={`absolute inset-y-0 right-0 w-1/2 rounded-r-[16px] ${base.right?.full ? "" : "book-board shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]"}`}>
              {!base.right?.full && pageEdges(2 + (1 - readFraction) * 8, "right")}
              {slot(base.right, "right")}
            </div>
            {/* the spine */}
            {at !== 0 || flip ? <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 bg-gradient-to-r from-black/0 via-black/40 to-black/0" /> : null}
            {flip && (
              <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(30,15,5,0.55),transparent_60%)]" style={{ opacity: castShadow }} />
            )}
            {flip && leaf && (
              <motion.div
                className={`absolute [transform-style:preserve-3d] ${leafBox(leaf.side)} ${leaf.side === "right" ? "origin-left" : "origin-right"}`}
                style={{ rotateY: angle }}
              >
                <div className="absolute inset-0 [backface-visibility:hidden]">{sheet(leaf.front, leaf.side, shadeFront)}</div>
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  {sheet(leaf.back, leaf.side === "right" ? "left" : "right", shadeBack)}
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <div className="absolute inset-0 [perspective:1600px]">
            <div aria-hidden className="absolute inset-x-[8%] -bottom-5 h-8 rounded-[50%] bg-black/50 blur-2xl" />
            <div className={`absolute inset-0 rounded-r-[16px] rounded-l-[6px] ${base.right?.full ? "" : "book-board"}`}>
              {!base.right?.full && pageEdges(2 + (1 - readFraction) * 6, "right")}
              {base.right?.full ? (
                <div className="absolute inset-0">{sheet(base.right, "right")}</div>
              ) : (
                <div className="absolute inset-y-[8px] left-[8px] right-[8px]">{sheet(base.right, "right")}</div>
              )}
              {!base.right?.full && <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/45 to-transparent" />}
            </div>
            {flip && <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[16px] bg-[linear-gradient(to_right,rgba(30,15,5,0.5),transparent_70%)]" style={{ opacity: castShadow }} />}
            {flip && leaf && (
              <motion.div
                className={`absolute origin-left [transform-style:preserve-3d] ${isCoverSheet ? "inset-0" : "inset-y-[8px] left-[8px] right-[8px]"}`}
                style={{ rotateY: angle }}
              >
                <div className="absolute inset-0 [backface-visibility:hidden]">{sheet(leaf.front, "right", shadeFront)}</div>
                <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <motion.div className={`h-full w-full ${isCoverSheet ? "endpaper" : "storybook-paper"} rounded-[6px]`}>
                    <motion.div aria-hidden className="h-full w-full bg-[#2a1608]" style={{ opacity: shadeBack }} />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <nav aria-label="Pages" className="mx-auto mt-8 flex max-w-[1120px] items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(at - 1)}
          disabled={shown === 0 || !!flip}
          className="glass-night inline-flex h-12 items-center gap-1.5 rounded-full px-5 font-bold text-moon hover:bg-white/15 disabled:opacity-40"
        >
          <ChevronLeft size={18} /> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-bold text-moon/80" aria-live="polite">
            {v(shown).label}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {views.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to ${s.label}`}
                aria-current={i === shown ? "page" : undefined}
                className={`h-2.5 rounded-full transition-all ${i === shown ? "w-6 bg-lantern" : "w-2.5 bg-moon/30 hover:bg-moon/60"}`}
              />
            ))}
          </div>
        </div>
        {shown === last ? (
          <button type="button" onClick={() => go(0)} disabled={!!flip} className="btn-lantern pixel-corners inline-flex h-12 items-center gap-1.5 px-5 font-extrabold">
            <X size={16} /> <span className="hidden sm:inline">Close the book</span>
          </button>
        ) : (
          <button type="button" onClick={() => go(at + 1)} disabled={!!flip} className="btn-lantern pixel-corners inline-flex h-12 items-center gap-1.5 px-5 font-extrabold">
            {shown === 0 ? <BookOpen size={17} /> : null}
            <span className="hidden sm:inline">{shown === 0 ? "Open the book" : "Turn the page"}</span> {shown === 0 ? null : <ChevronRight size={18} />}
          </button>
        )}
      </nav>
      <p className="mt-3 text-center text-xs text-moon/45">Drag a page to turn it, or use the arrow keys.</p>
    </section>
  );
}
