import { NextResponse } from "next/server";
import { storyWriterSystemPrompt, storyWriterUserPrompt, type Chapter } from "@baithak/agents";
import { guardApi } from "@/lib/server/guard";
import { hasGemini } from "@/lib/server/env";
import { badBody, notConfigured, providerFailed, readJson } from "@/lib/server/http";
import { cleanElder, cleanTurns } from "@/lib/server/input";
import { generateJson } from "@/lib/server/gemini";

/**
 * POST /api/story — the story writer agent (Gemini Flash).
 * Body: { elder, theme, turns } -> Chapter.
 * "Never invent facts" is enforced in code as well as in the prompt: the
 * route only reshapes and bounds the model's JSON. If the shape is wrong we
 * answer 502 and the browser saves the plain transcript as a labelled draft.
 */
export async function POST(request: Request) {
  const auth = await guardApi(request, "story");
  if (!auth.ok) return auth.response;
  if (!hasGemini) return notConfigured("The story writer");

  const body = await readJson<{ elder?: unknown; theme?: unknown; turns?: unknown }>(request);
  if (!body) return badBody();
  const elder = cleanElder(body.elder);
  const turns = cleanTurns(body.turns, 60);
  if (!elder || !turns) return badBody();

  try {
    const raw = await generateJson<Partial<Chapter>>(storyWriterSystemPrompt(elder), storyWriterUserPrompt(turns));
    const chapter = cleanChapter(raw);
    if (!chapter) return providerFailed("The story writer");
    return NextResponse.json(chapter);
  } catch (err) {
    console.error("[api/story]", err instanceof Error ? err.message : err);
    return providerFailed("The story writer");
  }
}

const MAX_BODY = 12000;

/** Reshape the model's JSON into a Chapter. Missing languages pass through as
 * empty strings, which the chapter page already renders honestly. */
function cleanChapter(raw: Partial<Chapter> | null): Chapter | null {
  const titleUr = typeof raw?.title?.ur === "string" ? raw.title.ur.trim().slice(0, 160) : "";
  const titleEn = typeof raw?.title?.en === "string" ? raw.title.en.trim().slice(0, 160) : "";
  const bodyUr = typeof raw?.body?.ur === "string" ? raw.body.ur.trim().slice(0, MAX_BODY) : "";
  const bodyEn = typeof raw?.body?.en === "string" ? raw.body.en.trim().slice(0, MAX_BODY) : "";
  if (!titleEn && !titleUr) return null;
  if (!bodyEn && !bodyUr) return null;

  const quote = raw?.pullQuote;
  const pullQuote =
    quote && typeof quote.text === "string" && typeof quote.turnIndex === "number" && quote.text.trim()
      ? { text: quote.text.trim().slice(0, 400), turnIndex: Math.max(0, Math.floor(quote.turnIndex)) }
      : undefined;

  return {
    title: { ur: titleUr, en: titleEn },
    body: { ur: bodyUr, en: bodyEn },
    sourceTurns: Array.isArray(raw?.sourceTurns)
      ? raw.sourceTurns.filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0).slice(0, 120)
      : [],
    pullQuote,
    year: typeof raw?.year === "string" ? raw.year.trim().slice(0, 20) || undefined : undefined,
    place: typeof raw?.place === "string" ? raw.place.trim().slice(0, 120) || undefined : undefined,
  };
}
