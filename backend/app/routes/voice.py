"""Voice routes: the elder's answer in (transcribe) and Birdy's question out (tts)."""

from __future__ import annotations

import logging
import uuid
from collections import OrderedDict
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import Response
from starlette.datastructures import UploadFile

from ..config import settings
from ..errors import bad_body, not_configured, provider_failed
from ..inputs import read_json
from ..providers import cloudflare, gemini
from ..security import require_caller
from ..supabase import as_user

router = APIRouter(prefix="/api")
log = logging.getLogger("baithak.voice")

# Gemini's inline-audio limit is 20 MB; anything bigger is not one answer.
MAX_AUDIO = 20 * 1024 * 1024


@router.post("/transcribe")
async def transcribe(request: Request):
    """FormData { audio, lang, sessionId? } -> { text, audioPath? }.
    Gemini hears it first, Cloudflare Whisper is the backup. A signed-in caller's
    recording is also kept in the private audio bucket, written with their own
    token so RLS proves they own the family folder."""
    caller = await require_caller(request, "transcribe")
    s = settings()
    if not (s.has_gemini or s.has_cloudflare):
        raise not_configured("Transcription")
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_AUDIO + 64_000:
        raise bad_body()
    try:
        form = await request.form(max_files=1, max_fields=4)
    except Exception:
        raise bad_body() from None
    audio = form.get("audio")
    if not isinstance(audio, UploadFile):
        raise bad_body()
    data = await audio.read(MAX_AUDIO + 1)
    if not data or len(data) > MAX_AUDIO:
        raise bad_body()
    lang = "en" if form.get("lang") == "en" else "ur"
    session_id = form.get("sessionId") if isinstance(form.get("sessionId"), str) else None
    mime = audio.content_type or "audio/webm"

    text = await _hear(data, mime, lang)
    if text is None:
        raise provider_failed("The transcription")

    # The clip is still on the device and transcription already worked, so storage failures are silent.
    audio_path = None
    if caller.user_id and caller.token and session_id:
        try:
            audio_path = await _save_clip(caller.token, caller.user_id, session_id, data, mime)
        except Exception as err:
            log.warning("[api/transcribe] clip not stored: %s", err)
    return {"text": text, "audioPath": audio_path}


async def _hear(data: bytes, mime: str, lang: str) -> Optional[str]:
    """Gemini first, Whisper second; None only when both are unusable."""
    s = settings()
    if s.has_gemini:
        try:
            return await gemini.transcribe(data, mime, lang)
        except Exception as err:
            log.error("[api/transcribe] gemini %s", err)
    if s.has_cloudflare:
        try:
            return await cloudflare.transcribe(data, lang)
        except Exception as err:
            log.error("[api/transcribe] whisper %s", err)
    return None


async def _save_clip(token: str, user_id: str, session_id: str, data: bytes, mime: str) -> Optional[str]:
    """Session -> elder -> family, read as the caller, stopping the moment RLS hides a link."""
    try:
        uuid.UUID(session_id)
    except ValueError:
        return None
    db = as_user(token)
    session = await db.first("sessions", {"select": "elder_id", "id": f"eq.{session_id}"})
    elder = await db.first("elders", {"select": "family_id", "id": f"eq.{session['elder_id']}"}) if session else None
    family = (
        await db.first("families", {"select": "id", "id": f"eq.{elder['family_id']}", "owner_id": f"eq.{user_id}"})
        if elder
        else None
    )
    if not family:
        return None
    ext = "m4a" if any(k in mime.lower() for k in ("mp4", "m4a", "aac")) else "webm"
    path = f"{family['id']}/audio/{uuid.uuid4()}.{ext}"
    await db.upload("audio", path, data, mime)
    return path


# Birdy asks the same opening questions again and again; cache them so repeats are free.
_tts_cache: "OrderedDict[str, bytes]" = OrderedDict()
TTS_CACHE_SIZE = 64


@router.post("/tts")
async def tts(request: Request):
    """Body: { text, lang } -> audio/wav. Only Birdy is ever synthesized; the elder's
    voice is never cloned. If the model can't speak the line, 502 and the browser
    uses its own speechSynthesis voice."""
    await require_caller(request, "tts")
    if not settings().has_gemini:
        raise not_configured("Birdy's voice")
    body = await read_json(request)
    text = body.get("text").strip()[:500] if isinstance(body.get("text"), str) else ""
    if not text:
        raise bad_body()
    wav = _tts_cache.get(text)
    if wav is None:
        try:
            wav = await gemini.speak(text)
        except Exception as err:
            log.error("[api/tts] %s", err)
            raise provider_failed("Birdy's voice") from None
        _tts_cache[text] = wav
        if len(_tts_cache) > TTS_CACHE_SIZE:
            _tts_cache.popitem(last=False)
    else:
        _tts_cache.move_to_end(text)
    return Response(wav, media_type="audio/wav", headers={"Cache-Control": "no-store"})
