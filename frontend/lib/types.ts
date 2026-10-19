/**
 * The contract with the backend (backend/agents/types.py). The backend speaks
 * camelCase JSON; these are the shapes the browser sends and receives.
 */

export type Lang = "ur" | "en";

/** One back-and-forth as sent to the agents. */
export type Turn = {
  role: "elder" | "birdy";
  text: string;
  lang: Lang;
  /** Position in the full session, so sourceTurns stay right after the server clamps old turns. */
  index?: number;
  startedAt: string;
};

export type ElderProfile = {
  name: string;
  relation: string;
  language: string;
  birthplace?: string;
  birthYear?: string;
};

export type Mood = "normal" | "sensitive";

/** What Hudhud decides after each answer. wrap_up hands the session to the story writer. */
export type InterviewerDecision = {
  action: "follow_up" | "new_topic" | "wrap_up";
  question: { ur: string; en: string };
  mood: Mood;
  why: string;
  heard: string[];
  handoff?: "story_writer" | null;
  /** What Hudhud noticed in the last answer before deciding. */
  signals?: Signals | null;
  trace?: TraceStep[];
};

export type Signals = {
  answers: number;
  sensitive: boolean;
  tired: boolean;
  skipped: boolean;
  /** "clarify": the elder told the story first; Hudhud only asks about what's unclear. */
  mode?: "interview" | "clarify";
  clarifications?: number;
  told?: boolean;
};

export type Chapter = {
  title: { ur: string; en: string };
  body: { ur: string; en: string };
  sourceTurns: number[];
  pullQuote?: { text: string; turnIndex: number };
  year?: string;
  place?: string;
  /** Parts the writer couldn't make out, marked [unclear] in the body. */
  unclear?: string[];
  /** The scene the illustrator painted. */
  scene?: string;
};

/** One step the orchestrator took, for an "agent thinking" panel. */
export type TraceStep = {
  agent: "interviewer" | "story_writer" | "illustrator" | "orchestrator";
  outcome: string;
  detail: string;
  ms: number;
};
