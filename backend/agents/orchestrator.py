"""Orchestrator: runs the three agents as one team.

Laali (the interviewer) makes the creative decision every turn, including
when the chapter is ready. The orchestrator owns everything around that:
- the hand-off: when Laali wraps up, the session goes to the story writer;
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
from .interviewer import Signals, run_interviewer
from .story_writer import run_story_writer
from .types import Chapter, ElderProfile, IllustrationRequest, InterviewerDecision, JsonModel, TraceStep, Turn

# Paints one request and returns a URL the browser can show (signed URL or data: URL).
Painter = Callable[[IllustrationRequest], Awaitable[str]]

# A painting that takes longer than this is abandoned; the chapter is kept with the theme's picture.
PAINT_TIMEOUT_S = 50


@dataclass
class TurnOutcome:
    decision: Optional[InterviewerDecision]
    handoff: Optional[Literal["story_writer"]] = None
    trace: list[TraceStep] = field(default_factory=list)
    signals: Optional[Signals] = None


@dataclass
class ChapterOutcome:
    chapter: Optional[Chapter]
    image_url: Optional[str] = None
    trace: list[TraceStep] = field(default_factory=list)


def _ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


class Orchestrator:
    def __init__(self, text_model: Optional[JsonModel], painter: Optional[Painter] = None):
        self.text_model = text_model
        self.painter = painter

    async def interview_turn(
        self, elder: ElderProfile, theme: str, turns: list[Turn], skipped: bool = False
    ) -> TurnOutcome:
        """One turn of the conversation. A wrap-up is returned as a hand-off to the story writer."""
        if not self.text_model:
            return TurnOutcome(None, trace=[TraceStep(agent="orchestrator", outcome="interviewer not configured")])
        start = time.perf_counter()
        result = await run_interviewer(self.text_model, elder, theme, turns, skipped)
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

        image_url = await self._paint(chapter, family_seed, trace)
        return ChapterOutcome(chapter, image_url, trace)

    async def _paint(self, chapter: Chapter, family_seed: int, trace: list[TraceStep]) -> Optional[str]:
        if not self.painter:
            trace.append(TraceStep(agent="orchestrator", outcome="illustrator not configured; theme picture used"))
            return None
        request = illustration_request(chapter.title, family_seed, chapter.scene, chapter.year, chapter.place)
        start = time.perf_counter()
        try:
            url = await asyncio.wait_for(self.painter(request), timeout=PAINT_TIMEOUT_S)
        except Exception as err:  # the chapter matters more than its picture
            trace.append(
                TraceStep(agent="illustrator", outcome="failed; chapter kept with theme picture", detail=type(err).__name__, ms=_ms(start))
            )
            return None
        trace.append(TraceStep(agent="illustrator", outcome="painted", detail=request.prompt.split(".")[0], ms=_ms(start)))
        return url
