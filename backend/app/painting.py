"""Turns the illustrator's request into a URL the browser can show.

The PNG goes into the private images bucket under the caller's family and comes
back as a signed URL. Without storage (local demo) it comes back as a data: URL,
so the moment still works.
"""

from __future__ import annotations

import base64
import logging
import uuid
from typing import Optional

from agents import IllustrationRequest

from .providers import cloudflare
from .supabase import Supa, as_service

log = logging.getLogger("baithak.painting")

# Signed URLs live a week; a fresh one is minted on every share-page read.
SIGN_SECONDS = 7 * 24 * 60 * 60


async def _family_of(admin: Supa, user_id: str) -> Optional[str]:
    row = await admin.first("families", {"select": "id", "owner_id": f"eq.{user_id}", "order": "created_at.asc"})
    return row["id"] if row else None


async def _store(user_id: Optional[str], png: bytes) -> Optional[str]:
    admin = as_service()
    family_id = await _family_of(admin, user_id) if admin and user_id else None
    if not admin or not family_id:
        return None
    path = f"{family_id}/chapter-{uuid.uuid4()}.png"
    await admin.upload("images", path, png, "image/png")
    return await admin.signed_url("images", path, SIGN_SECONDS)


def painter_for(user_id: Optional[str]):
    """The orchestrator's Painter, bound to one caller's family."""

    async def paint(request: IllustrationRequest) -> str:
        png = await cloudflare.paint(request)
        try:
            stored = await _store(user_id, png)
        except Exception as err:  # storage hiccup: still show the painting
            log.warning("painting storage failed: %s", err)
            stored = None
        return stored or f"data:image/png;base64,{base64.b64encode(png).decode()}"

    return paint
