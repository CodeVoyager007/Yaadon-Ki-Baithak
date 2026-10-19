"""Orchestrator: runs the three agents as one team.

Hudhud (the interviewer) makes the creative decision every turn, including
when the chapter is ready. The orchestrator owns everything around that:
- the hand-off: when Hudhud wraps up, the session goes to the story writer;
- the pipeline: writer, then illustrator, with the writer's scene passed along;
- failure policy: no chapter means fail honestly (the browser keeps the
  transcript as a draft), but a failed painting still keeps the chapter;
- a trace of every step with timings, for the demo's "agent thinking" panel.

It is deliberately plain code, not another LLM: routing has exactly one right
answer at each step, so a model here would only add latency and a new way to fail.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Literal, Optional

from .illustrator import illustration_request
from .interviewer import Mode, Signals, run_interviewer
from .story_writer import run_story_writer
from .types import Chapter, ElderProfile, IllustrationRequest, InterviewerDecision, JsonModel, TraceStep, Turn

# Paints one request and returns a URL the browser can show (signed URL or data: URL).
Painter = Callable[[IllustrationRequest], Awaitable[str]]

# A painting that takes longer than this is abandoned; the page keeps the theme's picture.
PAINT_TIMEOUT_S = 50
# Pages are painted a few at a time: quick, without bursting the free image quota's rate limit.
PAINT_AT_ONCE = 3
# Page pictures are landscape and smaller than a cover: they sit beside the words.
PAGE_W, PAGE_H = 768, 576


@dataclass
class TurnOutcome:
    decision: Optional[InterviewerDecision]
    handoff: Optional[Literal["story_writer"]] = None
    trace: list[TraceStep] = field(default_factory=list)
    signals: Optional[Signals] = None


@dataclass
class ChapterOutcome:
    chapter: Optional[Chapter]
    image_url: Optional[str] = None  # the cover: the first page that was painted
    trace: list[TraceStep] = field(default_factory=list)
    page_images: list[Optional[str]] = field(default_factory=list)  # one per page, None where painting failed


def _ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


class Orchestrator:
    def __init__(self, text_model: Optional[JsonModel], painter: Optional[Painter] = None):
        self.text_model = text_model
        self.painter = painter

    async def interview_turn(
        self,
        elder: ElderProfile,
        theme: str,
        turns: list[Turn],
        skipped: bool = False,
        mode: Mode = "interview",
        story_turns: int = 0,
    ) -> TurnOutcome:
        """One turn of the conversation. A wrap-up is returned as a hand-off to the story writer."""
        if not self.text_model:
            return TurnOutcome(None, trace=[TraceStep(agent="orchestrator", outcome="interviewer not configured")])
        start = time.perf_counter()
        result = await run_interviewer(self.text_model, elder, theme, turns, skipped, mode, story_turns)
        if not result:
            return TurnOutcome(None, trace=[TraceStep(agent="interviewer", outcome="no usable question", ms=_ms(start))])

        decision, signals = result
        noticed = [n for n, on in (("grief", signals.sensitive), ("tiredness", signals.tired), ("skip", signals.skipped)) if on]
        trace = [
            TraceStep(
                agent="interviewer",
                outcome=f"{decision.action}, mood {decision.mood}",
                detail=decision.why + (f" (cues: {', '.join(noticed)})" if noticed else ""),
                ms=_ms(start),
            )
        ]
        if decision.action != "wrap_up":
            return TurnOutcome(decision, trace=trace, signals=signals)
        trace.append(TraceStep(agent="orchestrator", outcome="hand-off to story writer", detail=f"{signals.answers} answers"))
        return TurnOutcome(decision, handoff="story_writer", trace=trace, signals=signals)

    async def write_chapter(
        self, elder: ElderProfile, theme: str, turns: list[Turn], family_seed: int
    ) -> ChapterOutcome:
        """The hand-off pipeline: story writer, then illustrator on the writer's scene."""
        trace: list[TraceStep] = []
        if not self.text_model:
            return ChapterOutcome(None, trace=[TraceStep(agent="orchestrator", outcome="story writer not configured")])

        start = time.perf_counter()
        chapter = await run_story_writer(self.text_model, elder, theme, turns)
        if not chapter:
            trace.append(TraceStep(agent="story_writer", outcome="no usable chapter", ms=_ms(start)))
            return ChapterOutcome(None, trace=trace)
        trace.append(
            TraceStep(
                agent="story_writer",
                outcome="chapter written",
                detail=f"{len(chapter.source_turns)} answers used, {len(chapter.unclear)} unclear parts marked",
                ms=_ms(start),
            )
        )

        page_images = await self._paint(chapter, family_seed, trace)
        cover = next((u for u in page_images if u), None)
        return ChapterOutcome(chapter, cover, trace, page_images)

    async def paint_chapter(self, chapter: Chapter, family_seed: int) -> tuple[list[Optional[str]], list[TraceStep]]:
        """Paint an existing book again, page by page."""
        trace: list[TraceStep] = []
        return await self._paint(chapter, family_seed, trace), trace

    async def _paint(self, chapter: Chapter, family_seed: int, trace: list[TraceStep]) -> list[Optional[str]]:
        """One painting per page (or one cover for a book without pages). A page that fails keeps its
        place as None, so the book is never lost over a picture."""
        if not self.painter:
            trace.append(TraceStep(agent="orchestrator", outcome="illustrator not configured; theme pictures used"))
            return [None] * len(chapter.pages)
        scenes = [p.scene or chapter.scene for p in chapter.pages] or [chapter.scene]
        requests = [
            illustration_request(chapter.title, (family_seed + i * 7919) % 1_000_000, scene, chapter.year, chapter.place, PAGE_W, PAGE_H)
            for i, scene in enumerate(scenes)
        ]
        gate = asyncio.Semaphore(PAINT_AT_ONCE)

        async def paint_one(req: IllustrationRequest) -> Optional[str]:
            async with gate:
                try:
                    return await asyncio.wait_for(self.painter(req), timeout=PAINT_TIMEOUT_S)
                except Exception:
                    return None

        start = time.perf_counter()
        urls = list(await asyncio.gather(*(paint_one(r) for r in requests)))
        done = sum(1 for u in urls if u)
        if done:
            trace.append(
                TraceStep(
                    agent="illustrator",
                    outcome=f"painted {done} of {len(urls)} pages",
                    detail=requests[0].prompt.split(".")[0],
                    ms=_ms(start),
                )
            )
        else:
            trace.append(TraceStep(agent="illustrator", outcome="failed; book kept with theme pictures", ms=_ms(start)))
        return urls
