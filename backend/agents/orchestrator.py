"""Orchestrator: runs the agents as one team.

Hudhud (the interviewer) makes the creative decision every turn, including
when the story is ready. Then a book is made by a line of agents, each with
one job:
  story writer (edits the story) -> page setter (lays out pages)
  -> art director (a painting brief per page) -> illustrator (paints the pages
  side by side) -> the orchestrator binds the book.
The orchestrator owns everything around them:
- the hand-off: when Hudhud wraps up, the session goes to the story writer;
- failure policy: each step has a fallback, so one tired model never costs the
  family their book. No edited story: the page setter lays out the elder's own
  words as a draft. No briefs: the theme's calm scenes. A failed painting:
  that page keeps the theme picture;
- a trace of every step with timings, for the demo's "agent thinking" panel.

It is deliberately plain code, not another LLM: routing has exactly one right
answer at each step, so a model here would only add latency and a new way to fail.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Literal, Optional

from .art_director import fill_from_theme, run_art_director
from .illustrator import illustration_request
from .interviewer import Mode, Signals, run_interviewer
from .page_setter import draft_chapter, lay_out
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
    draft: bool = False  # the story writer couldn't run; the pages are the elder's words as said


def _why(err: Exception) -> str:
    return (str(err) or type(err).__name__)[:200]


def _ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


class Orchestrator:
    def __init__(self, text_model: Optional[JsonModel], painter: Optional[Painter] = None, light_model: Optional[JsonModel] = None):
        self.text_model = text_model
        self.painter = painter
        # Small jobs (painting briefs) run on a lighter model with its own quota.
        self.light_model = light_model or text_model

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
        """The book line: story writer, page setter, art director, illustrator."""
        trace: list[TraceStep] = []

        # 1. Story writer: the edited story, in their voice.
        chapter: Optional[Chapter] = None
        start = time.perf_counter()
        if self.text_model:
            try:
                chapter = await run_story_writer(self.text_model, elder, theme, turns)
            except Exception as err:
                trace.append(TraceStep(agent="story_writer", outcome="unavailable", detail=_why(err), ms=_ms(start)))
            else:
                if chapter:
                    trace.append(
                        TraceStep(
                            agent="story_writer",
                            outcome="story edited",
                            detail=f"{len(chapter.source_turns)} answers used, {len(chapter.unclear)} unclear parts marked",
                            ms=_ms(start),
                        )
                    )
                else:
                    trace.append(TraceStep(agent="story_writer", outcome="no usable story", ms=_ms(start)))
        else:
            trace.append(TraceStep(agent="orchestrator", outcome="story writer not configured"))

        # 2. Page setter: pages from the edited story, or from their own words as a draft.
        start = time.perf_counter()
        draft = chapter is None
        if chapter:
            chapter.pages = lay_out(chapter.pages)
        else:
            chapter = draft_chapter(elder, theme, turns)
            if not chapter:
                return ChapterOutcome(None, trace=trace)
        trace.append(
            TraceStep(
                agent="page_setter",
                outcome=f"{len(chapter.pages)} {'page' if len(chapter.pages) == 1 else 'pages'} laid out" + (" from their own words (draft)" if draft else ""),
                detail="whole sentences, Urdu and English on the same page",
                ms=_ms(start),
            )
        )

        # 3. Art director: one painting brief per page.
        await self._direct(chapter, theme, trace)

        # 4. Illustrator: every page, side by side.
        page_images = await self._paint(chapter, family_seed, trace)
        cover = next((u for u in page_images if u), None)
        return ChapterOutcome(chapter, cover, trace, page_images, draft)

    async def _direct(self, chapter: Chapter, theme: str, trace: list[TraceStep]) -> None:
        start = time.perf_counter()
        written = 0
        problem = ""
        try:
            written = await run_art_director(self.light_model, chapter)
        except Exception as err:
            problem = _why(err)
        filled = fill_from_theme(chapter, theme)
        if written:
            outcome = f"wrote {written} painting briefs" + (f", {filled} from the theme" if filled else "")
        elif filled:
            outcome = f"used the theme's scenes for {filled} pages"
        else:
            outcome = "kept the writer's scenes"
        trace.append(TraceStep(agent="art_director", outcome=outcome, detail=problem or (chapter.scene or ""), ms=_ms(start)))

    async def paint_chapter(self, chapter: Chapter, family_seed: int, theme: str = "") -> tuple[list[Optional[str]], list[TraceStep]]:
        """Paint an existing book again, page by page. Pages without a brief get the theme's scenes."""
        trace: list[TraceStep] = []
        fill_from_theme(chapter, theme)
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
        problems: list[str] = []

        async def paint_one(req: IllustrationRequest) -> Optional[str]:
            async with gate:
                try:
                    return await asyncio.wait_for(self.painter(req), timeout=PAINT_TIMEOUT_S)
                except asyncio.TimeoutError:
                    problems.append(f"timed out after {PAINT_TIMEOUT_S} s")
                except Exception as err:
                    problems.append(str(err)[:200] or type(err).__name__)
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
            trace.append(
                TraceStep(agent="illustrator", outcome="failed; book kept with theme pictures", detail=problems[0] if problems else "", ms=_ms(start))
            )
        if done and problems:
            trace[-1].detail = f"{trace[-1].detail}. {len(problems)} failed: {problems[0]}"
        return urls
