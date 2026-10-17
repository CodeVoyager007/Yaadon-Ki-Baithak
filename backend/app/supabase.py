"""The few Supabase calls the API needs, over plain REST.

Two identities, never mixed up:
- as_user(token): acts as the signed-in caller. Row level security decides
  what it may read or write. Used for anything the caller owns.
- as_service(): the service role, bypasses RLS. Used in exactly two places,
  the painting upload and the public share read, after we have checked who
  may see what. Its key is never logged and never sent to a client.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional
from urllib.parse import quote

from .config import settings
from .http_client import client


async def user_id_for(token: str) -> Optional[str]:
    """Ask Supabase Auth who this access token belongs to. None for a bad or expired token."""
    s = settings()
    res = await client().get(
        f"{s.supabase_url}/auth/v1/user",
        headers={"apikey": s.supabase_anon_key, "Authorization": f"Bearer {token}"},
    )
    if res.status_code != 200:
        return None
    return res.json().get("id")


@dataclass(frozen=True)
class Supa:
    bearer: str

    def _headers(self, extra: Optional[dict[str, str]] = None) -> dict[str, str]:
        s = settings()
        return {"apikey": s.supabase_anon_key or s.supabase_service_key, "Authorization": f"Bearer {self.bearer}", **(extra or {})}

    async def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        """PostgREST read, e.g. select("families", {"select": "id", "owner_id": "eq.<uuid>"})."""
        res = await client().get(f"{settings().supabase_url}/rest/v1/{table}", params=params, headers=self._headers())
        if res.status_code != 200:
            raise RuntimeError(f"Supabase read {table} answered {res.status_code}")
        return res.json()

    async def first(self, table: str, params: dict[str, str]) -> Optional[dict[str, Any]]:
        rows = await self.select(table, {**params, "limit": "1"})
        return rows[0] if rows else None

    async def upload(self, bucket: str, path: str, data: bytes, content_type: str) -> None:
        res = await client().post(
            f"{settings().supabase_url}/storage/v1/object/{bucket}/{quote(path)}",
            content=data,
            headers=self._headers({"Content-Type": content_type, "x-upsert": "false"}),
        )
        if res.status_code not in (200, 201):
            raise RuntimeError(f"Supabase upload answered {res.status_code}")

    async def signed_url(self, bucket: str, path: str, seconds: int) -> Optional[str]:
        res = await client().post(
            f"{settings().supabase_url}/storage/v1/object/sign/{bucket}/{quote(path)}",
            json={"expiresIn": seconds},
            headers=self._headers(),
        )
        if res.status_code != 200:
            return None
        signed = res.json().get("signedURL") or res.json().get("signedUrl")
        return f"{settings().supabase_url}/storage/v1{signed}" if signed else None


def as_user(token: str) -> Supa:
    return Supa(token)


def as_service() -> Optional[Supa]:
    s = settings()
    return Supa(s.supabase_service_key) if s.has_service_role else None
