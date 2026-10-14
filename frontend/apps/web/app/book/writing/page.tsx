"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { AppBackdrop } from "@/components/app/AppBackdrop";
import { AppHeader } from "@/components/app/AppHeader";
import { BirdySays } from "@/components/app/SpeechBubble";
import { PixelLantern } from "@/components/effects/PixelLantern";
import { illustrate, writeChapter } from "@/lib/api";
import { elderLabel, getElder, loadBook, newId } from "@/lib/book-store";
import { getChapterForSession, getSession, saveChapter, voiceLength, type StoredChapter } from "@/lib/chapter-store";
import { THEMES } from "@/lib/themes";

type StepState = "waiting" | "working" | "done";
type Step = { label: string; state: StepState };

export default function WritingPage() {
  return (
    <Suspense>
      <Writing />
    </Suspense>
  );
}

/**
 * The agents at work, shown step by step. This is the "AI agent" moment
 * in the demo: listening back, writing only from the elder's words,
 * painting, and binding the chapter into the book.
 */
function Writing() {
  const params = useSearchParams();
  const router = useRouter();
  const started = useRef(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [who, setWho] = useState("them");
  const [doneId, setDoneId] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const sessionId = params.get("session");
    const session = getSession(sessionId);
    const elder = getElder(session?.elderId);
    const book = loadBook();
    if (!session || !elder || !book) {
      setFailed("We couldn't find that recording on this device.");
      return;
    }
    const existing = getChapterForSession(session.id);
    if (existing) {
      router.replace(`/book/chapter/${existing.id}`);
      return;
    }

    const name = elderLabel(elder);
    setWho(name);
    const labels = [
      `Listening back to ${name}`,
      `Writing the chapter, using only ${elder.name}'s words`,
      "Painting the picture",
      "Binding it into your family book",
    ];
    setSteps(labels.map((label) => ({ label, state: "waiting" })));
    const mark = (i: number, state: StepState) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, state } : x)));
    const say = (line: string) => setLog((l) => [...l, line]);
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      const answers = session.turns.filter((t) => t.role === "elder");
      mark(0, "working");
      await pause(700);
      say(`${answers.length} ${answers.length === 1 ? "answer" : "answers"}, ${voiceLength(session.turns)} of ${name}'s real voice.`);
      const heard = answers.filter((t) => t.text.trim()).length;
      if (heard < answers.length) say(`${answers.length - heard} answer${answers.length - heard === 1 ? "" : "s"} had no transcript yet. The voice is still saved.`);
      mark(0, "done");

      mark(1, "working");
      const written = await writeChapter(elder, session.theme, session.turns);
      say(
        written.source === "ai"
          ? `Every part of the chapter is linked to the answer it came from (${written.chapter.sourceTurns.length} answers used).`
          : "AI writer not connected yet, so this draft is the transcript, word for word. Nothing added.",
      );
      mark(1, "done");

      mark(2, "working");
      const seed = book.familyName.split("").reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 100000, 7);
      const art = await illustrate(written.chapter, seed);
      say(art.source === "ai" ? "Painted in the family book's style." : "Using the topic's painting until the illustrator is connected.");
      mark(2, "done");

      mark(3, "working");
      const themeInfo = THEMES.find((t) => t.id === session.theme) ?? THEMES[THEMES.length - 1];
      const stored: StoredChapter = {
        id: newId(),
        sessionId: session.id,
        elderId: elder.id,
        theme: session.theme,
        scene: themeInfo.scene,
        createdAt: new Date().toISOString(),
        chapter: written.chapter,
        turns: session.turns,
        imageUrl: art.imageUrl,
        draft: written.source !== "ai",
      };
      saveChapter(stored);
      await pause(500);
      mark(3, "done");
      say("Saved. Only your family can see it.");
      setDoneId(stored.id);
      setTimeout(() => router.push(`/book/chapter/${stored.id}`), 1600);
    })().catch(() => setFailed("Something went wrong while writing. The recording is safe; try again from your book."));
  }, [params, router]);

  return (
    <div className="relative min-h-[100svh]">
      <AppBackdrop />
      <AppHeader back={{ href: "/book", label: "Family book" }} />
      <main className="mx-auto max-w-2xl px-5 pb-20 pt-10">
        <BirdySays mood={doneId ? "happy" : "listening"}>
          {failed ?? (doneId ? `${who}'s chapter is ready.` : `Turning ${who}'s answers into a chapter.`)}
        </BirdySays>

        {!failed && (
          <section className="glass-night mt-6 rounded-[32px] p-6 sm:p-8">
            <ol className="space-y-4">
              {steps.map((s, i) => (
                <li key={s.label} className="flex items-center gap-4">
                  <span
                    className={`font-pixel grid h-10 w-10 shrink-0 place-items-center pixel-corners text-sm ${
                      s.state === "done" ? "bg-leaf text-moon" : s.state === "working" ? "bg-lantern text-ink" : "bg-white/10 text-moon/50"
                    }`}
                  >
                    {s.state === "done" ? <Check size={18} /> : s.state === "working" ? <PixelLantern size={22} /> : i + 1}
                  </span>
                  <span className={`text-lg ${s.state === "waiting" ? "text-moon/50" : "text-moon"}`}>{s.label}</span>
                </li>
              ))}
            </ol>

            {log.length > 0 && (
              <div className="mt-7 rounded-2xl bg-[#0c0d2e]/60 p-4">
                <p className="text-xs font-bold text-moon/50">What the agents did</p>
                <ul className="mt-2 space-y-1.5 text-sm text-moon/80">
                  {log.map((l, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-lantern">•</span>
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {doneId && (
              <Link href={`/book/chapter/${doneId}`} className="btn-lantern pixel-corners mt-7 inline-flex h-14 items-center px-7 font-extrabold">
                Open the chapter
              </Link>
            )}
          </section>
        )}

        {failed && (
          <Link href="/book" className="btn-lantern pixel-corners mt-6 inline-flex h-12 items-center px-6 font-extrabold">
            Back to the family book
          </Link>
        )}
      </main>
    </div>
  );
}
