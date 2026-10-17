"""Input hygiene shared by the agent routes. Everything the browser sends is
untrusted: clamp it, drop what doesn't belong, and answer 400 when the
request is unusable. Bounded input also keeps free-tier quota safe."""

from __future__ import annotations

import json
import math
from typing import Any, Optional

from fastapi import Request

from agents import Bilingual, ElderProfile, Turn

from .errors import bad_body

MAX_TEXT = 2000
MAX_JSON_BYTES = 256_000


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
    except (json.JSONDecodeError, UnicodeDecodeError):
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


def clean_turns(raw: Any, max_turns: int = 40) -> list[Turn]:
    """The conversation so far: only the last N turns, each with readable text."""
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
    if not turns:
        raise bad_body()
    return turns


def clean_theme(raw: Any) -> str:
    return _short(raw, 60) or "Free talk"


def clean_seed(raw: Any) -> int:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)) or not math.isfinite(raw):
        return 0
    return abs(int(raw)) % 1_000_000


def chapter_art_fields(raw: Any) -> tuple[Bilingual, Optional[str], Optional[str], Optional[str]]:
    """Only what the illustrator reads from a chapter: title, scene, year, place."""
    c = raw if isinstance(raw, dict) else {}
    title = c.get("title") if isinstance(c.get("title"), dict) else {}
    title_en = _short(title.get("en"), 160)
    if not title_en:
        raise bad_body()
    return (
        Bilingual(en=title_en),
        _short(c.get("scene"), 400) or None,
        _short(c.get("year"), 20) or None,
        _short(c.get("place"), 120) or None,
    )
