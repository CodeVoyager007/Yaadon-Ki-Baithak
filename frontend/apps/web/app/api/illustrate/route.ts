import { NextResponse } from "next/server";

/**
 * POST /api/illustrate
 * Body: { chapter: Chapter, familySeed: number } -> { imageUrl }.
 * Builds the FLUX.1 schnell prompt, calls Cloudflare Workers AI, stores the image in the private images bucket.
 * Owner: Ayesha (AI Agents). Keys come from process.env on the server only.
 */
export async function POST() {
  return NextResponse.json({ error: "Not built yet. Comes on Day 1 of the build." }, { status: 501 });
}
