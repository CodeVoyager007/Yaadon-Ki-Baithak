/**
 * Cloudflare Workers AI over REST: FLUX.1 schnell paints the chapter images,
 * Whisper transcribes when Gemini can't hear the recording. Free tier; the
 * token is read from the server-only env and never leaves the server.
 */
import type { IllustrationRequest } from "@baithak/agents";
import {
  cloudflareAccountId,
  cloudflareApiToken,
  cloudflareImageModel,
  cloudflareTranscribeModel,
} from "../env.ts";

/** Painting a chapter can take a while; a hung model still can't hold the request open. */
const TIMEOUT_MS = 45_000;

async function runAi<T>(model: string, body: unknown): Promise<T> {
  if (!cloudflareAccountId || !cloudflareApiToken) throw new Error("Cloudflare keys are missing");
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${encodeURIComponent(model)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${cloudflareApiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!res.ok) throw new Error(`Cloudflare answered ${res.status}`);
  const json = (await res.json()) as { success?: boolean; result?: T };
  if (!json.success || json.result === undefined) throw new Error("Cloudflare returned no result");
  return json.result;
}

/** One chapter painting, exactly as the illustrator agent asked for it.
 * The seed is per family, so the whole book looks like one artist painted it. */
export async function paint(req: IllustrationRequest): Promise<Uint8Array> {
  const result = await runAi<{ image?: string }>(cloudflareImageModel, {
    prompt: req.prompt,
    seed: req.seed,
    guidance: req.guidance,
    num_steps: req.steps,
    width: req.width,
    height: req.height,
  });
  if (!result.image) throw new Error("FLUX returned no image");
  return Buffer.from(result.image, "base64");
}

/** Backup transcriber for answers Gemini couldn't make out. */
export async function transcribeWithWhisper(audio: Uint8Array, lang: "ur" | "en"): Promise<string> {
  const result = await runAi<{ text?: string }>(cloudflareTranscribeModel, {
    audio: Buffer.from(audio).toString("base64"),
    language: lang === "ur" ? "ur" : "en",
    task: "transcribe",
  });
  return (result.text ?? "").trim();
}
