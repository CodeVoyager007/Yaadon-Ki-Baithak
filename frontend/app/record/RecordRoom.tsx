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
import { syncBook } from "@/lib/data/sync";
import { hasSupabase } from "@/lib/supabase/client";
import { THEMES } from "@/lib/themes";
import { useRecorder } from "@/lib/use-recorder";

type Phase = "loading" | "consent" | "session" | "done" | "not-found";
/** First the elder tells the whole story; then Hudhud asks only about what's unclear. */
type Stage = "telling" | "clarifying";
type Question = { ur: string; en: string };

/** One story part can run this long before it is saved and a new part begins. */
const MAX_PART_MS = 10 * 60 * 1000;

/** The theme's opening, turned into an invitation to tell the whole story. */
function invitation(q: Question): Question {
  return {
    ur: `${q.ur} پوری کہانی اپنے الفاظ میں سنائیے، آرام سے۔ میں بیچ میں نہیں ٹوکوں گا۔`,
    en: `${q.en} Tell the whole story in your own words, and take your time. I won't interrupt.`,
  };
}

/**
 * Elder mode. Big type, one giant lamp to press.
 *
 * With a family book: asks for consent once, then the elder tells the whole
 * story in their real voice, in as many parts as they like, without being
 * interrupted. When they say that's the story, Hudhud reads it and asks only
 * about what a grandchild couldn't follow, a few questions at most, then the
 * session goes to the writer. Without a book it's a practice run: nothing is saved.
 */
