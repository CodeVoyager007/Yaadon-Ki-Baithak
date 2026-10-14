import { NextResponse } from "next/server";

/**
 * POST /api/tts
 * Body: { text, lang: "ur" | "en" } -> audio/mpeg bytes.
 * Urdu voice for Birdy's questions: Gemini TTS first, Edge Urdu voice or MMS-TTS as backups.
 * Owner: Ayesha (AI Agents). Keys come from process.env on the server only.
 */
export async function POST() {
  return NextResponse.json({ error: "Not built yet. Comes on Day 1 of the build." }, { status: 501 });
}
