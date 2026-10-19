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
    // Every question after the story counts, answered or skipped, so "Don't know" can't loop.
    const firstAnswer = turns.findIndex((t) => t.role === "elder");
    const asked = firstAnswer < 0 ? 0 : turns.slice(firstAnswer).filter((t) => t.role === "birdy").length;
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

/**
 * POST /api/chapter  { elder, theme, turns, familySeed } -> { chapter, draft, imageUrl?, pageImages, trace }:
 * the book line (story writer, page setter, art director, illustrator). `draft` means the writer couldn't
 * run and the pages are the elder's own words, still laid out and painted by the server.
 */
export async function writeAndIllustrate(elder: Elder, theme: Theme, turns: Turn[], familySeed: number) {
  const ai = await post<{ chapter: Chapter; draft?: boolean; imageUrl?: string | null; pageImages?: (string | null)[]; trace: TraceStep[] }>("/api/chapter", {
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
      draft: ai.draft === true,
      source: "ai" as Source,
    };
  }
  return {
    chapter: transcriptDraft(elder, theme, turns),
    imageUrl: undefined,
    pageImages: [] as (string | null)[],
    trace: [] as TraceStep[],
    draft: true,
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
  theme?: Theme,
): Promise<{ imageUrl?: string | null; pageImages?: (string | null)[]; trace?: TraceStep[] }> {
  const { title, scene, year, place } = chapter;
  const pages = (chapter.pages ?? []).map((p) => ({ scene: p.scene }));
  // Pages without a scene get one of the theme's from the server.
  const ai = await post<{ imageUrl?: string | null; pageImages?: (string | null)[]; trace: TraceStep[] }>("/api/illustrate", {
    chapter: { title, scene, year, place, pages },
    theme,
    familySeed,
  });
  if (ai) return { imageUrl: ai.imageUrl, pageImages: ai.pageImages, trace: ai.trace };
  return { imageUrl: null };
}

/** Words a page holds before it turns, about what fits under a painting. */
const WORDS_PER_PAGE = 70;

/** Splits one answer at sentence ends (Urdu ۔ ؟ and English . ? !), keeping the marks. */
function sentences(text: string) {
  return (text.match(/[^۔؟?.!\n]+[۔؟?.!]*["'”’)]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Transcripts often arrive without punctuation; cut a run-on "sentence" into page-sized pieces. */
function pieces(text: string) {
  return sentences(text).flatMap((s) => {
    const w = s.split(/\s+/).filter(Boolean);
    if (w.length <= WORDS_PER_PAGE) return [s];
    const out: string[] = [];
    for (let i = 0; i < w.length; i += WORDS_PER_PAGE) out.push(w.slice(i, i + WORDS_PER_PAGE).join(" "));
    return out;
  });
}

/**
 * The elder's answers laid out as book pages: whole sentences, about a painting's worth of words
 * per page, never more than MAX_PAGES (a long telling just gets fuller pages). Each page keeps
 * the answers it came from, so it can be traced back to the recording.
 */
function answersToPages(answers: Turn[]) {
  const parts = answers.flatMap((t) => pieces(t.text).map((text) => ({ text, lang: t.lang, index: t.index })));
  const total = parts.reduce((n, p) => n + words(p.text), 0);
  const target = Math.max(WORDS_PER_PAGE, Math.ceil(total / MAX_PAGES));
  const groups: (typeof parts)[] = [];
  let current: typeof parts = [];
  let count = 0;
  for (const piece of parts) {
    if (current.length && count + words(piece.text) > target * 1.2 && groups.length < MAX_PAGES - 1) {
      groups.push(current);
      current = [];
      count = 0;
    }
    current.push(piece);
    count += words(piece.text);
  }
  if (current.length) groups.push(current);

  const join = (group: typeof parts, lang: "ur" | "en") => {
    // A new answer starts a new paragraph; sentences of one answer run on.
    const out: string[] = [];
    let last: number | undefined;
    for (const p of group.filter((g) => g.lang === lang)) {
      if (out.length && p.index === last) out[out.length - 1] += ` ${p.text}`;
      else out.push(p.text);
      last = p.index;
    }
    return out.join("\n\n");
  };
  return groups.map((group) => ({
    ur: join(group, "ur"),
    en: join(group, "en"),
    sourceTurns: [...new Set(group.map((p) => p.index))],
  }));
}

/** A line worth putting on the title page: one whole sentence, short enough to read at a glance. */
function shortQuote(answers: Turn[]) {
  const all = answers.flatMap((t) => sentences(t.text).map((text) => ({ text, index: t.index })));
  const fits = all.filter((s) => words(s.text) >= 6 && s.text.length <= 160);
  const pick = (fits.length ? fits : all).sort((a, b) => b.text.length - a.text.length)[0];
  if (!pick) return undefined;
  const text = pick.text.length > 160 ? `${pick.text.slice(0, 157).replace(/\s+\S*$/, "")}…` : pick.text;
  return { text, turnIndex: pick.index };
}

/** Stand-in chapter: the elder's own words, in order, nothing added, laid out page by page. */
function transcriptDraft(elder: Elder, theme: Theme, turns: Turn[]): Chapter {
  const answers = turns.filter((t) => t.role === "elder" && t.text.trim());
  const ur = answers.filter((t) => t.lang === "ur").map((t) => t.text.trim());
  const en = answers.filter((t) => t.lang === "en").map((t) => t.text.trim());
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
    pages: answersToPages(answers),
    sourceTurns: answers.map((t) => t.index),
    pullQuote: shortQuote(answers),
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
