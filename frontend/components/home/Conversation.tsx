"use client";

import { NotebookPen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Birdy, type BirdyMood } from "@/components/mascots/Birdy";
import { ChapterCard } from "@/components/stories/ChapterCard";
import { HERO_CHAPTER } from "@/lib/samples";

/*
 * A sample sitting with Dadi Zubaida, the teller of HERO_CHAPTER. Her lines
 * come from that chapter, so the chapter that appears at the end is made of
 * exactly what she "said". Written for the demo, and labelled as a sample.
 */
type Badge = { label: string; tone?: "gentle" | "done" };
type Line =
  | { beat: number; kind: "hudhud"; ur: string; en: string; gentle?: boolean }
  | { beat: number; kind: "dadi"; ur: string; en: string; seconds: string }
  | { beat: number; kind: "note"; badges: Badge[]; text: string }
  | { beat: number; kind: "chapter" };

const LINES: Line[] = [
  { beat: 0, kind: "hudhud", ur: "دادی، آپ بچپن میں کہاں رہتی تھیں؟", en: "Dadi, where did you live as a child?" },
  {
    beat: 1,
    kind: "dadi",
    ur: "ابا ریلوے میں تھے، اس لیے ہم ہمیشہ اسٹیشنوں کے پاس رہتے تھے۔",
    en: "Abba worked for the railway, so we always lived near stations.",
    seconds: "0:09",
  },
  { beat: 2, kind: "note", badges: [{ label: "Followed a detail" }], text: "She said “near stations”. I’ll ask what the station sounded like." },
  { beat: 2, kind: "hudhud", ur: "اسٹیشن کی آوازیں کیسی ہوتی تھیں؟", en: "What did the station sound like?" },
  {
    beat: 3,
    kind: "dadi",
    ur: "رات بھر سیٹیاں بجتی تھیں۔ پھر اُس اگست امی نے ہمارا سونا میرے کرتے کے دامن میں سی دیا۔ میں ساری رات چھوٹے بھائی کا ہاتھ پکڑے رہی۔",
    en: "Whistles, all night long. Then that August, Ammi sewed our gold into the hem of my kurta. I held my little brother’s hand the whole night.",
    seconds: "0:21",
  },
  {
    beat: 3,
    kind: "note",
    badges: [{ label: "Changed the topic" }, { label: "Gentle: a painful memory", tone: "gentle" }],
    text: "1947, and a long, frightening night. I won’t ask for more. I’ll offer something lighter.",
  },
  {
    beat: 3,
    kind: "hudhud",
    gentle: true,
    ur: "وہ بہت مشکل رات تھی۔ کیا ہم آپ کی امی کے باورچی خانے کی بات کریں؟",
    en: "That was a very hard night. Shall we talk about your Ammi’s kitchen instead?",
  },
  {
    beat: 4,
    kind: "note",
    badges: [{ label: "Handed to the story writer", tone: "done" }],
    text: "Story writer: only her words, nothing added. Illustrator: a quiet train at dusk.",
  },
  { beat: 4, kind: "chapter" },
];

const STEPS = [
  {
    kicker: "Hudhud asks",
    title: "One gentle question at a time",
    body: "Spoken aloud in Urdu and shown in big letters, with an English line for the grandchild. The elder never types or reads small text.",
  },
  {
    kicker: "She answers",
    title: "In her own voice",
    body: "She just talks. Her real recording is kept, and her words are written down exactly as she said them.",
  },
  {
    kicker: "He listens",
    title: "He follows the details she mentions",
    body: "Not a fixed list of questions: Hudhud picks up what she just said. His notebook shows why he asked.",
  },
  {
    kicker: "He’s gentle",
    title: "When a memory hurts, he slows down",
    body: "Loss, 1947, a frightening night: he says something kind and offers a lighter memory. He never pushes.",
  },
  {
    kicker: "Then he hands off",
    title: "A chapter appears",
    body: "The story writer uses only her words, the illustrator paints the scene, and her real voice stays beside the page.",
  },
];

/** Hudhud's face for each step; the double take on step 3 is him catching the detail. */
const MOODS: BirdyMood[] = ["idle", "listening", "idle", "gentle", "happy"];

/**
 * How it works, shown instead of told: a sample sitting, step by step.
 * Large screens: the steps scroll normally while the chat beside them stays
 * in view and grows with each step (a sticky panel, the page never stops
 * moving). Phones: each step carries its own snapshot of the chat.
 */
