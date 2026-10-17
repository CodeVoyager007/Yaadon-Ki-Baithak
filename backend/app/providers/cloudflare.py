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


async def _run(model: str, body: dict[str, Any]) -> dict[str, Any]:
    s = settings()
    if not s.has_cloudflare:
        raise RuntimeError("Cloudflare keys are missing")
    res = await client().post(
        f"https://api.cloudflare.com/client/v4/accounts/{s.cloudflare_account_id}/ai/run/{model}",
        headers={"Authorization": f"Bearer {s.cloudflare_api_token}"},
        json=body,
        timeout=TIMEOUT_S,
    )
    if res.status_code != 200:
        raise RuntimeError(f"Cloudflare answered {res.status_code}")
    data = res.json()
    if not data.get("success") or data.get("result") is None:
        raise RuntimeError("Cloudflare returned no result")
    return data["result"]


async def paint(req: IllustrationRequest) -> bytes:
    """One chapter painting exactly as the illustrator agent asked for it."""
    result = await _run(
        settings().cloudflare_image_model,
        {
            "prompt": req.prompt,
            "seed": req.seed,
            "guidance": req.guidance,
            "num_steps": req.steps,
            "width": req.width,
            "height": req.height,
        },
    )
    if not result.get("image"):
        raise RuntimeError("FLUX returned no image")
    return base64.b64decode(result["image"])


async def transcribe(audio: bytes, lang: str) -> str:
    result = await _run(
        settings().cloudflare_transcribe_model,
        {"audio": base64.b64encode(audio).decode(), "language": "ur" if lang == "ur" else "en", "task": "transcribe"},
    )
    return (result.get("text") or "").strip()
