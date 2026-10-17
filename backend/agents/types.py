"""Shared shapes passed between the web app, the API and the agents.

Field names are snake_case in Python and camelCase on the wire (sourceTurns,
pullQuote, birthYear...), which is the contract frontend/lib/types.ts expects.
"""

from __future__ import annotations

from typing import Any, Awaitable, Callable, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

Lang = Literal["ur", "en"]
Mood = Literal["normal", "sensitive"]
Action = Literal["follow_up", "new_topic", "wrap_up"]


class Wire(BaseModel):
    """camelCase JSON in and out; snake_case attributes in Python."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Turn(Wire):
    """One back-and-forth in an interview session."""

    role: Literal["elder", "birdy"]
    text: str
    lang: Lang = "ur"
    # Position in the full session, so sourceTurns stay stable when old turns are clamped away.
    index: Optional[int] = None
    started_at: str = ""


class ElderProfile(Wire):
    name: str
    relation: str  # Nani, Dada, ...
    language: str
    birthplace: Optional[str] = None
    birth_year: Optional[str] = None


class Bilingual(Wire):
    ur: str = ""
    en: str = ""


class InterviewerDecision(Wire):
    """What Birdy decides after each elder turn. wrap_up is the hand-off to the writer."""

    action: Action
    question: Bilingual
    mood: Mood = "normal"
    why: str = ""  # short reason, shown in the "agent thinking" trace
    heard: list[str] = Field(default_factory=list)  # people, places, years, objects so far


class PullQuote(Wire):
    text: str
    turn_index: int


class Chapter(Wire):
    title: Bilingual
    body: Bilingual
    source_turns: list[int] = Field(default_factory=list)
    pull_quote: Optional[PullQuote] = None  # said word for word, played in the real voice
    year: Optional[str] = None
    place: Optional[str] = None
    unclear: list[str] = Field(default_factory=list)  # marked [unclear] in the body, never guessed
    scene: Optional[str] = None  # one calm visual scene for the illustrator


class IllustrationRequest(Wire):
    prompt: str
    negative_prompt: str
    seed: int
    steps: int = 4
    guidance: float = 3.5
    width: int = 1024
    height: int = 1024


class TraceStep(Wire):
    """One step the orchestrator took, for the demo's "agent thinking" panel."""

    agent: Literal["interviewer", "story_writer", "illustrator", "orchestrator"]
    outcome: str
    detail: str = ""
    ms: int = 0


# The only thing an agent needs from a model: system + user prompt in, parsed JSON out.
# The API passes its Gemini client; tests pass a fake. Agents never hold keys or do I/O.
JsonModel = Callable[[str, str, float], Awaitable[Any]]


class ModelReplyError(ValueError):
    """The model answered, but not with usable JSON. Worth one retry; a network error is not."""
