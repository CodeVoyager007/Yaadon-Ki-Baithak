"""Yaadon ki Baithak API: the agents, deployed.

    uvicorn app.main:app --env-file .env --port 8000

Every route answers with the documented shape or {"error": "..."} and a
status the browser maps to a stand-in (see backend/README.md), so nothing
here can break the elder's screen.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import http_client
from .config import settings
from .errors import ApiError
from .routes import agents, share, voice

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await http_client.close()


app = FastAPI(title="Yaadon ki Baithak API", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)

JSON_LIMIT = 512_000
AUDIO_LIMIT = 21 * 1024 * 1024  # one 20 MB answer plus the form around it
TOO_BIG = "That request was too big."

SECURITY_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"referrer-policy", b"no-referrer"),
    (b"x-frame-options", b"DENY"),
    (b"cache-control", b"no-store"),
    # The API only ever returns JSON or audio: nothing in a response may load or run anything.
    (b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'"),
]


class Hardening:
    """Body size limits enforced while the body streams in (a chunked request
    declares no size, so checking afterwards would mean buffering all of it
    first), plus security headers on every response."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        limit = AUDIO_LIMIT if scope["path"] == "/api/transcribe" else JSON_LIMIT

        async def send_hardened(message):
            if message["type"] == "http.response.start":
                names = {k.lower() for k, _ in message.get("headers", [])}
                message["headers"] = list(message.get("headers", [])) + [h for h in SECURITY_HEADERS if h[0] not in names]
            await send(message)

        declared = dict(scope["headers"]).get(b"content-length", b"")
        if declared.isdigit() and int(declared) > limit:
            response = JSONResponse({"error": TOO_BIG}, status_code=400)
            return await response(scope, receive, send_hardened)

        received = 0

        async def receive_limited():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise ApiError(400, TOO_BIG)
            return message

        await self.app(scope, receive_limited, send_hardened)


app.add_middleware(Hardening)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings().allowed_origins),
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)


@app.exception_handler(StarletteHTTPException)
async def http_error(_request: Request, exc: StarletteHTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "That didn't work."
    return JSONResponse({"error": message}, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, _exc: RequestValidationError):
    return JSONResponse({"error": "That request didn't look right."}, status_code=400)


@app.exception_handler(Exception)
async def unexpected_error(_request: Request, exc: Exception):
    # Raw errors stay in the log, never in the response.
    logging.getLogger("baithak").exception("unhandled: %s", exc)
    return JSONResponse({"error": "Something went wrong. Try again in a moment."}, status_code=500)


@app.get("/health")
async def health():
    """For the host's health check and a quick look at what's connected. No secrets."""
    s = settings()
    return {
        "ok": True,
        "gemini": s.has_gemini,
        "cloudflare": s.has_cloudflare,
        "supabase": s.has_supabase,
        "storage": s.has_service_role,
    }


app.include_router(agents.router)
app.include_router(voice.router)
app.include_router(share.router)
