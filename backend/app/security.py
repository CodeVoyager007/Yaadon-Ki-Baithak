"""The guard every AI route runs: rate limits, then sign-in.

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

WINDOW_S = 60.0

# Requests per minute, per route. Paintings and chapters are the expensive
# free-tier calls (FLUX allows ~170 images a day), so they get the least.
LIMITS = {
    "turn": 30,
    "transcribe": 30,
    "tts": 30,
    "chapter": 6,
    "share": 60,
}

_hits: dict[str, tuple[int, float]] = {}

# Verified tokens are remembered briefly so an interview doesn't cost an auth call per turn.
TOKEN_TTL_S = 60.0
_tokens: dict[str, tuple[str, float]] = {}

TOO_MANY = "Too many tries. Wait a minute and try again."


@dataclass(frozen=True)
class Caller:
    user_id: Optional[str]  # None only in local development without Supabase
    token: Optional[str]


def client_ip(request: Request) -> str:
    """The caller's IP as seen by our own hosting proxy.

    X-Forwarded-For is a list the client can start with anything it likes;
    each proxy appends the address it received the request from. Only the
    entries our platform added can be trusted, so we count TRUSTED_PROXY_HOPS
    from the right. With no proxy in front (0), the socket peer is used.
    """
    hops = settings().trusted_proxy_hops
    forwarded = [h.strip() for h in request.headers.get("x-forwarded-for", "").split(",") if h.strip()]
    if hops and len(forwarded) >= hops:
        return forwarded[-hops]
    return request.client.host if request.client else "unknown"


def _over(key: str, limit: int) -> bool:
    now = time.monotonic()
    count, reset_at = _hits.get(key, (0, 0.0))
    if reset_at <= now:
        count, reset_at = 0, now + WINDOW_S
        if len(_hits) > 5000:  # sweep expired windows so memory stays bounded
            for k in [k for k, (_, r) in _hits.items() if r <= now]:
                del _hits[k]
    _hits[key] = (count + 1, reset_at)
    return count + 1 > limit


def rate_limited(request: Request, route: str) -> bool:
    return _over(f"{route}:ip:{client_ip(request)}", LIMITS.get(route, 30))


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
    # The IP limit runs before sign-in so a flood of bad tokens can't spend the Supabase auth quota.
    if rate_limited(request, route):
        raise ApiError(429, TOO_MANY)
    s = settings()
    if not s.has_supabase:
        # Demo mode on a developer's own machine only; a deployment without keys stays locked.
        if s.production:
            raise ApiError(503, "This site isn't set up with its keys yet.")
        return Caller(None, None)
    auth = request.headers.get("authorization", "")
    token = auth[7:].strip() if auth[:7].lower() == "bearer " else ""
    user_id = await _verify(token) if token else None
    if not user_id:
        raise ApiError(401, "Please sign in to continue.")
    # A second limit per account, so switching networks doesn't buy more quota.
    if _over(f"{route}:user:{user_id}", LIMITS.get(route, 30)):
        raise ApiError(429, TOO_MANY)
    return Caller(user_id, token)


def reset_for_tests() -> None:
    _hits.clear()
    _tokens.clear()
