"""Illustrator agent.

Builds a FLUX.1 schnell request (Cloudflare Workers AI, free) for one chapter
from the story writer's scene, in one fixed style so the whole book looks like
one artist painted it. It never sees the elder's photo.
"""

from __future__ import annotations

import re
from typing import Optional

from .guardrails import normalize
from .types import Bilingual, IllustrationRequest

STYLE = (
    "warm gouache storybook illustration, soft evening lantern light, dusk indigo and saffron palette, "
    "gentle rounded shapes, South Asian setting, gentle colors, no text in the image"
)
NEGATIVE = (
    "text, letters, watermark, logo, photorealistic faces, recognizable people, gore, blood, weapons, "
    "violence, modern phones"
)

# Words that would make a painting graphic. Partition stories get a quiet symbol instead.
GRAPHIC = (
    "blood", "corpse", "corpses", "bodies", "dead", "killed", "murder", "massacre", "weapon", "weapons",
    "gun", "guns", "sword", "swords", "knife", "riot", "riots", "violence", "flames", "burned",
)

# Calm stand-in scenes, used when the writer gave no scene or one that isn't safe to paint.
QUIET_JOURNEY = "an old steam train waiting at a quiet railway platform at dusk, a single lantern glowing"
QUIET_HOME = "an old wooden doorway of a courtyard house at dusk, a lantern glowing beside it"


def _is_graphic(scene: str) -> bool:
    words = set(normalize(scene).split())
    return any(w in words for w in GRAPHIC)


def scene_for(title: Bilingual, scene: Optional[str], year: Optional[str]) -> str:
    """The writer's own scene when it's safe, else a quiet symbol that fits the story."""
    scene = (scene or "").strip()
    if scene and not _is_graphic(scene):
        return scene
    partition = "1947" in (year or "") or bool(re.search(r"1947|partition|train", title.en, re.I))
    if partition:
        return QUIET_JOURNEY
    if scene or not title.en or _is_graphic(title.en):
        return QUIET_HOME
    return title.en


def illustration_request(
    title: Bilingual,
    family_seed: int,
    scene: Optional[str] = None,
    year: Optional[str] = None,
    place: Optional[str] = None,
    width: int = 1024,
    height: int = 1024,
) -> IllustrationRequest:
    where = f", in {place}" if place else ""
    when = f", around {year}" if year else ""
    return IllustrationRequest(
        prompt=f"{scene_for(title, scene, year)}{where}{when}. {STYLE}",
        negative_prompt=NEGATIVE,
        # Same seed per family keeps faces and palette consistent across chapters.
        seed=family_seed,
        width=width,
        height=height,
    )
