import type { SupabaseClient } from "@supabase/supabase-js";
import { illustrationRequest } from "@baithak/agents";
import { guardApi } from "../guard.ts";
import { hasCloudflare } from "../env.ts";
import { badBody, notConfigured, ok, providerFailed, readJson } from "../http.ts";
import { paint } from "../providers/cloudflare.ts";
import { supabaseAdmin } from "../supabase/admin.ts";

/** Signed URLs live a week; a new one is minted on every share-page read. */
const SIGN_SECONDS = 7 * 24 * 60 * 60;

/**
 * POST /api/illustrate — the painter agent (FLUX.1 schnell on Cloudflare).
 * Body: { chapter, familySeed } -> { imageUrl }.
 * The PNG goes into the private images bucket under the family's folder, and
 * the response carries a signed URL. Without storage set up (local demo) the
 * painting comes straight back as a data: URL, so the moment still works.
 */
export async function POST(request: Request) {
  const auth = await guardApi(request, "illustrate");
  if (!auth.ok) return auth.response;
  if (!hasCloudflare) return notConfigured("The illustrator");

  const body = await readJson<{
    chapter?: { title?: { en?: unknown }; place?: unknown; year?: unknown; scene?: unknown };
    familySeed?: unknown;
  }>(request);
  if (!body) return badBody();
  const titleEn = typeof body.chapter?.title?.en === "string" ? body.chapter.title.en.trim().slice(0, 160) : "";
  if (!titleEn) return badBody();
  const seed =
    typeof body.familySeed === "number" && Number.isFinite(body.familySeed)
      ? Math.abs(Math.floor(body.familySeed)) % 1_000_000
      : 0;

  // The agent builds the prompt from the writer's scene, title, place and year only.
  const chapter = {
    title: { en: titleEn, ur: "" },
    scene: typeof body.chapter?.scene === "string" ? body.chapter.scene.trim().slice(0, 400) || undefined : undefined,
    place: typeof body.chapter?.place === "string" ? body.chapter.place.trim().slice(0, 120) || undefined : undefined,
    year: typeof body.chapter?.year === "string" ? body.chapter.year.trim().slice(0, 20) || undefined : undefined,
  };

  try {
    const png = await paint(illustrationRequest(chapter, seed));
    const stored = await storePainting(auth.userId, png).catch(() => null);
    if (stored) return ok({ imageUrl: stored });
    return ok({ imageUrl: `data:image/png;base64,${Buffer.from(png).toString("base64")}` });
  } catch (err) {
    console.error("[api/illustrate]", err instanceof Error ? err.message : err);
    return providerFailed("The illustrator");
  }
}

/** Private bucket + signed URL; null when storage or the family isn't there. */
async function storePainting(userId: string | null, png: Uint8Array): Promise<string | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const familyId = userId ? await familyOf(admin, userId) : null;
  if (!familyId) return null;

  const path = `${familyId}/chapter-${crypto.randomUUID()}.png`;
  const { error: uploadError } = await admin.storage.from("images").upload(path, png, {
    contentType: "image/png",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error: signError } = await admin.storage.from("images").createSignedUrl(path, SIGN_SECONDS);
  if (signError || !data?.signedUrl) throw signError ?? new Error("no signed url");
  return data.signedUrl;
}

/** The family this user owns (oldest first), read with the service role. */
async function familyOf(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin
    .from("families")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? (data as { id: string }).id : null;
}
