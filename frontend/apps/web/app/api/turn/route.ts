import { NextResponse } from "next/server";

/**
 * POST /api/turn
 * Body: { elder: ElderProfile, theme, turns: { role, text, lang, startedAt }[], skipped?: boolean } -> InterviewerDecision (types in @baithak/agents).
 * Runs the interviewer agent (Gemini Flash).
 * Owner: Ayesha (AI Agents). Keys come from process.env on the server only.
 */
export async function POST() {
  return NextResponse.json({ error: "Not built yet. Comes on Day 1 of the build." }, { status: 501 });
}
