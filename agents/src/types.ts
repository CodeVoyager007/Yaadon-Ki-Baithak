/** Shared shapes passed between the web app, the backend and the three agents. */

export type Lang = "ur" | "en";

/** One back-and-forth in an interview session. */
export type Turn = {
  role: "elder" | "birdy";
  text: string; // transcript (elder) or question (birdy)
  lang: Lang;
  /** Position in the full session. Kept so sourceTurns stay stable when old turns are clamped away. */
  index?: number;
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

/** "sensitive" means the last answer touched grief or pain: Birdy slows down and offers a lighter topic. */
export type Mood = "normal" | "sensitive";

/** What the interviewer decides after each elder turn. */
export type InterviewerDecision = {
  /** wrap_up is the hand-off: the session goes to the story writer, then the illustrator. */
  action: "follow_up" | "new_topic" | "wrap_up";
  question: { ur: string; en: string };
  mood: Mood;
  /** Short reason, logged for the demo's "agent thinking" panel. */
  why: string;
  /** Facts heard so far: people, places, years, objects. Used to avoid repeats. */
  heard: string[];
};

export type Chapter = {
  title: { ur: string; en: string };
  body: { ur: string; en: string };
  /** Every sentence must trace back to a turn. Indexes into the session's turns. */
  sourceTurns: number[];
  /** Quote the elder said word for word, played with their real voice. */
  pullQuote?: { text: string; turnIndex: number };
  year?: string;
  place?: string;
  /** Parts the writer couldn't make out; marked [unclear] in the body instead of guessed. */
  unclear?: string[];
  /** One visual scene for the illustrator, built only from details the elder mentioned. */
  scene?: string;
};

export type IllustrationRequest = {
  prompt: string;
  negativePrompt: string;
  seed: number;
  steps: number;
  guidance: number;
  width: number;
  height: number;
};

/**
 * The only thing an agent needs from a model: a system + user prompt in, parsed
 * JSON out. The backend passes its Gemini client; tests pass a fake. Agents
 * never hold keys or call fetch themselves.
 */
export type JsonModel = (system: string, user: string, temperature?: number) => Promise<unknown>;
