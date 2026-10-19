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


async def main() -> None:
    load_env()
    from agents import Bilingual, illustration_request

    from .config import settings
    from .providers import cloudflare, gemini

    s = settings()
    print("Keys found:", ", ".join(f"{name} {'yes' if ok else 'NO'}" for name, ok in (("Gemini", s.has_gemini), ("Cloudflare", s.has_cloudflare), ("Supabase", s.has_supabase))))

    if s.has_gemini:
        try:
            reply = await gemini.generate_json("Reply only with JSON.", 'Reply with {"ok": true}.', 0)
            print("ok Gemini answered:", reply)
        except Exception as err:
            print("X  Gemini failed:", str(err)[:200], "(check GEMINI_API_KEY, or the free daily limit)")

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

        headers = {"apikey": s.supabase_service_key, "Authorization": f"Bearer {s.supabase_service_key}"}
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
