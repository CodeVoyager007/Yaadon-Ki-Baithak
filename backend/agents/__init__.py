"""The Baithak agents: interviewer (Hudhud), story writer, illustrator, and the orchestrator that runs them.

No keys, no network, no web framework in here. The API in app/ hands them a
model function and a painter; tests hand them fakes.
"""

from .illustrator import illustration_request, scene_for
from .interviewer import MAX_ANSWERS, MAX_CLARIFY, WRAP_UP_LINE, read_signals, run_interviewer
from .orchestrator import ChapterOutcome, Orchestrator, TurnOutcome
from .story_writer import parse_chapter, run_story_writer
from .types import (
    Bilingual,
    Chapter,
    ElderProfile,
    IllustrationRequest,
    InterviewerDecision,
    JsonModel,
    ModelReplyError,
    PullQuote,
    TraceStep,
    Turn,
)

__all__ = [
    "MAX_ANSWERS", "MAX_CLARIFY", "WRAP_UP_LINE", "Bilingual", "Chapter", "ChapterOutcome", "ElderProfile", "IllustrationRequest",
    "InterviewerDecision", "JsonModel", "ModelReplyError", "Orchestrator", "PullQuote", "TraceStep", "Turn",
    "TurnOutcome", "illustration_request", "parse_chapter", "read_signals", "run_interviewer", "run_story_writer",
    "scene_for",
]
