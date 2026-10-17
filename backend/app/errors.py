"""One error shape for every route: {"error": "short friendly sentence"}.

frontend/lib/api.ts treats any non-2xx as "use the stand-in", so these
messages never break the elder's flow. Raw provider errors stay in the log.
"""

from __future__ import annotations

from fastapi import HTTPException


class ApiError(HTTPException):
    def __init__(self, status: int, message: str):
        super().__init__(status_code=status, detail=message)


def bad_body() -> ApiError:
    return ApiError(400, "That request didn't look right.")


def not_configured(what: str) -> ApiError:
    """501: the provider's key isn't set. The app keeps working on stand-ins."""
    return ApiError(501, f"{what} isn't connected yet.")


def provider_failed(what: str) -> ApiError:
    """502: the provider answered badly or not at all. Never invent content instead."""
    return ApiError(502, f"{what} didn't work this time. Try again in a moment.")
