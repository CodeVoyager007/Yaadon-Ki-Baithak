"""Checks this machine's keys end to end: `python -m app.check` from backend/.

Reads backend/.env, then makes one tiny real call to each service and says,
in plain words, what works and what doesn't. Never prints a key.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
PAINTING = Path(__file__).resolve().parent.parent / "paint-check.jpg"


def load_env() -> None:
    if not ENV_FILE.exists():
        print(f"!  No {ENV_FILE.name} found in backend/. Copy .env.example to .env and fill it in.")
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


async def check_gemini(s) -> None:
    """Every key against every model the app uses: which still have quota today, before a demo finds out."""
    from .http_client import client
    from .providers import gemini

    text_models = list(dict.fromkeys([s.gemini_model, s.gemini_light_model, *s.gemini_fallback_models]))
    keys = gemini._keys()
    print(f"Gemini: {len(keys)} key(s); the book tries {', '.join(text_models)} in turn")
    body = {"contents": [{"parts": [{"text": "Reply with the word ok."}]}], "generationConfig": {"maxOutputTokens": 5}}
    usable = 0
    for k, key in enumerate(keys, 1):
        for model in text_models:
            try:
                res = await client().post(
                    f"{gemini.BASE}/{model}:generateContent", headers={"x-goog-api-key": key}, json=body, timeout=30
                )
            except Exception as err:
                print(f"   key {k} · {model}: X no answer ({type(err).__name__})")
                continue
            if res.status_code == 200:
                usable += 1
                print(f"   key {k} · {model}: ok")
                continue
            err = gemini._error_from(res, model)
            why = {
                429: "daily quota used up (resets at midnight Pacific)" if err.per_day else f"per-minute limit, free again in {err.retry_after or '?'} s",
                404: "this model isn't available to this key (check the name in AI Studio)",
                403: "key refused (wrong key, or the Generative Language API is off)",
                400: "bad request (often an invalid key)",
            }.get(res.status_code, f"answered {res.status_code}")
            print(f"   key {k} · {model}: X {why}")
    if usable:
        print(f"ok Gemini: {usable} key/model pair(s) answering. Stories will be edited, not drafts.")
    else:
        print("X  Gemini: nothing is answering right now. Books will be drafts (still laid out and painted) until quota returns.")
    print("   Tip: keys made in the same Google project share one quota. Each extra key must come from a different account/project.")


async def main() -> None:
    load_env()
    from agents import Bilingual, illustration_request

    from .config import settings
    from .providers import cloudflare, gemini

    s = settings()
    print("Keys found:", ", ".join(f"{name} {'yes' if ok else 'NO'}" for name, ok in (("Gemini", s.has_gemini), ("Cloudflare", s.has_cloudflare), ("Supabase", s.has_supabase))))

    if s.has_gemini:
        await check_gemini(s)

    if s.has_cloudflare:
        try:
            req = illustration_request(Bilingual(en="A test"), 42, "a brass diya glowing on a wooden windowsill at dusk")
            data = await cloudflare.paint(req)
            PAINTING.write_bytes(data)
            print(f"ok Cloudflare painted a picture ({len(data) // 1024} KB). Open backend/{PAINTING.name} to see it.")
        except Exception as err:
            msg = str(err)[:200]
            hint = (
                "the token is wrong or lacks the Workers AI permission"
                if "401" in msg or "403" in msg or "uthentic" in msg
                else "the free daily limit is used up; it resets at 00:00 UTC"
                if "429" in msg or "limit" in msg.lower()
                else "check CLOUDFLARE_ACCOUNT_ID and the model name"
            )
            print("X  Cloudflare failed:", msg, f"({hint})")
    else:
        print("!  No Cloudflare keys: storybooks use the themed pictures instead of new paintings.")

    if s.has_supabase and s.supabase_service_key:
        from .http_client import client

        from .supabase import service_headers

        headers = service_headers(s.supabase_service_key)
        try:
            res = await client().get(f"{s.supabase_url}/storage/v1/bucket", headers=headers, timeout=15)
            names = {b.get("name") for b in res.json()} if res.status_code == 200 else set()
            missing = {"images", "audio"} - names
            print("ok Supabase storage buckets ready" if not missing else f"X  Supabase storage is missing buckets: {', '.join(sorted(missing))} (run migration 0001)")
            res = await client().get(f"{s.supabase_url}/rest/v1/chapters", params={"select": "pages", "limit": "1"}, headers=headers, timeout=15)
            print("ok Database has storybook pages (migration 0005)" if res.status_code == 200 else "X  Database has no pages column yet: run migration 0005_storybook_pages.sql")
        except Exception as err:
            print("X  Supabase check failed:", str(err)[:200])


if __name__ == "__main__":
    asyncio.run(main())
