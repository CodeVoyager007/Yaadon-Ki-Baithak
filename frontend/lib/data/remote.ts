/**
 * The remote half of the local-first stores. When Supabase is configured,
 * every save also lands in Postgres through the signed-in user's own session,
 * so row level security does the ownership checks — this file never uses the
 * service role. Every call is fire-and-forget and swallowed: a database
 * hiccup must never break the elder's recording screen.
 *
 * Only types may be imported from the stores; the stores import this module,
 * and a runtime import back would create a cycle.
 */
import { supabaseBrowser } from "@/lib/supabase/client";
import type { FamilyBook } from "@/lib/book-store";
import type { Session, StoredChapter } from "@/lib/chapter-store";

/** localStorage ids minted before this app generated UUIDs can't become rows;
 * those books simply stay local-only. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id: string | undefined | null): id is string => Boolean(id && UUID.test(id));

function client() {
  try {
    return supabaseBrowser();
  } catch {
    return null; // demo mode: no keys, nothing remote to push
  }
}

/** families + elders. Deleted elders are left as tombstones for now. */
export async function pushBook(book: FamilyBook) {
  if (!isUuid(book.id) || !book.ownerId) return;
  const supabase = client();
  if (!supabase) return;

  await supabase.from("families").upsert({ id: book.id, owner_id: book.ownerId, name: book.familyName });

  const elders = book.elders.filter((e) => isUuid(e.id));
  if (!elders.length) return;
  await supabase.from("elders").upsert(
    elders.map((e) => ({
      id: e.id,
      family_id: book.id,
      name: e.name,
      relation: e.relation,
      language: e.language,
      birthplace: e.birthplace ?? null,
      birth_year: e.birthYear ?? null,
      consent_given_at: e.consentAt ?? null,
    })),
  );
}

/** sessions + turns. Turns upsert on (session_id, idx), so re-saving an
 * answer (a better transcript arrives later) updates the same row. */
export async function pushSession(session: Session, familyId: string | undefined) {
  if (!isUuid(session.id) || !isUuid(session.elderId) || !isUuid(familyId)) return;
  const supabase = client();
  if (!supabase) return;

  await supabase.from("sessions").upsert({
    id: session.id,
    elder_id: session.elderId,
    theme: session.theme,
    status: session.endedAt ? "done" : "open",
  });

  if (!session.turns.length) return;
  await supabase.from("turns").upsert(
    session.turns.map((t) => ({
      session_id: session.id,
      idx: t.index,
      role: t.role,
      text: t.text,
      lang: t.lang,
      audio_path: t.audioPath ?? null,
      duration_ms: t.durationMs ?? null,
    })),
    { onConflict: "session_id,idx" },
  );
}

/** chapters. The painting lives in the images bucket; its storage path stays
 * server-side for now and the signed URL rides on the device copy. */
export async function pushChapter(stored: StoredChapter, familyId: string | undefined) {
  if (!isUuid(stored.id) || !isUuid(stored.sessionId) || !isUuid(familyId)) return;
  const supabase = client();
  if (!supabase) return;

  const c = stored.chapter;
  await supabase.from("chapters").upsert({
    id: stored.id,
    session_id: stored.sessionId,
    title_ur: c.title.ur,
    title_en: c.title.en,
    body_ur: c.body.ur,
    body_en: c.body.en,
    source_turns: c.sourceTurns,
    pull_quote: c.pullQuote?.text ?? null,
    pull_quote_turn: c.pullQuote?.turnIndex ?? null,
    year: c.year ?? null,
    place: c.place ?? null,
  });
}

/** share_links. No token means the family turned sharing off: old links die. */
export async function pushShareLink(familyId: string | undefined, token: string | undefined) {
  if (!isUuid(familyId)) return;
  const supabase = client();
  if (!supabase) return;

  if (!token) {
    await supabase.from("share_links").update({ revoked: true }).eq("family_id", familyId);
    return;
  }
  await supabase.from("share_links").upsert({ token, family_id: familyId, revoked: false });
}

/**
 * A family deletes a chapter: the chapter row, its session and turns, and —
 * above all — the elder's own voice from the private audio bucket. RLS makes
 * the check with the signed-in user's token, exactly like every write, and
 * only paths inside this family's own folder ever reach storage.remove.
 */
export async function removeChapterRemote(stored: StoredChapter, familyId: string | undefined) {
  if (!isUuid(stored.id) || !isUuid(stored.sessionId) || !isUuid(familyId)) return;
  const supabase = client();
  if (!supabase) return;

  // Only touch paths this family owns; anything else stays.
  const voicePaths = stored.turns.map((t) => t.audioPath ?? "").filter((p) => p.startsWith(`${familyId}/`));

  await supabase.storage.from("audio").remove(voicePaths);
  await supabase.from("turns").delete().eq("session_id", stored.sessionId);
  await supabase.from("chapters").delete().eq("id", stored.id);
  await supabase.from("sessions").delete().eq("id", stored.sessionId);
}
