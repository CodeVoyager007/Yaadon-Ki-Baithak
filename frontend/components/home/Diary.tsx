"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AJRAK_BORDER } from "@/components/app/AppBackdrop";
import { SCENE_IMAGES } from "@/components/illustrations/SceneByName";
import { Birdy, type BirdyMood } from "@/components/mascots/Birdy";
import type { SampleChapter } from "@/lib/samples";

/*
 * Dadi Zubaida's book: write to it and it writes back. Her answers are a
 * sample written for this demo (the page says so); the real app records an
 * elder's voice and the story writer works only from her words.
 */
type Reply = {
  ur: string;
  en: string;
  note: string;
  title: string;
  scene: SampleChapter["scene"];
  gentle?: boolean;
};

const REPLIES: Record<"home" | "partition" | "kitchen", Reply> = {
  home: {
    ur: "ابا ریلوے میں تھے، اس لیے ہم ہمیشہ اسٹیشنوں کے پاس رہتے تھے۔ رات بھر سیٹیاں بجتی تھیں۔",
    en: "Abba worked for the railway, so we always lived near stations. Whistles, all night long.",
    note: "She said “near stations”. Next I’ll ask what the station sounded like.",
    title: "The last train from Ambala",
    scene: "train",
  },
  partition: {
    ur: "اُس اگست امی نے ہمارا سونا میرے کرتے کے دامن میں سی دیا۔ میں ساری رات چھوٹے بھائی کا ہاتھ پکڑے رہی۔",
    en: "That August, Ammi sewed our gold into the hem of my kurta. I held my little brother’s hand the whole night.",
    note: "A painful memory. I won’t push; next I’ll offer something lighter.",
    title: "The night of the gold hem",
    scene: "doorway",
    gentle: true,
  },
  kitchen: {
    ur: "جمعے کو امی آلو کی بھجیا بناتی تھیں۔ پوری گلی کو خوشبو سے پتا چل جاتا تھا۔",
    en: "On Fridays Ammi made aloo ki bhujia. The whole street knew from the smell.",
    note: "She remembers a smell. Next I’ll ask who came to eat.",
    title: "Friday bhujia",
    scene: "eid",
  },
};

const SUGGESTIONS = ["Dadi, where did you grow up?", "What happened in 1947?", "What did your Ammi cook?"];

/** Which of Dadi's memories a question reaches, in English, Roman Urdu or Urdu. */
function replyFor(question: string): Reply {
  if (/1947|۱۹۴۷|partition|august|hijrat|ہجرت|تقسیم|بٹوارہ/i.test(question)) return REPLIES.partition;
  if (/cook|food|kitchen|eat|recipe|khana|ammi|امی|کھانا|پکا/i.test(question)) return REPLIES.kitchen;
  return REPLIES.home;
}

type Phase = "blank" | "writing" | "sinking" | "answering" | "done";

const QUESTION_MS = 45; // per letter of the question
const SINK_MS = 1100;
const URDU_WORD_MS = 120;
const ENGLISH_LETTER_MS = 22;

/**
 * The hero's showpiece, inspired by a diary that writes back: the visitor's
 * question writes itself in ink, sinks into the page, and Dadi's answer
 * writes back in Nastaliq and handwriting while her painting bleeds up
 * through the opposite page. It runs on its own clock, never on scroll, so
 * the page around it scrolls normally. Screen readers get the plain text;
 * reduced motion shows the finished pages at once.
 */
