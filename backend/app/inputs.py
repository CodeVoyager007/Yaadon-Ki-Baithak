"""Input hygiene shared by the agent routes. Everything the browser sends is
untrusted: clamp it, drop what doesn't belong, and answer 400 when the
request is unusable. Bounded input also keeps free-tier quota safe."""

from __future__ import annotations

import json
import math
from typing import Any

from fastapi import Request

import re

from agents import Bilingual, Chapter, ElderProfile, Turn

from .errors import bad_body

# One turn can be a whole story told in one go (about ten minutes of speech).
MAX_TEXT = 12_000
MAX_JSON_BYTES = 512_000


async def read_json(request: Request) -> dict[str, Any]:
    """A JSON object body with a size cap, checked on Content-Length and on the bytes read."""
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_JSON_BYTES:
        raise bad_body()
    raw = await request.body()
    if len(raw) > MAX_JSON_BYTES:
        raise bad_body()
    try:
        body = json.loads(raw)
    except (ValueError, RecursionError):  # bad JSON, bad UTF-8, or nesting deep enough to blow the stack
        raise bad_body() from None
    if not isinstance(body, dict):
        raise bad_body()
    return body


def _short(value: Any, limit: int) -> str:
    return value.strip()[:limit] if isinstance(value, str) else ""


def clean_elder(raw: Any) -> ElderProfile:
    """Three required fields, everything else optional and short."""
    e = raw if isinstance(raw, dict) else {}
    name, relation, language = _short(e.get("name"), 80), _short(e.get("relation"), 40), _short(e.get("language"), 40)
    if not (name and relation and language):
        raise bad_body()
    return ElderProfile(
        name=name,
        relation=relation,
        language=language,
        birthplace=_short(e.get("birthplace"), 120) or None,
        birth_year=_short(e.get("birthYear"), 20) or None,
    )


def clean_turns(raw: Any, max_turns: int = 40, allow_empty: bool = False) -> list[Turn]:
    """The conversation so far: only the last N turns, each with readable text.
    Empty is only allowed for the interviewer, e.g. a skip before the first answer."""
    if not isinstance(raw, list):
        raise bad_body()
    turns: list[Turn] = []
    for item in raw[-max_turns:]:
        t = item if isinstance(item, dict) else {}
        text = _short(t.get("text"), MAX_TEXT)
        if t.get("role") not in ("elder", "birdy") or not text:
            continue
        index = t.get("index")
        turns.append(
            Turn(
                role=t["role"],
                text=text,
                lang="en" if t.get("lang") == "en" else "ur",
                index=index if isinstance(index, int) and not isinstance(index, bool) and index >= 0 else None,
                started_at=_short(t.get("startedAt"), 40),
            )
        )
    if not turns and not allow_empty:
        raise bad_body()
    return turns


def clean_theme(raw: Any) -> str:
    return _short(raw, 60) or "Free talk"


def clean_painting_brief(raw: Any) -> Chapter:
    """Only what the illustrator reads from a stored chapter (title, scene, year, place), clamped.
    The chapter body never goes to the painter."""
    c = raw if isinstance(raw, dict) else {}
    title = c.get("title") if isinstance(c.get("title"), dict) else {}
    en, ur = _short(title.get("en"), 120), _short(title.get("ur"), 120)
    if not en and not ur:
        raise bad_body()
    year = _short(c.get("year"), 8)
    return Chapter(
        title=Bilingual(en=en, ur=ur),
        body=Bilingual(en="", ur=""),
        scene=_short(c.get("scene"), 300) or None,
        year=year if re.fullmatch(r"1[89]\d\d|20\d\d", year) else None,
        place=_short(c.get("place"), 60) or None,
    )


def clean_count(raw: Any, limit: int = 40) -> int:
    if isinstance(raw, bool) or not isinstance(raw, int):
        return 0
    return max(0, min(raw, limit))


def clean_seed(raw: Any) -> int:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)) or not math.isfinite(raw):
        return 0
    return abs(int(raw)) % 1_000_000
