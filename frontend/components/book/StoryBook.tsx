"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { AJRAK_BORDER } from "@/components/app/AppBackdrop";
import { VoiceClip } from "@/components/app/VoiceClip";
import { elderLabel, type Elder } from "@/lib/book-store";
import { bookPages, coverImage, type BookPage } from "@/lib/book-pages";
import { voiceLength, type StoredChapter, type Turn } from "@/lib/chapter-store";
import { SCENE_IMAGES } from "@/components/illustrations/SceneByName";
import { StoryImage } from "./StoryImage";

type Lang = "both" | "ur" | "en";
type Spread = { key: string; label: string; left: ReactNode; right: ReactNode; single: ReactNode };
type Turning = { from: number; to: number; dir: 1 | -1 };

const TURN_S = 0.75;
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
function voiceFor(page: BookPage, turns: Turn[]) {
  return page.sourceTurns.map((n) => turns.find((t) => t.index === n && t.role === "elder")).find((t) => t && (t.clipId || t.audioPath));
}

/**
 * A finished story as a picture book: a cover, then one spread per page
 * (the painting on the left, the words on the right) and an end page with a
 * line in the elder's own voice. On wide screens the leaf really turns over
 * the spine; on phones it is one page at a time. Arrow keys and swipes turn
 * pages too. Reduced motion: pages change without the turn.
 */
