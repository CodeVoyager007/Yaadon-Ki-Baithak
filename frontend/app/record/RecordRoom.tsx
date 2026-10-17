"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, SkipForward, Square } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { PixelLantern } from "@/components/effects/PixelLantern";
import { Birdy } from "@/components/mascots/Birdy";
import { Diya } from "@/components/mascots/Diya";
import { NightSky } from "@/components/scene/NightSky";
import { SoundToggle } from "@/components/sound/SoundToggle";
import { ThinkingPanel, type Thought } from "@/components/app/ThinkingPanel";
import { useSound } from "@/components/sound/SoundProvider";
import { askNext, speak, stopSpeaking, transcribe } from "@/lib/api";
import { putClip } from "@/lib/audio-store";
import { elderLabel, loadBook, newId, updateElder, type Elder, type FamilyBook, type Theme } from "@/lib/book-store";
import { listChapters, saveSession, type Session, type Turn } from "@/lib/chapter-store";
import { THEMES } from "@/lib/themes";
import { useRecorder } from "@/lib/use-recorder";

type Phase = "loading" | "consent" | "session" | "done";
type Question = { ur: string; en: string };

/**
 * Elder mode. Big type, one question at a time, one giant lamp to press.
 *
 * With a family book: asks for consent once, then records every answer in
 * the elder's real voice, sends it to the interviewer agent and reads the
 * next question aloud. "Stop for today" hands the session to the writer.
 * Without a book it's a practice run: nothing is saved.
 */
