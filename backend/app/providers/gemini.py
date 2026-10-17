"""Minimal Gemini REST client. Plain HTTP, no SDK: free tier, small image, and
the key never leaves the server. generate_json is the JsonModel the agents run on."""

from __future__ import annotations

import base64
import json
import re
import struct
from typing import Any

from agents import ModelReplyError

from ..config import settings
from ..http_client import client

BASE = "https://generativelanguage.googleapis.com/v1beta/models"
# Every call is bounded so a hung model can't hold a request open.
TIMEOUT_S = 30.0


async def _generate(model: str, body: dict[str, Any]) -> dict[str, Any]:
    keys = settings().gemini_keys or ((settings().gemini_key,) if settings().gemini_key else ())
    if not keys:
        raise RuntimeError("GEMINI_API_KEY is missing")
    last_err: Exception | None = None
    for key in keys:
        try:
            res = await client().post(
                f"{BASE}/{model}:generateContent",
                headers={"x-goog-api-key": key},
                json=body,
                timeout=TIMEOUT_S,
            )
            if res.status_code == 200:
                return res.json()
            last_err = RuntimeError(f"Gemini answered {res.status_code}")
        except Exception as err:
            last_err = err
            continue
    raise last_err or RuntimeError("Gemini failed on all keys")


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


async def generate_json(system: str, user: str, temperature: float = 0.7) -> Any:
    reply = await _generate(
        settings().gemini_model,
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


async def transcribe(audio: bytes, mime_type: str, lang: str) -> str:
    """Verbatim transcript of one answer in the elder's own voice."""
    spoken = "Urdu" if lang == "ur" else "English"
    reply = await _generate(
        settings().gemini_model,
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
