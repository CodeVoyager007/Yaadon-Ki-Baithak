import { runStoryWriter } from "@baithak/agents";
import { guardApi } from "../guard.ts";
import { hasGemini } from "../env.ts";
import { badBody, notConfigured, ok, providerFailed, readJson } from "../http.ts";
import { cleanElder, cleanTheme, cleanTurns } from "../input.ts";
import { generateJson } from "../providers/gemini.ts";

/**
 * POST /api/story — the story writer agent (Gemini Flash).
 * Body: { elder, theme, turns } -> Chapter.
 * "Never invent facts" is enforced in the agent as well as in its prompt:
 * quotes and years it can't find in the transcript are dropped. If no usable
 * chapter comes back we answer 502 and the browser saves the plain transcript
 * as a labelled draft.
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
    const chapter = await runStoryWriter(generateJson, { elder, theme: cleanTheme(body.theme), turns });
    if (!chapter) return providerFailed("The story writer");
    return ok(chapter);
  } catch (err) {
    console.error("[api/story]", err instanceof Error ? err.message : err);
    return providerFailed("The story writer");
  }
}
