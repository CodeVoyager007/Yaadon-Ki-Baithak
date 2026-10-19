"""Cloudflare Workers AI over REST: FLUX.1 schnell paints the chapters, Whisper
is the backup transcriber. Free tier; the token never leaves the server."""

from __future__ import annotations

import base64
from typing import Any

from agents import IllustrationRequest

from ..config import settings
from ..http_client import client

# Painting can take a while; a hung model still can't hold the request open.
TIMEOUT_S = 45.0
# FLUX.1 schnell takes at most 8 steps and a prompt of at most 2048 characters.
MAX_STEPS = 8
MAX_PROMPT = 2048


class CloudflareError(RuntimeError):
    """A failed call, with Cloudflare's own short reason (never the token), so logs and traces say why."""

    def __init__(self, status: int, reason: str = ""):
        self.status = status
        super().__init__(f"Cloudflare answered {status}" + (f": {reason}" if reason else ""))


def _reason(res: Any) -> str:
    try:
        errors = res.json().get("errors") or []
        return str(errors[0].get("message", ""))[:160] if errors else ""
    except Exception:
        return ""


async def _run(model: str, body: dict[str, Any], timeout: float = TIMEOUT_S) -> dict[str, Any]:
    s = settings()
    if not s.has_cloudflare:
        raise RuntimeError("Cloudflare keys are missing")
    res = await client().post(
        f"https://api.cloudflare.com/client/v4/accounts/{s.cloudflare_account_id}/ai/run/{model}",
        headers={"Authorization": f"Bearer {s.cloudflare_api_token}"},
        json=body,
        timeout=timeout,
    )
    if res.status_code != 200:
        raise CloudflareError(res.status_code, _reason(res))
    # Image models may answer with the picture itself instead of JSON.
    if res.headers.get("content-type", "").startswith("image/"):
        return {"image_bytes": res.content}
    data = res.json()
    if not data.get("success") or data.get("result") is None:
        raise CloudflareError(200, "no result")
    return data["result"]


async def paint(req: IllustrationRequest) -> bytes:
    """One painting exactly as the illustrator agent asked for it. Only FLUX.1 schnell's own inputs are
    sent (prompt, steps, seed); if Cloudflare still rejects the request, it is retried with the prompt alone."""
    model = settings().cloudflare_image_model
    prompt = req.prompt[:MAX_PROMPT]
    try:
        result = await _run(model, {"prompt": prompt, "steps": min(req.steps, MAX_STEPS), "seed": req.seed})
    except CloudflareError as err:
        if err.status != 400:
            raise
        result = await _run(model, {"prompt": prompt})
    if result.get("image_bytes"):
        return result["image_bytes"]
    if not result.get("image"):
        raise CloudflareError(200, "FLUX returned no image")
    return base64.b64decode(result["image"])


async def transcribe(audio: bytes, lang: str) -> str:
    result = await _run(
        settings().cloudflare_transcribe_model,
        {"audio": base64.b64encode(audio).decode(), "language": "ur" if lang == "ur" else "en", "task": "transcribe"},
        120.0,  # a whole story can be ten minutes of audio
    )
    return (result.get("text") or "").strip()
