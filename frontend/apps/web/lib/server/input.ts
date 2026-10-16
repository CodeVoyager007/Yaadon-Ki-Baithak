import type { ElderProfile, Turn } from "@baithak/agents";

/**
 * Input hygiene shared by the agent routes. Everything the browser sends is
 * untrusted: clamp it, drop what doesn't belong, and answer 400 when the
 * request is unusable. Bounded input also keeps free-tier quota safe.
 */

const MAX_TEXT = 2000;

/** The interviewer/writer profile: three required fields, everything else optional and short. */
export function cleanElder(raw: unknown): ElderProfile | null {
  const e = (raw ?? {}) as Partial<ElderProfile>;
  const name = typeof e.name === "string" ? e.name.trim().slice(0, 80) : "";
  const relation = typeof e.relation === "string" ? e.relation.trim().slice(0, 40) : "";
  const language = typeof e.language === "string" ? e.language.trim().slice(0, 40) : "";
  if (!name || !relation || !language) return null;
  return {
    name,
    relation,
    language,
    birthplace: typeof e.birthplace === "string" ? e.birthplace.trim().slice(0, 120) || undefined : undefined,
    birthYear: typeof e.birthYear === "string" ? e.birthYear.trim().slice(0, 20) || undefined : undefined,
  };
}

/** The conversation so far: only the last N turns, each with readable text. */
export function cleanTurns(raw: unknown, maxTurns = 40): Turn[] | null {
  if (!Array.isArray(raw)) return null;
  const turns: Turn[] = [];
  for (const item of raw.slice(-maxTurns)) {
    const t = (item ?? {}) as Partial<Turn>;
    if (t.role !== "elder" && t.role !== "birdy") continue;
    const text = typeof t.text === "string" ? t.text.trim().slice(0, MAX_TEXT) : "";
    if (!text) continue;
    turns.push({
      role: t.role,
      text,
      lang: t.lang === "en" ? "en" : "ur",
      startedAt: typeof t.startedAt === "string" ? t.startedAt : new Date(0).toISOString(),
    });
  }
  return turns.length ? turns : null;
}

/** The story theme, shortened; "Free talk" is the app's default. */
export function cleanTheme(raw: unknown): string {
  return typeof raw === "string" && raw.trim() ? raw.trim().slice(0, 60) : "Free talk";
}