export function StoryBook({ stored, elder }: { stored: StoredChapter; elder: Elder | null }) {
  const reduce = useReducedMotion();
  const wide = useWide();
  const [lang, setLang] = useState<Lang>("both");
  const [at, setAt] = useState(0);
  const [turning, setTurning] = useState<Turning | null>(null);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const swipe = useRef<number | null>(null);

  const { chapter, turns } = stored;
  const who = elder ? elderLabel(elder) : "Their storyteller";
  const pages = useMemo(() => bookPages(stored), [stored]);
  const quoteTurn = chapter.pullQuote ? turns.find((t) => t.index === chapter.pullQuote!.turnIndex) : undefined;
  const date = (() => {
    const d = new Date(stored.createdAt);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  })();

  const text = (p: BookPage) => {
    const ur = paragraphs(p.ur);
    const en = paragraphs(p.en);
    const showUr = ur.length > 0 && lang !== "en";
    const showEn = en.length > 0 && (lang !== "ur" || ur.length === 0);
    return (
      <>
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
      </>
    );
  };

  const spreads: Spread[] = useMemo(() => {
    const cover = coverImage(stored);
    const coverFallback = SCENE_IMAGES[stored.scene].src;
    const titlePage = (
      <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center">
        <p className="font-urdu text-xl text-[#9e2b25]" dir="rtl" lang="ur">
          یادوں کی بیٹھک
        </p>
        <div className="my-5 h-px w-24 bg-[#c9ad7f]" />
        {chapter.title.ur && (
          <h2 className="font-urdu text-3xl leading-[2] text-[#24160e] sm:text-4xl sm:leading-[2]" dir="rtl" lang="ur">
            {chapter.title.ur}
          </h2>
        )}
        <h1 className="font-display mt-1 text-3xl leading-tight text-[#24160e] sm:text-4xl">{chapter.title.en}</h1>
        <p className="mt-5 text-[#5a4636]">
          Told by {who}
          {chapter.place ? `, ${chapter.place}` : ""}
          {chapter.year ? `, ${chapter.year}` : ""}
        </p>
        <p className="mt-1 text-sm text-[#7a5a3a]">
          {pages.length} {pages.length === 1 ? "page" : "pages"} · {voiceLength(turns)} of voice{date ? ` · ${date}` : ""}
        </p>
        {stored.draft && (
          <p className="mt-4 rounded-md bg-[#f2a93b]/25 px-3 py-1 text-xs font-bold text-[#5a4636]">Draft: the story in their words, word for word</p>
        )}
      </div>
    );
    const quotePage = chapter.pullQuote ? (
      <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center">
        <blockquote
          className={isUrdu(chapter.pullQuote.text) ? "font-urdu text-2xl leading-[2.2] text-[#9e2b25] sm:text-3xl" : "font-display text-2xl italic leading-snug text-[#9e2b25]"}
          dir="auto"
        >
          «{chapter.pullQuote.text}»
        </blockquote>
        <p className="mt-2 text-sm text-[#7a5a3a]">{who}, in their own words</p>
        <div className="mt-5 w-full max-w-xs">
          <VoiceClip clipId={quoteTurn?.clipId} audioPath={quoteTurn?.audioPath} durationMs={quoteTurn?.durationMs} label="Hear this line" tone="paper" />
        </div>
      </div>
    ) : (
      <StoryImage src={cover} fallback={coverFallback} className="h-full w-full object-cover opacity-90" />
    );
    const endPage = (
      <div className="flex h-full flex-col items-center justify-center px-8 py-10 text-center">
        <p className="font-urdu text-4xl leading-[2] text-[#24160e]" dir="rtl" lang="ur">
          ختم شد
        </p>
        <p className="font-display text-2xl text-[#24160e]">The End</p>
        <div className="my-5 h-px w-24 bg-[#c9ad7f]" />
        <p className="max-w-xs text-sm leading-relaxed text-[#5a4636]">
          Written only from {who}&apos;s own words. Every page keeps the recording it came from.
        </p>
      </div>
    );

    const out: Spread[] = [
      {
        key: "cover",
        label: "Cover",
        left: <StoryImage src={cover} fallback={coverFallback} className="h-full w-full object-cover" />,
        right: titlePage,
        single: (
          <div>
            <StoryImage src={cover} fallback={coverFallback} className="aspect-[4/3] w-full object-cover" />
            {titlePage}
          </div>
        ),
      },
    ];
    pages.forEach((p, i) => {
      const voice = voiceFor(p, turns);
      const words = (
        <div className="flex h-full flex-col px-7 py-8 sm:px-9">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">{text(p)}</div>
          {voice && (
            <div className="mt-4 border-t border-[#c9ad7f]/60 pt-3">
              <p className="mb-1.5 text-xs font-bold text-[#7a5a3a]">Hear {who} tell this part</p>
              <VoiceClip clipId={voice.clipId} audioPath={voice.audioPath} durationMs={voice.durationMs} label={`Hear ${who} tell this part`} tone="paper" />
            </div>
          )}
          <p className="mt-3 text-center text-xs text-[#7a5a3a]">{i + 1}</p>
        </div>
      );
      out.push({
        key: `p${i}`,
        label: `Page ${i + 1} of ${pages.length}`,
        left: <StoryImage src={p.image} fallback={p.fallback} className="h-full w-full object-cover" />,
        right: words,
        single: (
          <div>
            <StoryImage src={p.image} fallback={p.fallback} className="aspect-[4/3] w-full object-cover" />
            {words}
          </div>
        ),
      });
    });
    out.push({
      key: "end",
      label: "The End",
      left: quotePage,
      right: endPage,
      single: (
        <div>
          {chapter.pullQuote && quotePage}
          {endPage}
        </div>
      ),
    });
    return out;
    // `text` depends on lang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored, pages, lang, who, date, quoteTurn]);

  const last = spreads.length - 1;
  const shown = turning ? turning.to : at;

  const go = useCallback(
    (to: number) => {
      if (turning || to < 0 || to > last || to === at) return;
      const dir: 1 | -1 = to > at ? 1 : -1;
      if (reduce || !wide) {
        setSlideDir(dir);
        setAt(to);
        return;
      }
      setTurning({ from: at, to, dir });
    },
    [at, last, reduce, turning, wide],
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

  const page = (content: ReactNode, side: "left" | "right") => (
    <div className={`relative h-full overflow-hidden ${side === "left" ? "rounded-l-[10px]" : "rounded-r-[10px]"} storybook-paper`}>
      {content}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 w-10 ${side === "left" ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r"} from-[rgba(60,35,15,0.28)] to-transparent`}
      />
    </div>
  );

  // During a turn the still pages underneath already show what the leaf will uncover.
  const base = turning
    ? { left: spreads[turning.dir > 0 ? turning.from : turning.to].left, right: spreads[turning.dir > 0 ? turning.to : turning.from].right }
    : { left: spreads[at].left, right: spreads[at].right };

  return (
    <section aria-roledescription="storybook" aria-label={chapter.title.en || chapter.title.ur} className="select-none">
      <div className="mb-5 flex justify-center">
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
        className="rounded-[22px] bg-[#3a2016] p-2.5 shadow-[0_40px_80px_-30px_rgba(5,5,20,0.9)]"
        onPointerDown={(e) => (swipe.current = e.clientX)}
        onPointerUp={(e) => {
          if (swipe.current === null) return;
          const dx = e.clientX - swipe.current;
          swipe.current = null;
          if (Math.abs(dx) > 50) go(at + (dx < 0 ? 1 : -1));
        }}
      >
        <div className="rounded-[16px] p-[6px]" style={AJRAK_BORDER}>
          {wide ? (
            <div className="relative grid h-[clamp(420px,calc(100svh-300px),640px)] grid-cols-2 [perspective:2200px]">
              {page(base.left, "left")}
              {page(base.right, "right")}
              {turning && (
                <motion.div
                  key={`${turning.from}-${turning.to}`}
                  className={`absolute inset-y-0 w-1/2 [transform-style:preserve-3d] ${turning.dir > 0 ? "right-0 origin-left" : "left-0 origin-right"}`}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: turning.dir > 0 ? -180 : 180 }}
                  transition={{ duration: TURN_S, ease: [0.45, 0.05, 0.25, 1] }}
                  onAnimationComplete={() => {
                    setAt(turning.to);
                    setTurning(null);
                  }}
                >
                  <div className="absolute inset-0 [backface-visibility:hidden]">
                    {page(turning.dir > 0 ? spreads[turning.from].right : spreads[turning.from].left, turning.dir > 0 ? "right" : "left")}
                  </div>
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    {page(turning.dir > 0 ? spreads[turning.to].left : spreads[turning.to].right, turning.dir > 0 ? "left" : "right")}
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="storybook-paper relative overflow-hidden rounded-[10px]">
              <AnimatePresence mode="wait" initial={false} custom={slideDir}>
                <motion.div
                  key={spreads[at].key}
                  custom={slideDir}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: slideDir * 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: slideDir * -60 }}
                  transition={{ duration: reduce ? 0.12 : 0.28 }}
                >
                  {spreads[at].single}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <nav aria-label="Pages" className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(at - 1)}
          disabled={shown === 0}
          className="glass-night inline-flex h-12 items-center gap-1.5 rounded-full px-5 font-bold text-moon hover:bg-white/15 disabled:opacity-40"
        >
          <ChevronLeft size={18} /> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-bold text-moon/80" aria-live="polite">
            {spreads[shown].label}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {spreads.map((s, i) => (
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
          <button
            type="button"
            onClick={() => go(0)}
            className="btn-lantern pixel-corners inline-flex h-12 items-center gap-1.5 px-5 font-extrabold"
          >
            <RotateCcw size={16} /> <span className="hidden sm:inline">Read again</span>
          </button>
        ) : (
          <button type="button" onClick={() => go(at + 1)} className="btn-lantern pixel-corners inline-flex h-12 items-center gap-1.5 px-5 font-extrabold">
            <span className="hidden sm:inline">{shown === 0 ? "Open the book" : "Next"}</span> <ChevronRight size={18} />
          </button>
        )}
      </nav>
    </section>
  );
}
