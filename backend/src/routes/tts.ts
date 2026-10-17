import { guardApi } from "../guard.ts";
import { geminiTtsModel, hasGemini } from "../env.ts";
import { badBody, notConfigured, providerFailed, readJson } from "../http.ts";
import { pcmToWav, speakWithGemini } from "../providers/gemini.ts";

/**
 * POST /api/tts — Birdy's question voice (Gemini TTS).
 * Body: { text, lang } -> audio/wav bytes.
 * Only Birdy is ever synthesized; the elder's real voice is never cloned.
 * If the model can't speak the line (Urdu support varies), we answer 502 and
 * the browser falls back to its own speechSynthesis voice.
 */
export async function POST(request: Request) {
  const auth = await guardApi(request, "tts");
  if (!auth.ok) return auth.response;
  if (!hasGemini) return notConfigured("Birdy's voice");

  const body = await readJson<{ text?: unknown }>(request);
  if (!body) return badBody();
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 500) : "";
  if (!text) return badBody();

  try {
    const wav = pcmToWav(await speakWithGemini(text, geminiTtsModel));
    return new Response(wav, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(wav.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/tts]", err instanceof Error ? err.message : err);
    return providerFailed("Birdy's voice");
  }
}
