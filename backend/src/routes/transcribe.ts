import type { SupabaseClient } from "@supabase/supabase-js";
import { guardApi } from "../guard.ts";
import { hasCloudflare, hasGemini } from "../env.ts";
import { badBody, notConfigured, ok, providerFailed } from "../http.ts";
import { transcribeWithGemini } from "../providers/gemini.ts";
import { transcribeWithWhisper } from "../providers/cloudflare.ts";
import { supabaseForRequest } from "../supabase/server.ts";

/** Gemini's inline-audio limit is 20 MB; anything bigger is not one answer. */
const MAX_AUDIO = 20 * 1024 * 1024;

/**
 * POST /api/transcribe — the elder's answer, in their own voice.
 * FormData: { audio: Blob, lang: "ur" | "en", sessionId? } -> { text, audioPath? }.
 * Gemini Flash hears the audio first, Cloudflare Whisper is the backup.
 * When the caller is signed in and sends a sessionId, the real recording is
 * also kept in the private audio bucket (ownership proven by the caller's own
 * RLS session — no service key involved) and its path comes back as audioPath.
 */
export async function POST(request: Request) {
  const auth = await guardApi(request, "transcribe");
  if (!auth.ok) return auth.response;
  if (!hasGemini && !hasCloudflare) return notConfigured("Transcription");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badBody();
  }
  const audio = form.get("audio");
  const lang = form.get("lang") === "en" ? ("en" as const) : ("ur" as const);
  const sessionId = typeof form.get("sessionId") === "string" ? (form.get("sessionId") as string) : null;
  if (!(audio instanceof File) || audio.size === 0 || audio.size > MAX_AUDIO) return badBody();

  const bytes = new Uint8Array(await audio.arrayBuffer());
  const mimeType = audio.type || "audio/webm";

  const text = await hear(bytes, mimeType, lang);
  if (text === null) return providerFailed("The transcription");

  // Keep the real voice in the family's private bucket; the turn row will
  // store this path when the client saves the session. Failures are silent:
  // the clip is still on the device, and transcription already succeeded.
  const audioPath = auth.userId && sessionId ? await saveClip(request, auth.userId, sessionId, bytes, mimeType).catch(() => undefined) : undefined;

  return ok({ text, audioPath });
}

/** Gemini first, Whisper second; null only when both are unusable. */
async function hear(bytes: Uint8Array, mimeType: string, lang: "ur" | "en"): Promise<string | null> {
  if (hasGemini) {
    try {
      return await transcribeWithGemini(bytes, mimeType, lang);
    } catch (err) {
      console.error("[api/transcribe] gemini", err instanceof Error ? err.message : err);
    }
  }
  if (hasCloudflare) {
    try {
      return await transcribeWithWhisper(bytes, lang);
    } catch (err) {
      console.error("[api/transcribe] whisper", err instanceof Error ? err.message : err);
    }
  }
  return null;
}

/**
 * Store the recording under {familyId}/audio/… where the storage policy
 * requires the first folder to be a family the caller owns. Every step reads
 * through the caller's session, so RLS decides what they may touch.
 */
async function saveClip(
  request: Request,
  userId: string,
  sessionId: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<string | undefined> {
  const supabase = supabaseForRequest(request);
  if (!supabase) return undefined;

  const familyId = await familyOfSession(supabase, sessionId, userId);
  if (!familyId) return undefined;

  const ext = /mp4|m4a|aac/i.test(mimeType) ? "m4a" : "webm";
  const path = `${familyId}/audio/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("audio").upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (uploadError) throw uploadError;
  return path;
}

/** Session -> elder -> family, stopping the moment RLS hides a link. */
async function familyOfSession(supabase: SupabaseClient, sessionId: string, userId: string): Promise<string | null> {
  const { data: session } = await supabase.from("sessions").select("id, elder_id").eq("id", sessionId).maybeSingle();
  if (!session) return null;
  const { data: elder } = await supabase.from("elders").select("id, family_id").eq("id", session.elder_id).maybeSingle();
  if (!elder) return null;
  const { data: family } = await supabase.from("families").select("id").eq("id", elder.family_id).eq("owner_id", userId).maybeSingle();
  return family ? (family as { id: string }).id : null;
}
