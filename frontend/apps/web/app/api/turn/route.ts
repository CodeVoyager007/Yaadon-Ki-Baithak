import { NextResponse } from "next/server";
import {
  interviewerSystemPrompt,
  interviewerUserPrompt,
  type InterviewerDecision,
} from "@baithak/agents";
import { guardApi } from "@/lib/server/guard";
import { hasGemini } from "@/lib/server/env";
import { badBody, notConfigured, providerFailed, readJson } from "@/lib/server/http";
import { cleanElder, cleanTurns, cleanTheme } from "@/lib/server/input";
import { generateJson } from "@/lib/server/gemini";

/**
 * POST /api/turn — the interviewer agent (Gemini Flash).
 * Body: { elder, theme, turns, skipped? } -> InterviewerDecision.
 * The route only validates and reshapes; every word of the question comes
 * from the model, which follows the safety rules in the agent prompt.
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

  const user =
    interviewerUserPrompt(turns) +
    (body.skipped === true ? "\n\nThe elder skipped the last question. Choose a different, gentle topic." : "");

  try {
    const raw = await generateJson<Partial<InterviewerDecision>>(
      interviewerSystemPrompt(elder, cleanTheme(body.theme)),
      user,
    );
    const decision = cleanDecision(raw);
    if (!decision) return providerFailed("The interviewer");
    return NextResponse.json(decision);
  } catch (err) {
    console.error("[api/turn]", err instanceof Error ? err.message : err);
    return providerFailed("The interviewer");
  }
}

/** Reshape whatever the model returned into InterviewerDecision; never invent content here. */
function cleanDecision(raw: Partial<InterviewerDecision> | null): InterviewerDecision | null {
  const ur = typeof raw?.question?.ur === "string" ? raw.question.ur.trim() : "";
  const en = typeof raw?.question?.en === "string" ? raw.question.en.trim() : "";
  if (!ur || !en) return null;
  const action = raw?.action === "new_topic" || raw?.action === "wrap_up" ? raw.action : "follow_up";
  return {
    action,
    question: { ur, en },
    why: typeof raw?.why === "string" ? raw.why.slice(0, 300) : "",
    heard: Array.isArray(raw?.heard)
      ? raw.heard.filter((h): h is string => typeof h === "string").slice(0, 40)
      : [],
  };
}
