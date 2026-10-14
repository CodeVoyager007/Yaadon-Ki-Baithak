import { NextResponse } from "next/server";

/**
 * POST /api/story
 * Body: { elder: ElderProfile, theme, turns } -> Chapter (types in @baithak/agents).
 * Runs the story writer. Must only use the elder's words and fill sourceTurns.
 * Owner: Ayesha (AI Agents). Keys come from process.env on the server only.
 */
export async function POST() {
  return NextResponse.json({ error: "Not built yet. Comes on Day 1 of the build." }, { status: 501 });
}