export function RecordRoom() {
  const params = useSearchParams();
  const router = useRouter();
  const { chirp } = useSound();

  const [book, setBook] = useState<FamilyBook | null>(null);
  const [elder, setElder] = useState<Elder | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    let live = true;
    void (async () => {
      // With accounts, the book on this device opens only for its signed-in owner; anyone else practises.
      const userId = hasSupabase ? await syncBook() : null;
      if (!live) return;
      const saved = loadBook();
      const b = hasSupabase && (!userId || (saved?.ownerId && saved.ownerId !== userId)) ? null : saved;
      const elderParam = params.get("elder");
      const e = b ? (b.elders.find((x) => x.id === elderParam) ?? (elderParam ? null : b.elders[0] ?? null)) : null;
      setBook(b);
      setElder(e);
      if (elderParam && !e) {
        setPhase("not-found");
      } else {
        setPhase(e && !e.consentAt ? "consent" : "session");
      }
    })();
    return () => {
      live = false;
    };
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
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [stage, setStage] = useState<Stage>("telling");
  /** How many recordings were the story itself; everything after is a clarification. */
  const storyTurns = useRef(0);
  const [storyParts, setStoryParts] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");
  /** Every decision this sitting, for Hudhud's notebook. */
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const session = useRef<Session | null>(null);

  useEffect(() => setQuestion(themeInfo.firstQuestion), [themeInfo]);

  useEffect(() => {
    if (phase === "consent") {
      const notice =
        lang === "ur"
          ? "یہ سروس گوگل کے مفت اے آئی پر چلتی ہے، اور گوگل اپنی مصنوعات کو بہتر بنانے کے لیے یہ ریکارڈنگز استعمال کر سکتا ہے۔"
          : "This service uses Google's free AI, and Google may use recordings to improve its products.";
      void speak(notice, lang);
    }
  }, [phase, lang]);

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

  const consentTimer = useRef(0);
  const consentDone = useRef(false);

  /** Saves the consent (with the spoken "haan" if it was recorded) and opens the session. Runs once. */
  async function finishConsent(recorded: boolean) {
    if (!elder || consentDone.current) return;
    consentDone.current = true;
    window.clearTimeout(consentTimer.current);
    const take = recorded ? await rec.stop() : null;
    const consentAt = new Date().toISOString();
    let consentClipId: string | undefined;
    if (take?.blob) {
      consentClipId = newId();
      await putClip(consentClipId, take.blob).catch(() => {});
    }
    updateElder(elder.id, { consentAt, consentClipId });
    setElder({ ...elder, consentAt, consentClipId });
    setRecordingConsent(false);
    chirp();
    setPhase("session");
    void speak(invitation(question)[lang], lang);
  }

  async function giveConsent() {
    if (!elder || consentDone.current) return;
    if (recordingConsent) {
      await finishConsent(true);
      return;
    }
    stopSpeaking(); // don't record Hudhud's own notice as the consent
    setRecordingConsent(true);
    const started = await rec.start();
    if (!started) {
      await finishConsent(false);
      return;
    }
    consentTimer.current = window.setTimeout(() => void finishConsent(true), 3500);
  }

  useEffect(
    () => () => {
      window.clearTimeout(consentTimer.current);
      stopSpeaking();
    },
    [],
  );

  async function nextQuestion(skipped: boolean) {
    setThinking(true);
    try {
      const turns = session.current?.turns ?? [];
      const turnMode = { mode: "clarify" as const, storyTurns: storyTurns.current };
      const { decision, source } = await askNext(live && elder ? elder : practiceElder, theme, turns, skipped, turnMode);
      setNote(source === "stand-in" ? "Practice question for now — the AI interviewer isn't available right now." : null);
      const q = decision.question;
      setThoughts((list) => [...list, { id: newId(), decision, source }]);
      addTurn({ role: "birdy", text: q[lang], lang, at: new Date().toISOString() });
      if (decision.action === "wrap_up") {
        void speak(q[lang], lang);
        finish();
        return;
      }
      setQuestion(q);
      setGentle(decision.mood === "sensitive");
      chirp();
      void speak(q[lang], lang);
    } catch (err) {
      console.error("Failed to load next question:", err);
    } finally {
      setThinking(false);
    }
  }

  /** Stops the recording and keeps it: the real voice, then its transcript. */
  async function saveAnswer() {
    const take = await rec.stop();
    if (!take) return false;
    if (live) {
      setThinking(true);
      try {
        const clipId = newId();
        await putClip(clipId, take.blob).catch(() => {});
        // The route also keeps the real voice in the family's private bucket
        // and hands back its path, which reaches the database with the turn.
        const { text, audioPath } = await transcribe(take.blob, lang, take.caption, session.current?.id);
        addTurn({ role: "elder", text, lang, clipId, audioPath, durationMs: take.durationMs, at: new Date().toISOString() });
        setNote(text.trim() ? null : "Hudhud couldn't make out the words in that recording. The voice is saved; try speaking a little closer to the phone.");
      } finally {
        setThinking(false);
      }
    } else {
      addTurn({ role: "elder", text: "", lang, at: new Date().toISOString() }); // practice: counted, never saved
    }
    return true;
  }

  /** A part of the story is in: nothing interrupts, the elder can go on or say that's the story. */
  function countStoryPart() {
    storyTurns.current += 1;
    setStoryParts(storyTurns.current);
    chirp();
  }

  /** "That's my story": Hudhud reads all of it and asks about what's unclear, if anything. */
  async function finishStory() {
    if (thinking) return;
    try {
      if (rec.status === "recording" && (await saveAnswer())) countStoryPart();
      if (storyTurns.current === 0) {
        setNote("Tap the lamp and tell the story first. Hudhud will listen to all of it.");
        return;
      }
      stopSpeaking();
      setStage("clarifying");
      await nextQuestion(false);
    } catch (err) {
      console.error("Error finishing the story:", err);
      setThinking(false);
    }
  }

  async function toggleLamp() {
    if (thinking || rec.status === "asking") return;
    try {
      if (rec.status !== "recording") {
        stopSpeaking();
        chirp();
        ensureSession();
        await rec.start();
        return;
      }
      if (!(await saveAnswer())) return;
      if (stage === "telling") countStoryPart();
      else await nextQuestion(false);
    } catch (err) {
      console.error("Error in toggleLamp:", err);
      setThinking(false);
    }
  }

  // A very long part is saved on its own, so one recording never grows past what can be sent.
  useEffect(() => {
    if (rec.status !== "recording") return;
    const t = window.setTimeout(() => void toggleLamp(), MAX_PART_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.status]);

  async function saveTyped() {
    const text = typedAnswer.trim();
    if (!text || thinking) return;
    setTypedAnswer("");
    addTurn({ role: "elder", text, lang, at: new Date().toISOString() });
    if (stage === "telling") countStoryPart();
    else await nextQuestion(false);
  }

  async function skip() {
    if (thinking) return;
    if (rec.status === "recording") await rec.stop();
    await nextQuestion(true);
  }

  async function finish() {
    // "Stop for today" while talking keeps that last answer, then ends.
    if (rec.status === "recording") {
      try {
        await saveAnswer();
      } catch (err) {
        console.error("Error saving the last answer:", err);
      }
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

        {phase === "not-found" && (
          <div className="glass-night mt-10 flex max-w-md flex-col items-center gap-4 rounded-[32px] px-8 py-12 text-center">
            <Birdy mood="idle" size={100} />
            <p className="font-urdu text-2xl leading-[2] text-lantern-soft" dir="rtl" lang="ur">
              ہمیں یہ بزرگ نہیں ملے۔
            </p>
            <p className="font-display text-xl">We couldn&apos;t find this story session.</p>
            <p className="text-sm text-moon/70">
              You can return to the home page or open your family book.
            </p>
            <Link href="/" className="btn-lantern pixel-corners mt-2 inline-flex h-12 items-center px-6 font-extrabold">
              Back to home
            </Link>
          </div>
        )}

        {phase === "consent" && elder && (
          <div className="glass-night mt-6 flex max-w-xl flex-col items-center gap-5 rounded-[32px] px-7 py-10 sm:px-10">
            <Birdy mood="happy" size={110} />
            <p className="font-urdu text-2xl leading-[2.1] text-lantern-soft sm:text-4xl sm:leading-[2.1]" dir="rtl" lang="ur">
              آپ کی آواز ریکارڈ ہوگی اور صرف آپ کے گھر والوں کے لیے محفوظ رہے گی۔ آپ جب چاہیں رک سکتے ہیں۔
            </p>
            <p className="font-display text-xl leading-snug sm:text-2xl">
              Your voice will be recorded and kept only for your family. You can stop any time.
            </p>
            <div className="w-full rounded-2xl bg-white/5 p-4 text-center">
              <p className="font-urdu text-xl leading-[2] text-lantern-soft sm:text-2xl sm:leading-[2.1]" dir="rtl" lang="ur">
                یہ سروس گوگل کے مفت اے آئی پر چلتی ہے، اور گوگل اپنی مصنوعات کو بہتر بنانے کے لیے یہ ریکارڈنگز استعمال کر سکتا ہے۔
              </p>
              <p className="font-display mt-2 text-lg leading-snug text-moon sm:text-xl">
                This service uses Google&apos;s free AI, and Google may use recordings to improve its products.
              </p>
            </div>
            <p className="max-w-md text-sm text-moon/65">
              Nothing is shared unless your family chooses to share it, and they can delete any recording.
            </p>
            <div className="mt-2 flex w-full flex-col items-center gap-3">
              <button
                type="button"
                onClick={giveConsent}
                className={`btn-lantern pixel-corners flex min-h-[76px] w-full max-w-md flex-col items-center justify-center px-6 py-3 transition ${
                  recordingConsent ? "ring-4 ring-lantern-soft animate-pulse" : ""
                }`}
              >
                <span className="font-urdu text-2xl leading-[1.8]" dir="rtl" lang="ur">
                  {recordingConsent ? "کہیں: ہاں، ٹھیک ہے..." : "ہاں، ٹھیک ہے"}
                </span>
                <span className="text-base font-extrabold">
                  {recordingConsent ? "Say 'Haan, theek hai' (Listening...)" : "Haan, theek hai"}
                </span>
              </button>
              <Link href="/book" className="text-sm font-bold text-moon/60 hover:text-moon underline underline-offset-4">
                <span className="font-urdu mr-1.5" dir="rtl" lang="ur">ابھی نہیں</span>
                <span>(Not now)</span>
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
            {stage === "telling" && (
              <p className="mt-4 max-w-lg text-base text-moon/70">
                <span className="font-urdu block text-lg leading-[2] text-lantern-soft" dir="rtl" lang="ur">
                  پوری کہانی سنائیے۔ ہدہد بیچ میں نہیں ٹوکے گا۔
                </span>
                Tell the whole story in your own words. Hudhud won&apos;t interrupt; he&apos;ll only ask afterwards if something isn&apos;t clear.
              </p>
            )}

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
                ? stage === "telling"
                  ? "Hudhud is writing down that part of the story"
                  : "Hudhud is reading the story for anything unclear"
                : rec.status === "asking"
                  ? "Allow the microphone to begin"
                  : recording
                    ? stage === "telling"
                      ? "Hudhud is listening. Tap the lamp when you pause or finish."
                      : "Hudhud is listening. Tap the lamp when you finish."
                    : stage === "telling"
                      ? storyParts > 0
                        ? `${storyParts} ${storyParts === 1 ? "part" : "parts"} of the story saved. Tap the lamp to go on.`
                        : "Tap the lamp and tell the story"
                      : "Tap the lamp and answer"}
            </p>
            {stage === "telling" && storyParts > 0 && !recording && !thinking && (
              <button
                type="button"
                onClick={() => void finishStory()}
                className="btn-lantern pixel-corners mt-5 flex min-h-[64px] flex-col items-center justify-center px-7 py-2"
              >
                <span className="font-urdu text-xl leading-[1.8]" dir="rtl" lang="ur">بس، یہی میری کہانی ہے</span>
                <span className="text-sm font-extrabold">That&apos;s my story</span>
              </button>
            )}
            {recording && rec.caption && (
              <p className="mt-2 max-w-lg text-moon/70" dir="auto">
                {rec.caption}
              </p>
            )}

            {(rec.status === "denied" || rec.status === "unsupported") && (
              <div className="glass-night mt-4 w-full max-w-md rounded-2xl p-5 text-left text-moon/90">
                <p className="text-sm">
                  {rec.status === "denied"
                    ? "The microphone is blocked. You can type below instead, or click the lock icon next to the address bar to allow the microphone."
                    : "This browser can't record audio directly. You can type below instead."}
                </p>
                <div className="mt-3">
                  <textarea
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder={
                      stage === "telling"
                        ? lang === "ur" ? "یہاں کہانی لکھیں..." : "Type the story here..."
                        : lang === "ur" ? "یہاں جواب لکھیں..." : "Type their answer here..."
                    }
                    dir="auto"
                    rows={3}
                    className="w-full rounded-xl border border-white/15 bg-white/5 p-3 text-moon placeholder:text-moon/40 focus:border-lantern focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!typedAnswer.trim() || thinking}
                    onClick={() => void saveTyped()}
                    className="btn-lantern pixel-corners mt-2 inline-flex h-10 items-center px-5 text-sm font-bold disabled:opacity-50"
                  >
                    {stage === "telling" ? "Save this part of the story" : "Save answer and continue"}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-10 grid w-full max-w-lg grid-cols-3 gap-3">
              <ElderAction
                onClick={() => void speak((stage === "telling" ? invitation(question) : question)[lang], lang)}
                icon={<RotateCcw size={26} />}
                ur="دوبارہ"
                en="Repeat"
              />
              {stage === "clarifying" ? (
                <ElderAction onClick={skip} disabled={thinking} icon={<SkipForward size={26} />} ur="معلوم نہیں" en="Don't know" />
              ) : (
                <ElderAction onClick={() => void finishStory()} disabled={thinking} icon={<SkipForward size={26} />} ur="کہانی ختم" en="Story done" />
              )}
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
                  {answers} {answers === 1 ? "recording" : "recordings"} saved in {who}&apos;s own voice. Hudhud can turn the story into a chapter now.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (session.current) router.push(`/book/writing?session=${session.current.id}`);
                  }}
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
                      storyTurns.current = 0;
                      setStoryParts(0);
                      setStage("telling");
                      setQuestion(themeInfo.firstQuestion);
                      setThoughts([]);
                      setGentle(false);
                      setNote(null);
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
