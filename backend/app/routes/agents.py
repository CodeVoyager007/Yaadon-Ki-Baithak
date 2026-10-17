"""The agent routes: interviewer, story writer, the orchestrated chapter, and a fresh painting."""

from __future__ import annotations

import logging

from dataclasses import asdict

from fastapi import APIRouter, Request

from agents import Orchestrator, illustration_request, run_story_writer

from ..config import settings
from ..errors import ApiError, not_configured, provider_failed
from ..inputs import chapter_art_fields, clean_elder, clean_seed, clean_theme, clean_turns, read_json
from ..painting import painter_for
from ..providers import gemini
from ..security import require_caller

router = APIRouter(prefix="/api")
log = logging.getLogger("baithak.agents")


def _orchestrator(user_id):
    s = settings()
    return Orchestrator(
        text_model=gemini.generate_json if s.has_gemini else None,
        painter=painter_for(user_id) if s.has_cloudflare else None,
    )


@router.post("/turn")
async def turn(request: Request):
    """Body: { elder, theme, turns, skipped? } -> InterviewerDecision + handoff + signals + trace.
    Every word of the question comes from the model, or from the agent's fixed
    thank-you line at the turn cap."""
    caller = await require_caller(request, "turn")
    if not settings().has_gemini:
        raise not_configured("The AI interviewer")
    body = await read_json(request)
    elder, turns = clean_elder(body.get("elder")), clean_turns(body.get("turns"), allow_empty=True)
    try:
        out = await _orchestrator(caller.user_id).interview_turn(elder, clean_theme(body.get("theme")), turns, body.get("skipped") is True)
    except Exception as err:
        log.error("[api/turn] %s", err)
        raise provider_failed("The interviewer") from None
    if not out.decision:
        raise provider_failed("The interviewer")
    return {
        **out.decision.model_dump(by_alias=True),
        "handoff": out.handoff,
        # What Hudhud noticed before deciding; drives the record screen's notebook panel.
        "signals": asdict(out.signals) if out.signals else None,
        "trace": [t.model_dump(by_alias=True) for t in out.trace],
    }


@router.post("/chapter")
async def chapter(request: Request):
    """Body: { elder, theme, turns, familySeed } -> { chapter, imageUrl?, trace }.
    The hand-off pipeline in one call: story writer, then illustrator. A failed
    painting still returns the chapter; no chapter is a 502 and the browser keeps
    the transcript as a draft."""
    caller = await require_caller(request, "chapter")
    if not settings().has_gemini:
        raise not_configured("The story writer")
    body = await read_json(request)
    elder, turns = clean_elder(body.get("elder")), clean_turns(body.get("turns"), 60)
    try:
        out = await _orchestrator(caller.user_id).write_chapter(
            elder, clean_theme(body.get("theme")), turns, clean_seed(body.get("familySeed"))
        )
    except Exception as err:
        log.error("[api/chapter] %s", err)
        raise provider_failed("The story writer") from None
    if not out.chapter:
        raise provider_failed("The story writer")
    return {
        "chapter": out.chapter.model_dump(by_alias=True, exclude_none=True),
        "imageUrl": out.image_url,
        "trace": [t.model_dump(by_alias=True) for t in out.trace],
    }


@router.post("/story")
async def story(request: Request):
    """Body: { elder, theme, turns } -> Chapter. The writer alone, e.g. to rewrite a chapter."""
    await require_caller(request, "story")
    if not settings().has_gemini:
        raise not_configured("The story writer")
    body = await read_json(request)
    elder, turns = clean_elder(body.get("elder")), clean_turns(body.get("turns"), 60)
    try:
        written = await run_story_writer(gemini.generate_json, elder, clean_theme(body.get("theme")), turns)
    except Exception as err:
        log.error("[api/story] %s", err)
        raise provider_failed("The story writer") from None
    if not written:
        raise provider_failed("The story writer")
    return written.model_dump(by_alias=True, exclude_none=True)


@router.post("/illustrate")
async def illustrate(request: Request):
    """Body: { chapter, familySeed } -> { imageUrl }. The "New picture" button."""
    caller = await require_caller(request, "illustrate")
    if not settings().has_cloudflare:
        raise not_configured("The illustrator")
    body = await read_json(request)
    title, scene, year, place = chapter_art_fields(body.get("chapter"))
    req = illustration_request(title, clean_seed(body.get("familySeed")), scene, year, place)
    try:
        return {"imageUrl": await painter_for(caller.user_id)(req)}
    except ApiError:
        raise
    except Exception as err:
        log.error("[api/illustrate] %s", err)
        raise provider_failed("The illustrator") from None