export function Diary() {
  const reduce = useReducedMotion();
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const [phase, setPhase] = useState<Phase>("blank");
  const [draft, setDraft] = useState("");
  const [take, setTake] = useState(0);
  const timers = useRef<number[]>([]);
  const touched = useRef(false);
  const book = useRef<HTMLDivElement>(null);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const after = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  function ask(text: string) {
    const q = text.trim().slice(0, 80);
    if (!q) return;
    clear();
    const r = replyFor(q);
    setQuestion(q);
    setReply(r);
    if (reduce) {
      setPhase("done");
      return;
    }
    setPhase("writing");
    const written = Math.min(q.length * QUESTION_MS, 1800) + 700;
    after(written, () => setPhase("sinking"));
    after(written + SINK_MS + 500, () => {
      setPhase("answering");
      setTake((t) => t + 1);
    });
    const answered = r.ur.split(" ").length * URDU_WORD_MS + r.en.length * ENGLISH_LETTER_MS + 600;
    after(written + SINK_MS + 500 + answered, () => setPhase("done"));
  }

  // If nobody writes, the book asks the first question itself once it's in view.
  useEffect(() => {
    const el = book.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || touched.current) return;
        touched.current = true;
        io.disconnect();
        timers.current.push(window.setTimeout(() => ask(SUGGESTIONS[0]), 1400));
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    touched.current = true;
    ask(draft);
    setDraft("");
  }

  const answering = phase === "answering" || phase === "done";
  const mood: BirdyMood = phase === "writing" ? "listening" : reply?.gentle && answering ? "gentle" : phase === "done" ? "happy" : "idle";

  return (
    <section aria-labelledby="diary-title" className="relative mx-auto w-full max-w-[34rem]">
      <h2 id="diary-title" className="sr-only">
        Talk to Dadi Zubaida&apos;s book
      </h2>

      <div aria-hidden className="absolute left-1/2 top-[38%] h-72 w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lantern/25 blur-3xl" />
      <div ref={book} className="relative rounded-[22px] bg-[#3a2016] p-2.5 shadow-[0_40px_80px_-30px_rgba(5,5,20,0.9)]">
        <div className="rounded-[16px] p-[6px]" style={AJRAK_BORDER}>
          <div className="diary-pages relative grid overflow-hidden rounded-[11px] sm:grid-cols-2">
            {/* left page: the memory bleeds through */}
            <div className="relative min-h-44 border-b border-[#c9ad7f]/60 p-4 sm:min-h-[22rem] sm:border-b-0 sm:border-r">
              {reply && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={reply.title}
                  src={SCENE_IMAGES[reply.scene].src}
                  alt=""
                  className={`diary-memory absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] rounded-md object-cover ${answering ? "is-shown" : ""}`}
                />
              )}
              {phase === "done" && reply && (
                <p className="diary-caption absolute inset-x-5 bottom-5 rounded-md bg-[#2a1a10]/70 px-3 py-1.5 font-display text-sm italic text-[#fbf3e4]">
                  {reply.title}
                </p>
              )}
              {!reply && <p className="font-hand pt-10 text-center text-2xl text-[#7a5a3a]/60">a memory waits here</p>}
            </div>

            {/* right page: where the ink writes */}
            <div className="diary-lines relative min-h-[17rem] p-5 sm:min-h-[22rem]">
              <p className="font-hand text-sm text-[#7a5a3a]/70">Dadi Zubaida&apos;s book · sample</p>

              {question && phase !== "answering" && phase !== "done" && (
                <p aria-hidden className={`font-hand mt-4 text-[1.65rem] leading-snug text-[#24160e] ${phase === "sinking" ? "ink-sink" : ""}`}>
                  {[...question].map((ch, i) => (
                    <span key={i} className="ink-letter" style={{ animationDelay: `${i * QUESTION_MS}ms` }}>
                      {ch}
                    </span>
                  ))}
                </p>
              )}

              {reply && answering && (
                <div aria-hidden className={reply.gentle ? "ink-gentle" : ""}>
                  <p className="font-urdu mt-3 text-xl leading-[2.2] text-[#24160e]" dir="rtl" lang="ur">
                    {reply.ur.split(" ").map((w, i) => (
                      <span key={i} className="ink-word" style={{ animationDelay: `${i * URDU_WORD_MS}ms` }}>
                        {w}{" "}
                      </span>
                    ))}
                  </p>
                  <p className="font-hand mt-1 text-[1.35rem] leading-snug text-[#3b2a20]">
                    {[...reply.en].map((ch, i) => (
                      <span
                        key={i}
                        className="ink-letter"
                        style={{ animationDelay: `${reply.ur.split(" ").length * URDU_WORD_MS + i * ENGLISH_LETTER_MS}ms` }}
                      >
                        {ch}
                      </span>
                    ))}
                  </p>
                  {phase === "done" && (
                    <p className="diary-note font-hand mt-3 border-l-2 border-[#9e2b25]/50 pl-2 text-lg leading-tight text-[#9e2b25]">
                      Hudhud: {reply.note}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-10 -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(60,35,15,0.25),transparent)] sm:block" />
          </div>
        </div>

        <div className="absolute -top-14 right-6">
          <Birdy mood={mood} size={76} surprise={take} title="Hudhud" />
        </div>
      </div>

      {/* what a screen reader hears, in order, without the letter-by-letter effect */}
      <div className="sr-only" aria-live="polite">
        {question && `You wrote: ${/[.?!؟]$/.test(question) ? question : `${question}.`}`} {reply && answering && `Dadi wrote back: ${reply.en} Hudhud noted: ${reply.note}`}
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex gap-2">
        <label htmlFor="diary-question" className="sr-only">
          Write a question to Dadi&apos;s book
        </label>
        <input
          id="diary-question"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={80}
          placeholder="Write to the book…"
          autoComplete="off"
          className="font-hand h-12 min-w-0 flex-1 rounded-2xl border border-moon/20 bg-[#0c0d2e]/50 px-4 text-xl text-moon placeholder:text-moon/45 focus:border-lantern focus:outline-none"
        />
        <button type="submit" className="btn-lantern pixel-corners h-12 shrink-0 px-5 font-extrabold">
          Write
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              touched.current = true;
              ask(s);
            }}
            className="rounded-full border border-moon/25 bg-[#12133a]/85 px-3 py-1.5 text-sm text-moon/90 hover:border-lantern/60 hover:text-moon"
          >
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}
