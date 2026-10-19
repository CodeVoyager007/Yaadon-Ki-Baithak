/**
 * The frontend's only door to the AI agents, which run in the separate
 * Python backend (backend/, NEXT_PUBLIC_API_URL).
 *
 * Every function calls the backend first. While it is unset, unreachable or
 * answers an error, each falls back to a plain stand-in so the whole app can
 * be clicked through. The stand-ins never invent anything: the stand-in
 * "writer" only uses the elder's own transcribed words.
 *
 * The signed-in family historian's Supabase access token rides along as
 * `Authorization: Bearer`; the backend checks it with Supabase.
 *
 * Request and response shapes here are the contract for the backend.
 */
import type { Chapter, ElderProfile, InterviewerDecision, TraceStep, Turn as WireTurn } from "./types";
import type { Elder, Theme } from "./book-store";
import { elderLabel } from "./book-store";
import type { Turn } from "./chapter-store";
import { MAX_PAGES } from "./book-pages";
import { PRACTICE_CLARIFY, PRACTICE_FOLLOW_UPS, THEMES } from "./themes";
import { hasSupabase, supabaseBrowser } from "./supabase/client";

export type Source = "ai" | "stand-in";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

/** False when no backend is configured: every call goes straight to its stand-in. */
export const hasBackend = API !== "";

/** Full URL of a backend route, e.g. apiUrl("/api/share/abc"). */
export function apiUrl(path: string) {
  return `${API}${path}`;
}

/** The signed-in user's access token for the backend; nothing in demo mode. */
async function authHeaders(): Promise<Record<string, string>> {
  if (!hasSupabase) return {};
  try {
    const { data } = await supabaseBrowser().auth.getSession();
    return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  } catch {
    return {};
  }
}

function profile(elder: Elder): ElderProfile {
  return {
    name: elder.name,
    relation: elder.relation,
    language: elder.language,
    birthplace: elder.birthplace,
    birthYear: elder.birthYear,
  };
}

/** turns sent to the agents: text only, no local clip ids. The index keeps
 * the writer's sourceTurns pointing at the right turn after server clamping. */
function plain(turns: Turn[]): WireTurn[] {
  return turns.map(({ role, text, lang, at, index }) => ({ role, text, lang, index, startedAt: at }));
}

