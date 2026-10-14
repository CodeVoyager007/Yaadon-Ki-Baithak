/** Shared shapes passed between the web app and the three agents. */

export type Lang = "ur" | "en";

/** One back-and-forth in an interview session. */
export type Turn = {
  role: "elder" | "birdy";
  text: string; // transcript (elder) or question (birdy)
  lang: Lang;
  audioPath?: string; // Supabase Storage path of the elder's real voice clip
  startedAt: string;
};

export type ElderProfile = {
  name: string;
  relation: string; // Nani, Dada, ...
  language: string;
  birthplace?: string;
  birthYear?: string;
};

/** What the interviewer decides after each elder turn. */
export type InterviewerDecision = {
  action: "follow_up" | "new_topic" | "wrap_up";
  question: { ur: string; en: string };
  /** Short reason, logged for the demo's "agent thinking" panel. */
  why: string;
  /** Facts heard so far: people, places, years, objects. Used to avoid repeats. */
  heard: string[];
};

export type Chapter = {
  title: { ur: string; en: string };
  body: { ur: string; en: string };
  /** Every sentence must trace back to a turn. Indexes into the turns array. */
  sourceTurns: number[];
  /** Quote the elder said word for word, played with their real voice. */
  pullQuote?: { text: string; turnIndex: number };
  year?: string;
  place?: string;
};

export type IllustrationRequest = {
  prompt: string;
  negativePrompt: string;
  seed: number;
};
