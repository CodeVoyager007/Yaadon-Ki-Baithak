/**
 * Minimal Gemini REST client. Plain fetch, no SDK: free tier, zero install,
 * and the key is read from the server-only env and never leaves the server.
 * Used by /api/turn, /api/story, /api/transcribe and /api/tts.
 */
import { geminiKey, geminiModel } from "./env";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };
type GeminiContent = { role?: "user" | "model"; parts: GeminiPart[] };

type GeminiBody = {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiPart[] };
  generationConfig?: {
    temperature?: number;
    responseMimeType?: string;
    responseModalities?: string[];
    speechConfig?: { voiceConfig: { prebuiltVoiceConfig: { voiceName: string } } };
  };
};

type GeminiReply = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
};

/** Every provider call is bounded so a hung model can't hold a request open. */
const TIMEOUT_MS = 30_000;

async function generate(model: string, body: GeminiBody): Promise<GeminiReply> {
  if (!geminiKey) throw new Error("GEMINI_API_KEY is missing");
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Gemini answered ${res.status}`);
  return (await res.json()) as GeminiReply;
}

function replyText(reply: GeminiReply): string {
  const parts = reply.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("");
  if (!text.trim()) throw new Error("Gemini returned no text");
  return text;
}

/** JSON mode sometimes still wraps the object in fences; strip them defensively. */
export function parseJson<T>(raw: string): T {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(trimmed) as T;
}

/** One JSON object from a system + user prompt pair (interviewer, writer). */
export async function generateJson<T>(system: string, user: string, temperature = 0.7): Promise<T> {
  const reply = await generate(geminiModel, {
    contents: [{ role: "user", parts: [{ text: user }] }],
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { temperature, responseMimeType: "application/json" },
  });
  return parseJson<T>(replyText(reply));
}

/** Verbatim transcript of one answer in the elder's own voice. */
export async function transcribeWithGemini(audio: Uint8Array, mimeType: string, lang: "ur" | "en"): Promise<string> {
  const spoken = lang === "ur" ? "Urdu" : "English";
  const reply = await generate(
    geminiModel,
    {
      contents: [
        {
          parts: [
            {
              text:
                `Transcribe this recording of a grandparent speaking ${spoken}. ` +
                "Verbatim, in the same script they spoke, no translation and no commentary. " +
                "If there is no speech, return an empty string.",
            },
            { inlineData: { mimeType, data: Buffer.from(audio).toString("base64") } },
          ],
        },
      ],
      generationConfig: { temperature: 0 },
    },
  );
  return replyText(reply).trim();
}

export type Pcm = { pcm: Uint8Array; sampleRate: number; channels: number; bitsPerSample: number };

/**
 * Birdy's question voice. Gemini TTS returns raw PCM (24 kHz, 16-bit mono).
 * This is only ever Birdy: the elder's real voice is never cloned or imitated.
 */
export async function speakWithGemini(text: string, model: string, voiceName = "Kore"): Promise<Pcm> {
  const reply = await generate(model, {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });
  const audio = reply.candidates?.[0]?.content?.parts?.map((p) => p.inlineData?.data).find(Boolean);
  if (!audio) throw new Error("Gemini TTS returned no audio");
  return { pcm: Buffer.from(audio, "base64"), sampleRate: 24000, channels: 1, bitsPerSample: 16 };
}

/** Wrap raw PCM in a WAV header so any browser can play it.
 * (Typed as Uint8Array<ArrayBuffer> so it feeds `new Response` cleanly.) */
export function pcmToWav(p: Pcm): Uint8Array<ArrayBuffer> {
  const dataLength = p.pcm.byteLength;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  const byteRate = p.sampleRate * p.channels * (p.bitsPerSample / 8);
  write(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true); // PCM header size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, p.channels, true);
  view.setUint32(24, p.sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, p.channels * (p.bitsPerSample / 8), true);
  view.setUint16(34, p.bitsPerSample, true);
  write(36, "data");
  view.setUint32(40, dataLength, true);
  const wav = new Uint8Array(44 + dataLength);
  wav.set(new Uint8Array(header), 0);
  wav.set(p.pcm, 44);
  return wav;
}
