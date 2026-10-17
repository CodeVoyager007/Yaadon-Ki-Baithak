import asyncio
from typing import Any

import pytest

from agents import ModelReplyError, Turn

AT = "2026-10-17T00:00:00.000Z"


def birdy(text: str) -> Turn:
    return Turn(role="birdy", text=text, lang="en", started_at=AT)


def said(text: str, index: int | None = None) -> Turn:
    return Turn(role="elder", text=text, lang="en", index=index, started_at=AT)


class FakeModel:
    """Replays canned replies (an Exception is raised instead) and records every prompt."""

    def __init__(self, *replies: Any):
        self.replies = list(replies)
        self.calls: list[tuple[str, str, float]] = []

    async def __call__(self, system: str, user: str, temperature: float) -> Any:
        self.calls.append((system, user, temperature))
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


def run(coro):
    return asyncio.run(coro)


@pytest.fixture
def bad_json():
    return ModelReplyError("Expecting value")
