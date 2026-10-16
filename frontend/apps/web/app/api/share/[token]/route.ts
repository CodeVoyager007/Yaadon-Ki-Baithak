import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Shared paintings and links are re-signed fresh on every read. */
const SIGN_SECONDS = 7 * 24 * 60 * 60;

type ElderRow = { id: string; name: string; relation: string; language: string };
type SessionRow = { id: string; elder_id: string; theme: string };
type TurnRow = {
  session_id: string;
  idx: number;
  role: string;
  text: string;
  lang: string;
  duration_ms: number | null;
  created_at: string;
};
type ChapterRow = {
  id: string;
  session_id: string;
  created_at: string;
  title_ur: string;
  title_en: string;
  body_ur: string;
  body_en: string;
  source_turns: number[] | null;
  pull_quote: string | null;
  pull_quote_turn: number | null;
  year: string | null;
  place: string | null;
  image_path: string | null;
};

const notFound = () => NextResponse.json({ error: "This family book isn't available." }, { status: 404 });

/**
 * GET /api/share/[token] — the only public route.
 * A valid, unrevoked, unexpired token returns the family's shared book:
 * family name, storytellers, and every chapter with its turns and a fresh
 * signed painting URL. Wrong, revoked or expired tokens all look identical,
 * so the link can't be probed. No anon read policy exists on the tables on
 * purpose; this route reads with the service role after checking the token.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Sharing isn't set up on this site." }, { status: 503 });
  if (!/^[A-Za-z0-9]{1,64}$/.test(token)) return notFound();

  const { data: link } = await admin
    .from("share_links")
    .select("family_id, expires_at, revoked")
    .eq("token", token)
    .maybeSingle();
  if (!link || link.revoked || (link.expires_at && new Date(link.expires_at).getTime() <= Date.now())) return notFound();

  const familyId = (link as { family_id: string }).family_id;
  const { data: family } = await admin.from("families").select("name").eq("id", familyId).maybeSingle();
  if (!family) return notFound();
  const familyName = (family as { name: string }).name;

  const { data: elders } = await admin
    .from("elders")
    .select("id, name, relation, language")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });
  const elderList = (elders ?? []) as ElderRow[];

  const empty = NextResponse.json({ familyName, elders: elderList, chapters: [] });
  if (!elderList.length) return empty;

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, elder_id, theme")
    .in("elder_id", elderList.map((e) => e.id))
    .order("created_at", { ascending: true });
  const sessionList = (sessions ?? []) as SessionRow[];
  if (!sessionList.length) return empty;
  const sessionIds = sessionList.map((s) => s.id);

  const [{ data: chapterRows }, { data: turnRows }] = await Promise.all([
    admin.from("chapters").select("*").in("session_id", sessionIds).order("created_at", { ascending: true }),
    admin
      .from("turns")
      .select("session_id, idx, role, text, lang, duration_ms, created_at")
      .in("session_id", sessionIds)
      .order("idx", { ascending: true }),
  ]);

  const turnsBySession = new Map<string, object[]>();
  for (const t of (turnRows ?? []) as TurnRow[]) {
    const list = turnsBySession.get(t.session_id) ?? [];
    list.push({
      index: t.idx,
      role: t.role === "elder" ? "elder" : "birdy",
      text: t.text,
      lang: t.lang === "en" ? "en" : "ur",
      durationMs: t.duration_ms ?? undefined,
      at: t.created_at,
    });
    turnsBySession.set(t.session_id, list);
  }

  const chapters = await Promise.all(
    ((chapterRows ?? []) as ChapterRow[]).map(async (row) => {
      const session = sessionList.find((s) => s.id === row.session_id);
      const imageUrl = row.image_path ? await signedUrl(admin, row.image_path) : undefined;
      return {
        id: row.id,
        sessionId: row.session_id,
        elderId: session?.elder_id ?? "",
        theme: session?.theme ?? "Free talk",
        createdAt: row.created_at,
        chapter: {
          title: { ur: row.title_ur, en: row.title_en },
          body: { ur: row.body_ur, en: row.body_en },
          sourceTurns: Array.isArray(row.source_turns) ? row.source_turns : [],
          pullQuote:
            row.pull_quote && typeof row.pull_quote_turn === "number"
              ? { text: row.pull_quote, turnIndex: row.pull_quote_turn }
              : undefined,
          year: row.year ?? undefined,
          place: row.place ?? undefined,
        },
        turns: turnsBySession.get(row.session_id) ?? [],
        imageUrl,
      };
    }),
  );

  return NextResponse.json({ familyName, elders: elderList, chapters });
}

/** A fresh signed URL for one private object; undefined when signing fails. */
async function signedUrl(admin: SupabaseClient, path: string): Promise<string | undefined> {
  const { data, error } = await admin.storage.from("images").createSignedUrl(path, SIGN_SECONDS);
  return error ? undefined : data?.signedUrl;
}
