"""The guard every AI route runs, in this order: rate limit, then sign-in.

There is no CSRF check because there are no cookies: the browser sends its
Supabase access token as `Authorization: Bearer`, which another site can't
read or attach. CORS (ALLOWED_ORIGINS in main.py) limits which sites may call.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

from fastapi import Request

from .config import settings
from .errors import ApiError
from .supabase import user_id_for

# Best-effort per-client, per-route fixed window: enough for a family's whole
# interview, far too little for a script to burn free-tier quota. In-memory, so
# per instance; one instance is what the free hosts give us anyway.
WINDOW_S = 60.0
MAX_PER_WINDOW = 60
_hits: dict[str, tuple[int, float]] = {}

# Verified tokens are remembered briefly so a 20-turn interview doesn't cost 20 auth calls.
TOKEN_TTL_S = 60.0
_tokens: dict[str, tuple[str, float]] = {}


@dataclass(frozen=True)
class Caller:
    user_id: Optional[str]  # None only in local development without Supabase
    token: Optional[str]


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "local"


def rate_limited(request: Request, route: str) -> bool:
    now = time.monotonic()
    key = f"{route}:{_client_key(request)}"
    count, reset_at = _hits.get(key, (0, 0.0))
    if reset_at <= now:
        _hits[key] = (1, now + WINDOW_S)
        if len(_hits) > 500:  # lazy sweep so a long-lived process never piles up dead keys
            for k in [k for k, (_, r) in _hits.items() if r <= now]:
                del _hits[k]
        return False
    _hits[key] = (count + 1, reset_at)
    return count + 1 > MAX_PER_WINDOW


async def _verify(token: str) -> Optional[str]:
    now = time.monotonic()
    cached = _tokens.get(token)
    if cached and cached[1] > now:
        return cached[0]
    user_id = await user_id_for(token)
    if user_id:
        if len(_tokens) > 1000:
            _tokens.clear()
        _tokens[token] = (user_id, now + TOKEN_TTL_S)
    return user_id


async def require_caller(request: Request, route: str) -> Caller:
    if rate_limited(request, route):
        raise ApiError(429, "Too many tries. Wait a minute and try again.")
    s = settings()
    if not s.has_supabase:
        # Demo mode on a developer's own machine only; a deployment without keys stays locked.
        if s.production:
            raise ApiError(503, "This site isn't set up with its keys yet.")
        return Caller(None, None)
    auth = request.headers.get("authorization", "")
    token = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
    user_id = await _verify(token) if token else None
    if not user_id:
        raise ApiError(401, "Please sign in to continue.")
    return Caller(user_id, token)


def reset_for_tests() -> None:
    _hits.clear()
    _tokens.clear()