async function post<T>(path: string, body: unknown): Promise<T | null> {
  if (!hasBackend) return null;
  try {
    const res = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type TurnMode = { mode: "interview" | "clarify"; storyTurns: number };

/**
 * POST /api/turn  { elder, theme, turns, skipped, mode, storyTurns } -> InterviewerDecision.
 * In "clarify" mode the first storyTurns answers are the story told in one go and
 * Hudhud asks only about what's unclear in it.
 */
export async function askNext(elder: Elder, theme: Theme, turns: Turn[], skipped = false, turnMode: TurnMode = { mode: "interview", storyTurns: 0 }) {
  const ai = await post<InterviewerDecision>("/api/turn", { elder: profile(elder), theme, turns: plain(turns), skipped, ...turnMode });
  if (ai) return { decision: ai, source: "ai" as Source };

  if (turnMode.mode === "clarify") {
    const asked = Math.max(0, turns.filter((t) => t.role === "elder").length - turnMode.storyTurns);
    if (asked >= PRACTICE_CLARIFY.length) {
      return {
        source: "stand-in" as Source,
        decision: {
          action: "wrap_up",
          question: { ur: "بہت شکریہ، یہ کہانی بہت قیمتی ہے", en: "Thank you. This story is precious." },
          mood: "normal",
          why: "Practice run: two clarifying questions asked.",
          heard: [],
        } satisfies InterviewerDecision,
      };
    }
    return {
      source: "stand-in" as Source,
      decision: {
        action: "follow_up",
        question: PRACTICE_CLARIFY[asked],
        mood: "normal",
        why: "Practice question. The AI would ask about what was actually unclear in the story.",
        heard: [],
      } satisfies InterviewerDecision,
    };
  }

  const answers = turns.filter((t) => t.role === "elder").length;
  const asked = turns.filter((t) => t.role === "birdy").length;
  if (answers >= 6) {
    return {
      source: "stand-in" as Source,
      decision: {
        action: "wrap_up",
        question: { ur: "بہت شکریہ، آج کے لیے اتنا کافی ہے", en: "Thank you. That's enough for today." },
        mood: "normal",
        why: "Six answers recorded, a good length for one chapter.",
        heard: [],
      } satisfies InterviewerDecision,
    };
  }
  const q = PRACTICE_FOLLOW_UPS[asked % PRACTICE_FOLLOW_UPS.length];
  return {
    source: "stand-in" as Source,
    decision: {
      action: "follow_up",
      question: q,
      mood: "normal",
      why: "Practice question. The AI interviewer will follow up on what was actually said.",
      heard: [],
    } satisfies InterviewerDecision,
  };
}

/** POST /api/transcribe  FormData { audio, lang, sessionId? } -> { text, audioPath? } */
export async function transcribe(
  audio: Blob,
  lang: "ur" | "en",
  liveCaption: string,
  sessionId?: string,
): Promise<{ text: string; audioPath?: string; source: Source }> {
  try {
    if (!hasBackend) throw new Error("no backend");
    const form = new FormData();
    form.append("audio", audio, "answer.webm");
    form.append("lang", lang);
    if (sessionId) form.append("sessionId", sessionId);
    const res = await fetch(apiUrl("/api/transcribe"), { method: "POST", body: form, headers: await authHeaders() });
    if (res.ok) {
      const { text, audioPath } = (await res.json()) as { text: string; audioPath?: string };
      if (text?.trim()) return { text: text.trim(), audioPath, source: "ai" as Source };
    }
  } catch {
    /* fall through */
  }
  // Stand-in: the browser's own live captions, if it produced any.
  return { text: liveCaption.trim(), source: "stand-in" as Source };
}

/** POST /api/chapter  { elder, theme, turns, familySeed } -> { chapter, imageUrl?, trace }: the writer, then the illustrator. */
export async function writeAndIllustrate(elder: Elder, theme: Theme, turns: Turn[], familySeed: number) {
  const ai = await post<{ chapter: Chapter; imageUrl?: string | null; pageImages?: (string | null)[]; trace: TraceStep[] }>("/api/chapter", {
    elder: profile(elder),
    theme,
    turns: plain(turns),
    familySeed,
  });
  if (ai?.chapter) {
    return {
      chapter: ai.chapter,
      imageUrl: ai.imageUrl ?? undefined,
      pageImages: ai.pageImages ?? [],
      trace: ai.trace ?? [],
      source: "ai" as Source,
    };
  }
  return {
    chapter: transcriptDraft(elder, theme, turns),
    imageUrl: undefined,
    pageImages: [] as (string | null)[],
    trace: [] as TraceStep[],
    source: "stand-in" as Source,
  };
}

/**
 * POST /api/illustrate  { chapter, familySeed } -> { imageUrl?, pageImages, trace }: paints a book again,
 * page by page. Only the brief is sent (title, scenes, year, place), never the elder's words.
 */
export async function illustrateOnly(
  chapter: Chapter,
  familySeed: number,
): Promise<{ imageUrl?: string | null; pageImages?: (string | null)[]; trace?: TraceStep[] }> {
  const { title, scene, year, place } = chapter;
  const pages = (chapter.pages ?? []).map((p) => ({ scene: p.scene }));
  const ai = await post<{ imageUrl?: string | null; pageImages?: (string | null)[]; trace: TraceStep[] }>("/api/illustrate", {
    chapter: { title, scene, year, place, pages },
    familySeed,
  });
  if (ai) return { imageUrl: ai.imageUrl, pageImages: ai.pageImages, trace: ai.trace };
  return { imageUrl: null };
}

function answersToPages(answers: Turn[]) {
  const per = Math.ceil(answers.length / MAX_PAGES) || 1;
  const pages = [];
  for (let i = 0; i < answers.length; i += per) {
    const group = answers.slice(i, i + per);
    pages.push({
      ur: group.filter((t) => t.lang === "ur").map((t) => t.text.trim()).join("\n\n"),
      en: group.filter((t) => t.lang === "en").map((t) => t.text.trim()).join("\n\n"),
      sourceTurns: group.map((t) => t.index),
    });
  }
  return pages;
}

/** Stand-in chapter: the elder's own words, in order, nothing added. */
function transcriptDraft(elder: Elder, theme: Theme, turns: Turn[]): Chapter {
  const answers = turns.filter((t) => t.role === "elder" && t.text.trim());
  const ur = answers.filter((t) => t.lang === "ur").map((t) => t.text.trim());
  const en = answers.filter((t) => t.lang === "en").map((t) => t.text.trim());
  const longest = [...answers].sort((a, b) => b.text.length - a.text.length)[0];
  const themeInfo = THEMES.find((t) => t.id === theme);
  const who = elderLabel(elder);
  // Urdu title uses the relation in Urdu, never an English-letter name inside Nastaliq.
  const urWho = { Nani: "نانی", Nana: "نانا", Dadi: "دادی", Dada: "دادا", Other: "ان" }[elder.relation];

  const chapter: Chapter = {
    title: {
      en: theme === "Free talk" ? `${who} remembers` : `${who} remembers: ${theme}`,
      ur: theme === "Free talk" || !themeInfo ? `${urWho} کی یادیں` : `${urWho} کی یادیں: ${themeInfo.ur}`,
    },
    body: { ur: ur.join("\n\n"), en: en.join("\n\n") },
    // One page per answer, so the draft still reads as a book (long sittings share pages).
    pages: answersToPages(answers),
    sourceTurns: answers.map((t) => t.index),
    pullQuote: longest ? { text: longest.text.trim(), turnIndex: longest.index } : undefined,
    year: theme === "1947" ? "1947" : undefined,
    place: elder.birthplace,
  };
  return chapter;
}

/** POST /api/tts  { text, lang } -> audio */
let speaking: HTMLAudioElement | null = null;
/** Bumped by every speak/stop, so a voice that arrives late never plays over the elder. */
let speechTurn = 0;

function silence() {
  speechTurn += 1;
  if (speaking) {
    speaking.pause();
    URL.revokeObjectURL(speaking.src);
    speaking = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  return speechTurn;
}

/** Hudhud reads a question aloud: the Urdu voice from /api/tts, else the browser's own voice. */
export async function speak(text: string, lang: "ur" | "en") {
  const turn = silence();
  try {
    if (!hasBackend) throw new Error("no backend");
    const res = await fetch(apiUrl("/api/tts"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ text, lang }),
    });
    if (res.ok && res.headers.get("content-type")?.startsWith("audio")) {
      const blob = await res.blob();
      if (turn !== speechTurn) return;
      const audio = new Audio(URL.createObjectURL(blob));
      speaking = audio;
      await audio.play();
      return;
    }
  } catch {
    /* fall through */
  }
  if (turn !== speechTurn || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "ur" ? "ur-PK" : "en-GB";
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang === "ur" ? "ur" : "en"));
  if (voice) u.voice = voice;
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  silence();
}
