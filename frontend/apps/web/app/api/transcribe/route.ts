import { NextResponse } from "next/server";

/**
 * POST /api/transcribe
 * Body: FormData { audio: Blob (webm/opus), lang: "ur" | "en" } -> { text }
 * Gemini Flash transcription first, Cloudflare Whisper as backup.
 * Owner: Ayesha (AI Agents). Keys come from process.env on the server only.
 */
export async function POST() {
  return NextResponse.json({ error: "Not built yet. Comes on Day 1 of the build." }, { status: 501 });
}
