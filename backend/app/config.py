"""Environment settings. Every key is server-only and never sent to a client.

Defaults are the free-tier picks documented in backend/README.md. APP_ENV
defaults to production, so a deployment that forgets it stays locked rather
than open; local development sets APP_ENV=development in .env.
"""

from __future__ import annotations

import os
from urllib.parse import urlsplit
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    load_dotenv()
except Exception:
    pass


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, "").strip() or default


def _origin(url: str) -> str:
    parts = urlsplit(url.strip())
    return f"{parts.scheme}://{parts.netloc}" if parts.scheme and parts.netloc else url.strip().rstrip("/")


@dataclass(frozen=True)
class Settings:
    app_env: str = field(default_factory=lambda: _env("APP_ENV", "production"))
    # Proxies in front of us that append to X-Forwarded-For (Hugging Face / Render: 1; none locally: 0).
    trusted_proxy_hops: int = field(default_factory=lambda: max(0, int(_env("TRUSTED_PROXY_HOPS", "1") or 0)))
    allowed_origins: tuple[str, ...] = field(
        default_factory=lambda: tuple(o.strip().rstrip("/") for o in _env("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip())
    )

    gemini_key: str = field(default_factory=lambda: _env("GEMINI_API_KEY"))
    gemini_model: str = field(default_factory=lambda: _env("GEMINI_MODEL", "gemini-2.5-flash"))
    gemini_tts_model: str = field(default_factory=lambda: _env("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts"))
    # Free-tier quotas are per model, so when one model runs out the next one still answers.
    gemini_fallback_models: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            m.strip() for m in _env("GEMINI_FALLBACK_MODELS", "gemini-2.5-flash-lite,gemini-2.0-flash").split(",") if m.strip()
        )
    )
    # Small jobs (transcribing each answer, painting briefs) run on a lighter model with its own quota,
    # so they don't eat the story writer's.
    gemini_light_model: str = field(default_factory=lambda: _env("GEMINI_LIGHT_MODEL", "gemini-2.5-flash-lite"))

    cloudflare_account_id: str = field(default_factory=lambda: _env("CLOUDFLARE_ACCOUNT_ID"))
    cloudflare_api_token: str = field(default_factory=lambda: _env("CLOUDFLARE_API_TOKEN"))
    cloudflare_image_model: str = field(default_factory=lambda: _env("CLOUDFLARE_IMAGE_MODEL", "@cf/black-forest-labs/flux-1-schnell"))
    cloudflare_transcribe_model: str = field(
        default_factory=lambda: _env("CLOUDFLARE_TRANSCRIBE_MODEL", "@cf/openai/whisper-large-v3-turbo")
    )

    # Only the origin: the dashboard also shows the REST endpoint (…/rest/v1/), which would break every call.
    supabase_url: str = field(default_factory=lambda: _origin(_env("SUPABASE_URL")))
    supabase_anon_key: str = field(default_factory=lambda: _env("SUPABASE_ANON_KEY"))
    supabase_service_key: str = field(default_factory=lambda: _env("SUPABASE_SERVICE_ROLE_KEY"))

    @property
    def production(self) -> bool:
        return self.app_env != "development"

    @property
    def has_gemini(self) -> bool:
        return bool(self.gemini_key or _env("GEMINI_API_KEYS"))

    @property
    def gemini_keys(self) -> tuple[str, ...]:
        keys = []
        raw_multi = _env("GEMINI_API_KEYS")
        if raw_multi:
            keys.extend([k.strip() for k in raw_multi.split(",") if k.strip()])
        if self.gemini_key and self.gemini_key not in keys:
            keys.insert(0, self.gemini_key)
        fallback = _env("GEMINI_API_KEY_FALLBACK")
        if fallback and fallback not in keys:
            keys.append(fallback)
        return tuple(keys)

    @property
    def has_cloudflare(self) -> bool:
        return bool(self.cloudflare_account_id and self.cloudflare_api_token)

    @property
    def has_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key)

    @property
    def has_service_role(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_key)


@lru_cache
def settings() -> Settings:
    return Settings()
