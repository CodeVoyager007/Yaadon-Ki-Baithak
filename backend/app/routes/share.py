"""GET /api/share/{token}: the only public route.

A valid, unrevoked, unexpired token returns the family's shared book: family
name, storytellers, and every chapter with its turns and a fresh signed
painting URL. Wrong, revoked or expired tokens all look identical, so a link
can't be probed. There is deliberately no anon read policy on the tables; this
route reads with the service role only after the token checks out.
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Request

from ..errors import ApiError
from ..painting import SIGN_SECONDS
from ..security import rate_limited
from ..supabase import Supa, as_service

router = APIRouter(prefix="/api")

TOKEN = re.compile(r"^[A-Za-z0-9]{1,64}$")


def _not_found() -> ApiError:
    return ApiError(404, "This family book isn't available.")


def _in(ids: list[str]) -> str:
    return f"in.({','.join(ids)})"


def _expired(expires_at: str | None) -> bool:
    if not expires_at:
        return False
    try:
        return datetime.fromisoformat(expires_at.replace("Z", "+00:00")) <= datetime.now(timezone.utc)
    except ValueError:
        return True


@router.get("/share/{token}")
async def share(token: str, request: Request):
    # Public, so it gets the rate limit without the sign-in.
    if rate_limited(request, "share"):
        raise ApiError(429, "Too many tries. Wait a minute and try again.")
    admin = as_service()
    if not admin:
        raise ApiError(503, "Sharing isn't set up on this site.")
    if not TOKEN.match(token):
        raise _not_found()

    link = await admin.first("share_links", {"select": "family_id,expires_at,revoked", "token": f"eq.{token}"})
    if not link or link.get("revoked") or _expired(link.get("expires_at")):
        raise _not_found()
    family_id = link["family_id"]
    family = await admin.first("families", {"select": "name", "id": f"eq.{family_id}"})
    if not family:
        raise _not_found()

    elders = await admin.select(
        "elders", {"select": "id,name,relation,language", "family_id": f"eq.{family_id}", "order": "created_at.asc"}
    )
    empty = {"familyName": family["name"], "elders": elders, "chapters": []}
    if not elders:
        return empty
    sessions = await admin.select(
        "sessions", {"select": "id,elder_id,theme", "elder_id": _in([e["id"] for e in elders]), "order": "created_at.asc"}
    )
    if not sessions:
        return empty
    session_ids = [s["id"] for s in sessions]
    chapter_rows, turn_rows = await asyncio.gather(
        admin.select("chapters", {"select": "*", "session_id": _in(session_ids), "order": "created_at.asc"}),
        admin.select(
            "turns",
            {"select": "session_id,idx,role,text,lang,duration_ms,created_at", "session_id": _in(session_ids), "order": "idx.asc"},
        ),
    )

    turns_by_session: dict[str, list[dict]] = {}
    for t in turn_rows:
        turn = {
            "index": t["idx"],
            "role": "elder" if t["role"] == "elder" else "birdy",
            "text": t["text"],
            "lang": "en" if t["lang"] == "en" else "ur",
            "at": t["created_at"],
        }
        if t.get("duration_ms") is not None:
            turn["durationMs"] = t["duration_ms"]
        turns_by_session.setdefault(t["session_id"], []).append(turn)

    by_session = {s["id"]: s for s in sessions}
    chapters = await asyncio.gather(*(_chapter(admin, family_id, row, by_session, turns_by_session) for row in chapter_rows))
    return {"familyName": family["name"], "elders": elders, "chapters": list(chapters)}


async def _chapter(admin: Supa, family_id: str, row: dict, by_session: dict, turns_by_session: dict) -> dict:
    session = by_session.get(row["session_id"], {})
    chapter: dict = {
        "title": {"ur": row["title_ur"], "en": row["title_en"]},
        "body": {"ur": row["body_ur"], "en": row["body_en"]},
        "sourceTurns": row.get("source_turns") or [],
    }
    if row.get("pull_quote") and isinstance(row.get("pull_quote_turn"), int):
        chapter["pullQuote"] = {"text": row["pull_quote"], "turnIndex": row["pull_quote_turn"]}
    for key in ("year", "place"):
        if row.get(key):
            chapter[key] = row[key]
    out = {
        "id": row["id"],
        "sessionId": row["session_id"],
        "elderId": session.get("elder_id", ""),
        "theme": session.get("theme", "Free talk"),
        "createdAt": row["created_at"],
        "chapter": chapter,
        "turns": turns_by_session.get(row["session_id"], []),
    }
    # Paths are written by the family, and the service role can sign anything, so only
    # ever sign a file inside this family's own folder (no "../", no other family's id).
    async def sign(path: object) -> Optional[str]:
        if isinstance(path, str) and path.startswith(f"{family_id}/") and ".." not in path:
            return await admin.signed_url("images", path, SIGN_SECONDS)
        return None

    url = await sign(row.get("image_path"))
    if url:
        out["imageUrl"] = url
    raw_pages = row.get("pages") if isinstance(row.get("pages"), list) else []
    pages = [p for p in raw_pages[:8] if isinstance(p, dict)]
    if pages:
        chapter["pages"] = [
            {
                "ur": p.get("ur") if isinstance(p.get("ur"), str) else "",
                "en": p.get("en") if isinstance(p.get("en"), str) else "",
                "sourceTurns": [n for n in p.get("sourceTurns") or [] if isinstance(n, int)],
            }
            for p in pages
        ]
        out["pageImages"] = list(await asyncio.gather(*(sign(p.get("imagePath")) for p in pages)))
    return out
