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
import type { Elder, FamilyBook, Language, Relation, Theme } from "@/lib/book-store";
import type { Session, StoredChapter, Turn } from "@/lib/chapter-store";

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

/** Matches the check in migration 0004: a small resized photo, never a full camera image. */
const MAX_PHOTO = 400_000;

type Client = NonNullable<ReturnType<typeof client>>;
type Row = Record<string, unknown>;

/**
 * Upsert that still works on a database without migration 0004: if the
 * newer columns are missing, the rows are written again without them.
 */
async function upsert(supabase: Client, table: string, rows: Row | Row[], newer: string[], options?: { onConflict: string }) {
  const { error } = await supabase.from(table).upsert(rows, options);
  if (!error || !newer.length || !/column|schema cache/i.test(error.message)) return;
  const strip = (r: Row) => Object.fromEntries(Object.entries(r).filter(([k]) => !newer.includes(k)));
  await supabase.from(table).upsert(Array.isArray(rows) ? rows.map(strip) : strip(rows), options);
}

/** The storage path inside a signed URL from our images bucket, so a fresh URL can be signed later. */
function imagePathOf(url: string | undefined) {
  const m = url?.match(/\/storage\/v1\/object\/sign\/images\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** families + elders. Deleted elders are left as tombstones for now. */
export async function pushBook(book: FamilyBook) {
  if (!isUuid(book.id) || !book.ownerId) return;
  const supabase = client();
  if (!supabase) return;

  await upsert(supabase, "families", { id: book.id, owner_id: book.ownerId, name: book.familyName, theme: book.theme }, ["theme"]);

  const elders = book.elders.filter((e) => isUuid(e.id));
  if (!elders.length) return;
  await upsert(
    supabase,
    "elders",
    elders.map((e) => ({
      id: e.id,
      family_id: book.id,
      name: e.name,
      relation: e.relation,
      language: e.language,
      birthplace: e.birthplace ?? null,
      birth_year: e.birthYear ?? null,
      consent_given_at: e.consentAt ?? null,
      photo: e.photo && e.photo.length <= MAX_PHOTO ? e.photo : null,
    })),
    ["photo"],
  );
}

/** sessions + turns. Turns upsert on (session_id, idx), so re-saving an
 * answer (a better transcript arrives later) updates the same row. */
export async function pushSession(session: Session, familyId: string | undefined) {
  if (!isUuid(session.id) || !isUuid(session.elderId) || !isUuid(familyId)) return;
  const supabase = client();
  if (!supabase) return;

  await upsert(
    supabase,
    "sessions",
    { id: session.id, elder_id: session.elderId, theme: session.theme, status: session.endedAt ? "done" : "open", ended_at: session.endedAt ?? null },
    ["ended_at"],
  );

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

/** chapters. The painting's storage path is kept, so the book can be restored
 * (and shared) with a freshly signed URL long after the device copy expires. */
export async function pushChapter(stored: StoredChapter, familyId: string | undefined) {
  if (!isUuid(stored.id) || !isUuid(stored.sessionId) || !isUuid(familyId)) return;
  const supabase = client();
  if (!supabase) return;

  const c = stored.chapter;
  const imagePath = imagePathOf(stored.imageUrl);
  await upsert(
    supabase,
    "chapters",
    {
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
      ...(imagePath ? { image_path: imagePath } : {}),
      unclear: c.unclear ?? [],
      scene: c.scene ?? null,
      draft: Boolean(stored.draft),
    },
    ["unclear", "scene", "draft"],
  );
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

export type RemoteFamily = { book: FamilyBook; sessions: Session[]; chapters: StoredChapter[] };

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const ids = (rows: Row[]) => rows.map((r) => String(r.id));

/**
 * Everything one account has saved, read back with their own session (RLS),
 * so a new phone, a cleared browser or a sign-out never loses the book.
 * Paintings and voices come back as paths; paintings are signed here.
 */
export async function pullFamily(userId: string, themeScene: (theme: Theme) => StoredChapter["scene"]): Promise<RemoteFamily | null> {
  const supabase = client();
  if (!supabase) return null;

  const { data: families } = await supabase.from("families").select("*").eq("owner_id", userId).order("created_at").limit(1);
  const family = families?.[0] as Row | undefined;
  if (!family) return null;
  const familyId = String(family.id);

  const [{ data: elderRows }, { data: links }] = await Promise.all([
    supabase.from("elders").select("*").eq("family_id", familyId).order("created_at"),
    supabase.from("share_links").select("token").eq("family_id", familyId).eq("revoked", false).limit(1),
  ]);
  const elders: Elder[] = ((elderRows ?? []) as Row[]).map((e) => ({
    id: String(e.id),
    name: String(e.name),
    relation: String(e.relation) as Relation,
    language: String(e.language) as Language,
    birthplace: str(e.birthplace),
    birthYear: str(e.birth_year),
    consentAt: str(e.consent_given_at),
    photo: str(e.photo),
  }));
  const book: FamilyBook = {
    id: familyId,
    ownerId: userId,
    familyName: String(family.name),
    theme: (str(family.theme) ?? "Free talk") as Theme,
    createdAt: String(family.created_at),
    elders,
    shareToken: str((links?.[0] as Row | undefined)?.token),
  };
  if (!elders.length) return { book, sessions: [], chapters: [] };

  const { data: sessionRows } = await supabase.from("sessions").select("*").in("elder_id", ids(elders as unknown as Row[]));
  const sessionsRaw = (sessionRows ?? []) as Row[];
  if (!sessionsRaw.length) return { book, sessions: [], chapters: [] };

  const [{ data: turnRows }, { data: chapterRows }] = await Promise.all([
    supabase.from("turns").select("*").in("session_id", ids(sessionsRaw)).order("idx"),
    supabase.from("chapters").select("*").in("session_id", ids(sessionsRaw)),
  ]);
  const turnsOf = new Map<string, Turn[]>();
  for (const t of (turnRows ?? []) as Row[]) {
    const list = turnsOf.get(String(t.session_id)) ?? [];
    list.push({
      index: Number(t.idx),
      role: t.role === "elder" ? "elder" : "birdy",
      text: String(t.text ?? ""),
      lang: t.lang === "en" ? "en" : "ur",
      audioPath: str(t.audio_path),
      durationMs: typeof t.duration_ms === "number" ? t.duration_ms : undefined,
      at: String(t.created_at),
    });
    turnsOf.set(String(t.session_id), list);
  }

  const sessions: Session[] = sessionsRaw.map((s) => ({
    id: String(s.id),
    elderId: String(s.elder_id),
    theme: String(s.theme) as Theme,
    startedAt: String(s.created_at),
    endedAt: str(s.ended_at) ?? (s.status === "done" ? String(s.created_at) : undefined),
    turns: turnsOf.get(String(s.id)) ?? [],
  }));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  const chaptersRaw = (chapterRows ?? []) as Row[];
  const paths = chaptersRaw.map((c) => str(c.image_path)).filter((p): p is string => Boolean(p?.startsWith(`${familyId}/`)));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from("images").createSignedUrls(paths, 7 * 24 * 60 * 60);
    for (const d of data ?? []) if (d.path && d.signedUrl) signed.set(d.path, d.signedUrl);
  }

  const chapters: StoredChapter[] = chaptersRaw.flatMap((c) => {
    const session = sessionById.get(String(c.session_id));
    if (!session) return [];
    const quote = str(c.pull_quote);
    return [
      {
        id: String(c.id),
        sessionId: session.id,
        elderId: session.elderId,
        theme: session.theme,
        scene: themeScene(session.theme),
        createdAt: String(c.created_at),
        turns: session.turns,
        imageUrl: signed.get(str(c.image_path) ?? ""),
        draft: c.draft === true,
        chapter: {
          title: { ur: String(c.title_ur ?? ""), en: String(c.title_en ?? "") },
          body: { ur: String(c.body_ur ?? ""), en: String(c.body_en ?? "") },
          sourceTurns: Array.isArray(c.source_turns) ? (c.source_turns as number[]) : [],
          pullQuote: quote && typeof c.pull_quote_turn === "number" ? { text: quote, turnIndex: c.pull_quote_turn } : undefined,
          year: str(c.year),
          place: str(c.place),
          unclear: Array.isArray(c.unclear) ? (c.unclear as string[]) : [],
          scene: str(c.scene),
        },
      },
    ];
  });
  return { book, sessions, chapters };
}

/** A short-lived link to one of the family's own voice recordings. */
export async function signedVoiceUrl(path: string) {
  const supabase = client();
  if (!supabase) return null;
  const { data } = await supabase.storage.from("audio").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