export function Conversation() {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLDivElement | null)[]>([]);

  // The step whose words are nearest the middle of the screen is the one the chat shows.
  // Measured on every scroll frame (five rects, cheap), so a fast flick or the nav's
  // "How it works" jump can't skip a step the way a crossing detector can.
  useEffect(() => {
    let frame = 0;
    const pick = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      steps.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - mid);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActive((a) => (a === best ? a : best));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(pick);
    };
    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="how" aria-labelledby="how-title" className="relative px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="reveal font-urdu text-2xl leading-[2] text-lantern-soft" lang="ur" dir="rtl" style={{ textAlign: "left" }}>
          ایک شام، ایک چائے، ایک باب
        </p>
        <h2 id="how-title" className="reveal font-display text-4xl font-semibold leading-tight text-moon sm:text-5xl">
          One evening, one cup of chai, one chapter.
        </h2>
        <p className="reveal mt-3 max-w-xl text-moon/70">A sample sitting with Dadi Zubaida, written for this demo.</p>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-12 lg:mt-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <ol>
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className={`flex flex-col justify-center py-8 transition-opacity duration-500 lg:min-h-[58vh] lg:py-0 ${
                  i === active ? "lg:opacity-100" : "lg:opacity-35"
                }`}
              >
                <div
                  ref={(el) => {
                    steps.current[i] = el;
                  }}
                >
                  <p className="font-pixel text-sm text-lantern">
                    {i + 1} · {s.kicker}
                  </p>
                  <h3 className="font-display mt-2 text-3xl leading-tight text-moon">{s.title}</h3>
                  <p className="mt-3 max-w-md text-lg leading-relaxed text-moon/80">{s.body}</p>
                </div>
                <div className="mt-6 lg:hidden">
                  <Chat beat={i} only />
                </div>
              </li>
            ))}
          </ol>
          <div className="hidden lg:block">
            <div className="sticky top-[12vh] py-[8vh]">
              <Chat beat={active} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The sitting up to `beat`. `only` shows just that step's lines (phones). */
function Chat({ beat, only = false }: { beat: number; only?: boolean }) {
  const lines = LINES.map((line, id) => ({ line, id })).filter(({ line }) => (only ? line.beat === beat : line.beat <= beat));
  // Keep the desktop panel a steady height: the newest lines, oldest dropping off the top.
  const shown = only ? lines : lines.slice(lines.at(-1)?.line.kind === "chapter" ? -2 : -4);

  return (
    <div className="glass-night rounded-[28px] p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-moon/10 pb-4">
        <Birdy mood={MOODS[beat]} size={60} surprise={beat === 2 ? 1 : 0} className="-my-2" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight text-moon">Hudhud</p>
          <p className="text-xs text-moon/55">with Dadi Zubaida · sample</p>
        </div>
        <ol className="flex gap-1.5" aria-label={`Step ${beat + 1} of ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <li key={i} className={`h-2 w-2 rounded-full ${i <= beat ? "bg-lantern" : "bg-moon/20"}`} />
          ))}
        </ol>
      </div>
      <div className={`mt-4 flex flex-col gap-3 ${only ? "" : "min-h-[30rem]"}`}>
        {shown.map(({ line, id }) => (
          <div key={id} className="motion-safe:animate-[msg-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both]">
            <Bubble line={line} latest={id === lines.at(-1)?.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Bubble({ line, latest }: { line: Line; latest: boolean }) {
  if (line.kind === "hudhud") {
    return (
      <div className={`mr-10 rounded-[20px] rounded-tl-md border px-4 py-3 ${line.gentle ? "border-terracotta/60 bg-terracotta/15" : "border-moon/10 bg-white/[0.07]"}`}>
        <p className="font-urdu text-xl leading-[2] text-moon" dir="rtl" lang="ur">
          {line.ur}
        </p>
        <p className="font-display text-sm italic text-moon/70">{line.en}</p>
      </div>
    );
  }
  if (line.kind === "dadi") {
    return (
      <div className="ml-10 rounded-[20px] rounded-tr-md border border-lantern/25 bg-lantern/10 px-4 py-3">
        <div className="mb-1 flex items-center gap-2 text-xs text-lantern-soft">
          <span className="font-bold">Dadi Zubaida</span>
          <Voice talking={latest} />
          <span className="font-pixel">{line.seconds}</span>
        </div>
        <p className="font-urdu text-xl leading-[2] text-moon" dir="rtl" lang="ur">
          {line.ur}
        </p>
        <p className="font-display text-sm italic text-moon/70">{line.en}</p>
      </div>
    );
  }
  if (line.kind === "note") {
    return (
      <div className="rounded-2xl border border-dashed border-moon/20 bg-[#0c0d2e]/50 px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-moon/60">
          <NotebookPen size={13} className="text-lantern-soft" aria-hidden /> Hudhud&apos;s notebook
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
          {line.badges.map((b) => (
            <span
              key={b.label}
              className={`rounded-full px-2 py-0.5 font-bold ${
                b.tone === "gentle" ? "bg-terracotta/30 text-moon" : b.tone === "done" ? "bg-leaf/40 text-moon" : "bg-white/10 text-moon/75"
              }`}
            >
              {b.label}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-sm leading-snug text-moon/85">{line.text}</p>
      </div>
    );
  }
  return <ChapterCard chapter={HERO_CHAPTER} compact className="mx-auto max-w-sm" />;
}

/** A little live waveform while her answer is the newest line, still otherwise. */
function Voice({ talking }: { talking: boolean }) {
  const heights = [40, 75, 55, 95, 60, 85, 45, 70, 50];
  return (
    <span className="flex h-3.5 items-center gap-[2px]" aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-[2px] origin-center rounded-full bg-lantern-soft ${talking ? "motion-safe:animate-[talk_0.9s_ease-in-out_infinite]" : ""}`}
          style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </span>
  );
}
