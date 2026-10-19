"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { AppBackdrop } from "@/components/app/AppBackdrop";
import { AppHeader } from "@/components/app/AppHeader";
import { BookNav } from "@/components/app/BookNav";
import { BirdySays } from "@/components/app/SpeechBubble";
import { PixelLantern } from "@/components/effects/PixelLantern";
import { illustrateOnly, writeAndIllustrate } from "@/lib/api";
import { bookPages } from "@/lib/book-pages";
import { keepImage } from "@/lib/image-store";
import { elderLabel, getElder, loadBook, newId } from "@/lib/book-store";
import { getChapterForSession, getSession, saveChapter, voiceLength, type StoredChapter } from "@/lib/chapter-store";
import { THEMES } from "@/lib/themes";

const AGENT_LABEL = { story_writer: "Story writer", illustrator: "Illustrator" } as const;

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
 * painting every page, and putting the storybook on the family's shelf.
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
      `Writing the storybook, using only ${elder.name}'s words`,
      "Painting every page",
      "Binding it into your family's bookshelf",
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

      // One call: the backend's orchestrator hands the session to the story
      // writer, then passes the writer's scene to the illustrator.
      mark(1, "working");
      const seed = book.familyName.split("").reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 100000, 7);
      const written = await writeAndIllustrate(elder, session.theme, session.turns, seed);
      say(
        written.source === "ai"
          ? `Every part of the chapter is linked to the answer it came from (${written.chapter.sourceTurns.length} answers used).`
          : "The AI writer isn't available right now, so this draft is the transcript, word for word. Nothing added.",
      );
      // The orchestrator's own record of who did what, and how long it took.
      for (const step of written.trace) {
        if (step.agent === "story_writer" || step.agent === "illustrator") {
          say(`${AGENT_LABEL[step.agent]}: ${step.outcome}${step.detail ? `. ${step.detail}` : ""} (${(step.ms / 1000).toFixed(1)} s)`);
        }
      }
      mark(1, "done");

      mark(2, "working");
      let paintedUrls = written.pageImages;
      let coverUrl = written.imageUrl;
      if (written.source !== "ai") {
        // The writer was out, but the painter needn't be: paint the draft from its theme's scenes.
        // Only the scenes and title go to the painter, never the elder's words.
        const art = await illustrateOnly(written.chapter, seed);
        paintedUrls = art.pageImages ?? [];
        coverUrl = art.imageUrl ?? undefined;
      } else {
        await pause(400);
      }
      const pageCount = written.chapter.pages?.length ?? 0;
      const painted = paintedUrls.filter(Boolean).length;
      say(
        painted
          ? `${painted} of ${pageCount} pages painted in the family book's style.`
          : "Using themed paintings for now — the illustrator isn't available.",
      );
      // Paintings made without cloud storage are kept in this browser's image store, not localStorage.
      const pageImages = await Promise.all(paintedUrls.map((u) => keepImage(u)));
      const cover = (await keepImage(coverUrl)) ?? pageImages.find(Boolean) ?? undefined;
      mark(2, "done");

      // Another tab may have finished this same recording while we were writing.
      const already = getChapterForSession(session.id);
      if (already) {
        router.replace(`/book/chapter/${already.id}`);
        return;
      }

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
        imageUrl: cover,
        pageImages,
        draft: written.source !== "ai",
      };
      saveChapter(stored);
      await pause(500);
      mark(3, "done");
      say(`A ${bookPages(stored).length}-page storybook is on your shelf. Only your family can see it.`);
      setDoneId(stored.id);
      setTimeout(() => router.push(`/book/chapter/${stored.id}`), 1600);
    })().catch(() => setFailed("Something went wrong while writing. The recording is safe; try again from your book."));
  }, [params, router]);

  return (
    <div className="relative min-h-[100svh]">
      <AppBackdrop />
      <AppHeader back={{ href: "/book", label: "Family book" }} />
      <main className="mx-auto max-w-2xl px-5 pb-20 pt-10">
        <BirdySays mood={doneId ? "happy" : "listening"} as="h1">
          {failed ?? (doneId ? `${who}'s storybook is ready.` : `Turning ${who}'s story into a storybook.`)}
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
                Open the storybook
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
      <BookNav />
    </div>
  );
}
