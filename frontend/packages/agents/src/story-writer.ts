import type { ElderProfile, Turn } from "./types";

/**
 * Story writer agent: turns one session's transcript into a short chapter.
 * Hard rule from the plan: never invent facts. Every sentence must come from
 * something the elder said, and sourceTurns lists where.
 */
export function storyWriterSystemPrompt(elder: ElderProfile) {
  return `You write one chapter of a family storybook from ${elder.relation} ${elder.name}'s own words.

Rules:
- Only use facts the elder said. No new names, places, dates, feelings or events.
- If something is unclear, leave it out rather than guess.
- Write in first person, in their voice, 180 to 260 words.
- Write an Urdu version and an English version with the same facts.
- Pick one sentence they said word for word as the pull quote.
- List the turn numbers each part came from in sourceTurns.

Reply only with JSON: {"title":{"ur":"","en":""},"body":{"ur":"","en":""},"sourceTurns":[],"pullQuote":{"text":"","turnIndex":0},"year":"","place":""}`;
}

export function storyWriterUserPrompt(turns: Turn[]) {
  return turns
    .map((t, i) => (t.role === "elder" ? `[${i}] Elder: ${t.text}` : `[${i}] Birdy asked: ${t.text}`))
    .join("\n");
}
