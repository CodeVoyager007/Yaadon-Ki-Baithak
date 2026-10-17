/**
 * Recording sessions and finished chapters, stored locally and mirrored to
 * Supabase (sessions / turns / chapters) when it is configured. The chapter
 * shape is the story writer's output (lib/types.ts).
 */
import type { Chapter } from "./types";
import type { SampleChapter } from "./samples";
import { loadBook, type Theme } from "./book-store";
import { hasSupabase } from "./supabase/client";
import { pushChapter, pushSession } from "./data/remote";

export type Turn = {
  index: number;
  role: "elder" | "birdy";
  text: string;
  lang: "ur" | "en";
  /** IndexedDB id of the elder's real voice clip for this answer. */
  clipId?: string;
  /** Path in the private audio bucket once /api/transcribe stored the real voice. */
  audioPath?: string;
  durationMs?: number;
  at: string;
};

export type Session = {
  id: string;
  elderId: string;
  theme: Theme;
  turns: Turn[];
  startedAt: string;
  endedAt?: string;
};

export type StoredChapter = {
  id: string;
  sessionId: string;
  elderId: string;
  theme: Theme;
  scene: SampleChapter["scene"];
  createdAt: string;
  chapter: Chapter;
  /** The session's turns, kept so each answer can be played in the elder's own voice. */
  turns: Turn[];
  imageUrl?: string;
  /** True when the AI writer wasn't connected and the chapter is the plain transcript. */
  draft?: boolean;
  /** Short notes from the agents, shown on the "writing" screen and chapter footer. */
  notes?: string[];
};

const SESSIONS = "baithak-sessions";
const CHAPTERS = "baithak-chapters";

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}
function write<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage full or blocked */
  }
}

export function saveSession(session: Session) {
  write(SESSIONS, [...read<Session>(SESSIONS).filter((s) => s.id !== session.id), session]);
  if (hasSupabase) void pushSession(session, loadBook()?.id).catch(() => {});
}
export function getSession(id: string | null) {
  return read<Session>(SESSIONS).find((s) => s.id === id) ?? null;
}

export function listChapters(elderId?: string) {
  return read<StoredChapter>(CHAPTERS)
    .filter((c) => !elderId || c.elderId === elderId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function getChapter(id: string | null) {
  return read<StoredChapter>(CHAPTERS).find((c) => c.id === id) ?? null;
}
export function getChapterForSession(sessionId: string) {
  return read<StoredChapter>(CHAPTERS).find((c) => c.sessionId === sessionId) ?? null;
}
export function saveChapter(chapter: StoredChapter) {
  write(CHAPTERS, [...read<StoredChapter>(CHAPTERS).filter((c) => c.id !== chapter.id), chapter]);
  if (hasSupabase) void pushChapter(chapter, loadBook()?.id).catch(() => {});
}
export function deleteChapter(id: string) {
  write(
    CHAPTERS,
    read<StoredChapter>(CHAPTERS).filter((c) => c.id !== id),
  );
}

/** Total length of the elder's real voice in a set of turns, like "3 min 20 s". */
export function voiceLength(turns: Turn[]) {
  const ms = turns.filter((t) => t.role === "elder").reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}
