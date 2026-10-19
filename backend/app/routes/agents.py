"""The agent routes: the interviewer's turn, and the orchestrated book (writer, page setter, art director, illustrator)."""

from __future__ import annotations

import logging

from dataclasses import asdict

from fastapi import APIRouter, Request

from agents import Orchestrator

from ..config import settings
from ..errors import not_configured, provider_failed
from ..inputs import clean_count, clean_elder, clean_painting_brief, clean_seed, clean_theme, clean_turns, read_json
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
        light_model=gemini.generate_json_light if s.has_gemini else None,
    )


@router.post("/turn")
async def turn(request: Request):
    """Body: { elder, theme, turns, skipped?, mode?, storyTurns? } -> InterviewerDecision + handoff + signals + trace.
    mode "clarify": the first storyTurns elder turns are the story told in one go;
    Hudhud asks only about what's unclear in it.
    Every word of the question comes from the model, or from the agent's fixed
    thank-you line at the turn cap."""
    caller = await require_caller(request, "turn")
    if not settings().has_gemini:
        raise not_configured("The AI interviewer")
    body = await read_json(request)
    elder, turns = clean_elder(body.get("elder")), clean_turns(body.get("turns"), allow_empty=True)
    try:
        out = await _orchestrator(caller.user_id).interview_turn(
            elder,
            clean_theme(body.get("theme")),
            turns,
            body.get("skipped") is True,
            "clarify" if body.get("mode") == "clarify" else "interview",
            clean_count(body.get("storyTurns")),
        )
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
    """Body: { elder, theme, turns, familySeed } -> { chapter, draft, imageUrl?, pageImages, trace }.
    The book line in one call. When the story writer can't run, the book is still
    made from the elder's own words (draft: true), laid out and painted; only a
    session with no words at all is a 502."""
    caller = await require_caller(request, "chapter")
    if not (settings().has_gemini or settings().has_cloudflare):
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
        "draft": out.draft,
        "imageUrl": out.image_url,
        "pageImages": out.page_images,
        "trace": [t.model_dump(by_alias=True) for t in out.trace],
    }


@router.post("/illustrate")
async def illustrate(request: Request):
    """Body: { chapter: { title, scene?, year?, place?, pages?: [{ scene }] }, theme?, familySeed }
    -> { imageUrl?, pageImages, trace }. Paints an existing book again, page by page;
    a page without a scene gets one of the theme's."""
    caller = await require_caller(request, "illustrate")
    body = await read_json(request)
    brief = clean_painting_brief(body.get("chapter"))
    try:
        page_images, trace = await _orchestrator(caller.user_id).paint_chapter(brief, clean_seed(body.get("familySeed")), clean_theme(body.get("theme")))
    except Exception as err:
        log.error("[api/illustrate] %s", err)
        raise provider_failed("The illustrator") from None
    return {
        "imageUrl": next((u for u in page_images if u), None),
        "pageImages": page_images,
        "trace": [t.model_dump(by_alias=True) for t in trace],
    }