export function RecordRoom() {
  const params = useSearchParams();
  const router = useRouter();
  const { chirp } = useSound();

  const [book, setBook] = useState<FamilyBook | null>(null);
  const [elder, setElder] = useState<Elder | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    const b = loadBook();
    const e = b ? (b.elders.find((x) => x.id === params.get("elder")) ?? b.elders[0] ?? null) : null;
    setBook(b);
    setElder(e);
    setPhase(e && !e.consentAt ? "consent" : "session");
  }, [params]);

  const live = Boolean(book && elder);
  const theme: Theme = useMemo(() => {
    const asked = THEMES.find((t) => t.id === params.get("theme"));
    if (asked) return asked.id;
    if (book && elder && listChapters(elder.id).length === 0) return book.theme;
    return "Free talk";
  }, [params, book, elder]);
  const themeInfo = THEMES.find((t) => t.id === theme) ?? THEMES[THEMES.length - 1];
  const lang: "ur" | "en" = elder?.language === "English" ? "en" : "ur";
  const who = elder ? elderLabel(elder) : "you";

  const rec = useRecorder(lang);
  const [question, setQuestion] = useState<Question>(themeInfo.firstQuestion);
  const [thinking, setThinking] = useState(false);
  /** The interviewer flagged the last answer as painful: Hudhud stays gentle until the next answer starts. */
  const [gentle, setGentle] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  /** Every decision this sitting, for Hudhud's notebook. */
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const session = useRef<Session | null>(null);

  useEffect(() => setQuestion(themeInfo.firstQuestion), [themeInfo]);

  function ensureSession() {
    if (session.current) return session.current;
    session.current = {
      id: newId(),
      elderId: (elder ?? practiceElder).id,
      theme,
      startedAt: new Date().toISOString(),
      turns: [{ index: 0, role: "birdy", text: question[lang], lang, at: new Date().toISOString() }],
    };
    return session.current;
  }

  function addTurn(turn: Omit<Turn, "index">) {
    const s = ensureSession();
    if (!s) return;
    s.turns.push({ ...turn, index: s.turns.length });
    if (live) saveSession(s); // saved after every turn, so nothing is lost if the tab closes
  }

  const answers = live ? (session.current?.turns.filter((t) => t.role === "elder").length ?? 0) : 0;

  function giveConsent() {
    if (!elder) return;
    const consentAt = new Date().toISOString();
    updateElder(elder.id, { consentAt });
    setElder({ ...elder, consentAt });
    chirp();
    setPhase("session");
    void speak(question[lang], lang);
  }

  async function nextQuestion(skipped: boolean) {
    setThinking(true);
    const turns = session.current?.turns ?? [];
    const { decision, source } = live && elder ? await askNext(elder, theme, turns, skipped) : await askNext(practiceElder, theme, turns, skipped);
    setNote(source === "stand-in" ? "Practice question for now — the AI interviewer isn't available right now." : null);
    const q = decision.question;
    setThoughts((list) => [...list, { id: newId(), decision, source }]);
    addTurn({ role: "birdy", text: q[lang], lang, at: new Date().toISOString() });
    setThinking(false);
    if (decision.action === "wrap_up") {
      void speak(q[lang], lang);
      finish();
      return;
    }
    setQuestion(q);
    setGentle(decision.mood === "sensitive");
    chirp();
    void speak(q[lang], lang);
  }

  async function toggleLamp() {
    if (thinking) return;
    if (rec.status !== "recording") {
      stopSpeaking();
      chirp();
      ensureSession();
      await rec.start();
      return;
    }
    const take = await rec.stop();
    if (!take) return;
    if (live) {
      setThinking(true);
      const clipId = newId();
      await putClip(clipId, take.blob).catch(() => {});
      // The route also keeps the real voice in the family's private bucket
      // and hands back its path, which reaches the database with the turn.
      const { text, audioPath } = await transcribe(take.blob, lang, take.caption, session.current?.id);
      addTurn({ role: "elder", text, lang, clipId, audioPath, durationMs: take.durationMs, at: new Date().toISOString() });
    } else {
      addTurn({ role: "elder", text: "", lang, at: new Date().toISOString() }); // practice: counted, never saved
    }
    await nextQuestion(false);
  }

  async function skip() {
    if (rec.status === "recording") await rec.stop();
    await nextQuestion(true);
  }

  async function finish() {
    if (rec.status === "recording") {
      await toggleLamp();
      return;
    }
    stopSpeaking();
    const s = session.current;
    if (live && s && s.turns.some((t) => t.role === "elder")) {
      s.endedAt = new Date().toISOString();
      saveSession(s);
    }
    setPhase("done");
  }

  const recording = rec.status === "recording";

  return (
    <div className="relative min-h-[100svh] overflow-hidden text-moon">
      <NightSky full={false} skyline="dim" />
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 pt-7">
        <Wordmark tone="night" href={live ? "/book" : "/"} />
        <SoundToggle tone="night" />
      </header>

      <main className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 pb-16 pt-8 text-center">
        {phase === "loading" && <PixelLantern size={56} className="mt-24" />}

        {phase === "consent" && elder && (
          <div className="glass-night mt-6 flex max-w-xl flex-col items-center gap-5 rounded-[32px] px-7 py-10 sm:px-10">
            <Birdy mood="happy" size={110} />
            <p className="font-urdu text-2xl leading-[2.1] text-lantern-soft sm:text-4xl sm:leading-[2.1]" dir="rtl" lang="ur">
              آپ کی آواز ریکارڈ ہوگی اور صرف آپ کے گھر والوں کے لیے محفوظ رہے گی۔ آپ جب چاہیں رک سکتے ہیں۔
            </p>
            <p className="font-display text-xl leading-snug sm:text-2xl">
              Your voice will be recorded and kept only for your family. You can stop any time.
            </p>
            <p className="max-w-md text-sm text-moon/65">
              Nothing is shared unless your family chooses to share it, and they can delete any recording.
            </p>
            <div className="mt-2 grid w-full gap-3 sm:grid-cols-2">
              <button type="button" onClick={giveConsent} className="btn-lantern pixel-corners flex min-h-[72px] flex-col items-center justify-center px-5 py-2">
                <span className="font-urdu text-xl leading-[1.8]" dir="rtl" lang="ur">جی ہاں، شروع کریں</span>
                <span className="text-sm font-extrabold">Yes, let&apos;s begin</span>
              </button>
              <Link href="/book" className="glass-night flex min-h-[72px] flex-col items-center justify-center rounded-[20px] px-5 py-2 hover:bg-white/15">
                <span className="font-urdu text-xl leading-[1.8]" dir="rtl" lang="ur">ابھی نہیں</span>
                <span className="text-sm font-bold text-moon/80">Not now</span>
              </Link>
            </div>
          </div>
        )}

        {phase === "session" && (
          <>
            <div className="flex items-end gap-3 self-start sm:self-center">
              <Birdy mood={recording ? "listening" : gentle ? "gentle" : "idle"} size={92} />
              <div className="glass-night mb-5 rounded-[22px] rounded-bl-md px-5 py-3 text-left">
                <p className="text-sm text-moon/70">
                  {live ? `${who}, ${theme}` : theme}
                  {live && answers > 0 && <span className="font-pixel ml-2 text-lantern-soft">{answers} saved</span>}
                </p>
              </div>
            </div>

            <p className="font-urdu mt-6 text-4xl leading-[2.1] text-moon sm:text-5xl sm:leading-[2.1]" dir="rtl" lang="ur" aria-live="polite">
              {question.ur}
            </p>
            <p className="font-display mt-1 text-xl text-moon/75 sm:text-2xl">{question.en}</p>

            <button
              type="button"
              onClick={toggleLamp}
              disabled={thinking}
              aria-pressed={recording}
              aria-label={recording ? "Stop this answer" : "Start talking"}
              className="group relative mt-10 grid h-56 w-56 place-items-center rounded-full focus-visible:outline-4 focus-visible:outline-lantern disabled:cursor-wait sm:h-64 sm:w-64"
            >
              <span
                className="absolute inset-0 rounded-full bg-lantern/25 blur-2xl transition-transform duration-150"
                style={{ transform: `scale(${recording ? 0.9 + rec.level * 0.8 : 0.7})` }}
              />
              <span className="glass-night absolute inset-3 rounded-full" />
              {thinking ? <PixelLantern size={72} className="relative" /> : <Diya lit={recording} level={rec.level} size={150} className="relative" />}
            </button>
            <p className="mt-4 text-lg font-bold" aria-live="polite">
              {thinking
                ? "Hudhud is thinking of the next question"
                : rec.status === "asking"
                  ? "Allow the microphone to begin"
                  : recording
                    ? "Hudhud is listening. Tap the lamp when you finish."
                    : "Tap the lamp and start talking"}
            </p>
            {recording && rec.caption && (
              <p className="mt-2 max-w-lg text-moon/70" dir="auto">
                {rec.caption}
              </p>
            )}

            {(rec.status === "denied" || rec.status === "unsupported") && (
              <p className="glass-night mt-4 max-w-md rounded-2xl px-5 py-3 text-moon/90">
                {rec.status === "denied"
                  ? "The microphone is blocked. Click the lock icon next to the address bar, allow the microphone, then tap the lamp again."
                  : "This browser can't record audio. Try Chrome or Edge on a phone or laptop."}
              </p>
            )}

            <div className="mt-10 grid w-full max-w-lg grid-cols-3 gap-3">
              <ElderAction onClick={() => void speak(question[lang], lang)} icon={<RotateCcw size={26} />} ur="دوبارہ" en="Repeat" />
              <ElderAction onClick={skip} disabled={thinking} icon={<SkipForward size={26} />} ur="اگلا سوال" en="Skip" />
              <ElderAction onClick={finish} disabled={thinking} icon={<Square size={22} />} ur="آج کے لیے بس" en="Stop for today" />
            </div>

            <ThinkingPanel thoughts={thoughts} />

            {note && <p className="mt-6 text-xs text-moon/45">{note}</p>}
            {!live && (
              <p className="mt-6 max-w-md text-sm text-moon/60">
                Practice mode. Nothing is recorded or sent anywhere.{" "}
                <Link href="/signup?mode=signin" className="font-bold text-lantern-soft underline underline-offset-4">
                  Sign in
                </Link>{" "}
                to save stories to your family book.
              </p>
            )}
          </>
        )}

        {phase === "done" && (
          <div className="glass-night mt-10 flex flex-col items-center gap-4 rounded-[32px] px-8 py-12">
            <Birdy mood="happy" size={120} />
            <p className="font-urdu text-3xl leading-[2] text-lantern-soft" dir="rtl" lang="ur">
              بہت شکریہ، آج کے لیے اتنا کافی ہے
            </p>
            <p className="font-display text-2xl">Thank you. That&apos;s enough for today.</p>
            {live && answers > 0 && session.current ? (
              <>
                <p className="max-w-sm text-moon/70">
                  {answers} {answers === 1 ? "answer" : "answers"} saved in {who}&apos;s own voice. Hudhud can turn them into a chapter now.
                </p>
                <button
                  type="button"
                  onClick={() => router.push(`/book/writing?session=${session.current!.id}`)}
                  className="btn-lantern pixel-corners mt-2 inline-flex h-14 items-center px-7 font-extrabold"
                >
                  Make the chapter
                </button>
              </>
            ) : live ? (
              <Link href="/book" className="btn-lantern pixel-corners mt-2 inline-flex h-12 items-center px-6 font-extrabold">
                Back to the family book
              </Link>
            ) : (
              <>
                <p className="max-w-sm text-moon/70">This was a practice run, so nothing was saved. Sign in to keep the next one in your family book.</p>
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  <Link href="/signup" className="btn-lantern pixel-corners inline-flex h-12 items-center px-6 font-extrabold">
                    Start your family book
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      session.current = null;
                      setQuestion(themeInfo.firstQuestion);
                      setThoughts([]);
                      setPhase("session");
                    }}
                    className="h-12 rounded-2xl px-5 font-bold text-moon/80 hover:text-moon">
                    Practice again
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/** Used to ask questions in practice mode, where there is no real elder yet. */
const practiceElder: Elder = { id: "practice", name: "Practice", relation: "Other", language: "Urdu" };

function ElderAction({ onClick, icon, ur, en, disabled }: { onClick: () => void; icon: React.ReactNode; ur: string; en: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="glass-night flex min-h-[112px] flex-col items-center justify-center gap-1.5 rounded-[24px] px-2 py-3 hover:bg-white/15 disabled:opacity-50"
    >
      <span className="text-lantern-soft">{icon}</span>
      <span className="font-urdu text-lg leading-[1.9]" dir="rtl" lang="ur">
        {ur}
      </span>
      <span className="text-sm font-bold text-moon/80">{en}</span>
    </button>
  );
}
