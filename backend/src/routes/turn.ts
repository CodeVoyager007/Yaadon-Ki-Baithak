import { runInterviewer } from "@baithak/agents";
import { guardApi } from "../guard.ts";
import { hasGemini } from "../env.ts";
import { badBody, notConfigured, ok, providerFailed, readJson } from "../http.ts";
import { cleanElder, cleanTurns, cleanTheme } from "../input.ts";
import { generateJson } from "../providers/gemini.ts";

/**
 * POST /api/turn — the interviewer agent (Gemini Flash).
 * Body: { elder, theme, turns, skipped? } -> InterviewerDecision.
 * The route validates input and runs the agent; the agent owns the prompt,
 * the safety checks and the hard turn cap. Every word of the question comes
 * from the model, or from the agent's fixed thank-you line at the cap.
 */
export async function POST(request: Request) {
  const auth = await guardApi(request, "turn");
  if (!auth.ok) return auth.response;
  if (!hasGemini) return notConfigured("The AI interviewer");

  const body = await readJson<{ elder?: unknown; theme?: unknown; turns?: unknown; skipped?: unknown }>(request);
  if (!body) return badBody();
  const elder = cleanElder(body.elder);
  const turns = cleanTurns(body.turns);
  if (!elder || !turns) return badBody();

  try {
    const result = await runInterviewer(generateJson, {
      elder,
      theme: cleanTheme(body.theme),
      turns,
      skipped: body.skipped === true,
    });
    if (!result) return providerFailed("The interviewer");
    return ok(result.decision);
  } catch (err) {
    console.error("[api/turn]", err instanceof Error ? err.message : err);
    return providerFailed("The interviewer");
  }
}
