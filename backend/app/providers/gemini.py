"""Minimal Gemini REST client. Plain HTTP, no SDK: free tier, small image, and
the key never leaves the server. generate_json is the JsonModel the agents run on."""

from __future__ import annotations

import base64
import json
import re
import logging
import struct
from typing import Any

from agents import ModelReplyError

from ..config import settings
from ..http_client import client

BASE = "https://generativelanguage.googleapis.com/v1beta/models"
# Every call is bounded so a hung model can't hold a request open.
# Writing a whole picture book (several pages in two languages) can take Gemini a minute.
TIMEOUT_S = 75.0
# A whole story told in one go can be ten minutes of audio.
TRANSCRIBE_TIMEOUT_S = 120.0

log = logging.getLogger("baithak.gemini")


class GeminiError(RuntimeError):
    def __init__(self, status: int, model: str):
        super().__init__(f"Gemini answered {status} ({model})")
        self.status = status
        self.model = model


# A malformed request fails the same way everywhere; anything else (out of quota, overloaded,
# a bad key, a model this key can't use) is worth trying on the next key or model.
SAME_EVERYWHERE = {400}


def _keys() -> tuple[str, ...]:
    keys = settings().gemini_keys or ((settings().gemini_key,) if settings().gemini_key else ())
    if not keys:
        raise RuntimeError("GEMINI_API_KEY is missing")
    return keys


async def _generate(model: str, body: dict[str, Any], timeout: float = TIMEOUT_S) -> dict[str, Any]:
    """One model, every key in turn."""
    last_err: Exception | None = None
    for key in _keys():
        try:
            res = await client().post(
                f"{BASE}/{model}:generateContent",
                headers={"x-goog-api-key": key},
                json=body,
                timeout=timeout,
            )
            if res.status_code == 200:
                return res.json()
            last_err = GeminiError(res.status_code, model)
            if res.status_code in SAME_EVERYWHERE:
                break
        except Exception as err:
            last_err = err
            continue
    raise last_err or RuntimeError("Gemini failed on all keys")


async def _generate_any(models: list[str], body: dict[str, Any], timeout: float = TIMEOUT_S) -> dict[str, Any]:
    """The first model (every key), then each fallback model, so one exhausted quota never stops the book."""
    tried: list[str] = []
    last_err: Exception | None = None
    for model in dict.fromkeys(m for m in models if m):
        try:
            reply = await _generate(model, body, timeout)
            if tried:
                log.info("[gemini] %s answered after %s failed", model, ", ".join(tried))
            return reply
        except GeminiError as err:
            last_err = err
            tried.append(f"{model} ({err.status})")
            if err.status in SAME_EVERYWHERE:
                break
        except Exception as err:
            last_err = err
            tried.append(model)
    raise last_err or RuntimeError("Gemini failed on every model")


def _text_models(first: str) -> list[str]:
    return [first, settings().gemini_model, *settings().gemini_fallback_models]


def _parts(reply: dict[str, Any]) -> list[dict[str, Any]]:
    candidates = reply.get("candidates") or [{}]
    return ((candidates[0] or {}).get("content") or {}).get("parts") or []


def _text(reply: dict[str, Any]) -> str:
    return "".join(p.get("text", "") for p in _parts(reply))


def parse_json(raw: str) -> Any:
    """JSON mode sometimes still wraps the object in fences; strip them.
    Bad JSON raises ModelReplyError, which the agents treat as worth one retry."""
    trimmed = re.sub(r"```$", "", re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.I)).strip()
    try:
        return json.loads(trimmed)
    except json.JSONDecodeError as err:
        raise ModelReplyError(str(err)) from err


async def _json(models: list[str], system: str, user: str, temperature: float) -> Any:
    reply = await _generate_any(
        models,
        {
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "systemInstruction": {"parts": [{"text": system}]},
            "generationConfig": {"temperature": temperature, "responseMimeType": "application/json"},
        },
    )
    text = _text(reply)
    if not text.strip():
        raise ModelReplyError("Gemini returned no text")
    return parse_json(text)


async def generate_json(system: str, user: str, temperature: float = 0.7) -> Any:
    """The JsonModel for the main jobs (interviewer, story writer)."""
    return await _json(_text_models(settings().gemini_model), system, user, temperature)


async def generate_json_light(system: str, user: str, temperature: float = 0.7) -> Any:
    """The JsonModel for small jobs (painting briefs): the light model first, then the rest of the chain."""
    return await _json(_text_models(settings().gemini_light_model), system, user, temperature)


async def transcribe(audio: bytes, mime_type: str, lang: str) -> str:
    """Verbatim transcript of one recording (an answer, or a whole story) in the elder's own voice."""
    spoken = "Urdu" if lang == "ur" else "English"
    reply = await _generate_any(
        _text_models(settings().gemini_light_model),
        {
            "contents": [
                {
                    "parts": [
                        {
                            "text": f"Transcribe this recording of a grandparent speaking {spoken}. "
                            "Verbatim, in the same script they spoke, no translation and no commentary. "
                            "If there is no speech, return an empty string."
                        },
                        {"inlineData": {"mimeType": mime_type, "data": base64.b64encode(audio).decode()}},
                    ]
                }
            ],
            "generationConfig": {"temperature": 0},
        },
        TRANSCRIBE_TIMEOUT_S,
    )
    return _text(reply).strip()


async def speak(text: str, voice: str = "Kore") -> bytes:
    """Hudhud's question voice as a WAV file. Only ever Hudhud: the elder's voice is never cloned."""
    reply = await _generate(
        settings().gemini_tts_model,
        {
            "contents": [{"parts": [{"text": text}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
            },
        },
    )
    data = next((p["inlineData"]["data"] for p in _parts(reply) if p.get("inlineData", {}).get("data")), None)
    if not data:
        raise RuntimeError("Gemini TTS returned no audio")
    return pcm_to_wav(base64.b64decode(data))


def pcm_to_wav(pcm: bytes, sample_rate: int = 24000, channels: int = 1, bits: int = 16) -> bytes:
    """Gemini TTS returns raw 24 kHz 16-bit mono PCM; wrap it so any browser can play it."""
    byte_rate = sample_rate * channels * bits // 8
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + len(pcm), b"WAVE", b"fmt ", 16, 1, channels, sample_rate, byte_rate, channels * bits // 8, bits,
        b"data", len(pcm),
    )
    return header + pcm
