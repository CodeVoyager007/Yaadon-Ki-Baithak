"""Page setter agent.

Lays a story out as picture-book pages: whole sentences, about a painting's
worth of words per page, Urdu and English kept on the same page, never more
than MAX_PAGES. It works on the story editor's paragraphs, or, when the editor
couldn't run, on the elder's answers word for word (a draft).

Plain code, not a model: page breaks have a right answer that code finds every
time, for free, and it can't run out of quota.
"""

from __future__ import annotations

import math
import re

from .types import Bilingual, Chapter, ElderProfile, Page, PullQuote, Turn

MAX_PAGES = 8
# A picture book has a few pages even when the story is short: one moment per page.
MIN_PAGES = 4
# About what fits under a painting on one page.
WORDS_PER_PAGE = 75

# A sentence ends at Urdu ۔ ؟ or English . ? ! (closing quotes and brackets stay with it).
_SENTENCE = re.compile(r"[^۔؟?.!\n]+[۔؟?.!]*[\"'”’)]*")

URDU_RELATION = {"Nani": "نانی", "Nana": "نانا", "Dadi": "دادی", "Dada": "دادا"}


def words(text: str) -> int:
    return len(text.split())


def page_words(p: Page) -> int:
    # Urdu takes more words to say the same thing; the longer language decides.
    return max(words(p.ur), words(p.en))


def sentences(text: str) -> list[str]:
    """Sentences, with a run-on (transcripts often have no punctuation) cut into page-sized pieces."""
    out: list[str] = []
    for s in (m.group(0).strip() for m in _SENTENCE.finditer(text)):
        if not s:
            continue
        w = s.split()
        out.extend(" ".join(w[i : i + WORDS_PER_PAGE]) for i in range(0, len(w), WORDS_PER_PAGE))
    return out


def _even_groups(items: list[str], k: int) -> list[list[str]]:
    """Split sentences into k runs of about the same number of words, in order."""
    if k <= 1 or len(items) <= 1:
        return [items]
    total = sum(words(s) for s in items) or 1
    groups: list[list[str]] = [[]]
    seen = 0
    for s in items:
        if groups[-1] and len(groups) < k and seen >= total * len(groups) / k:
            groups.append([])
        groups[-1].append(s)
        seen += words(s)
    return groups


def _fit(p: Page, target: int) -> list[Page]:
    """A paragraph too long for one page becomes several, each language split at the same points."""
    if page_words(p) <= target * 1.4:
        return [p]
    ur, en = sentences(p.ur), sentences(p.en)
    k = math.ceil(page_words(p) / target)
    if ur and en:
        k = min(k, len(ur), len(en))
    else:
        k = min(k, len(ur or en))
    if k <= 1:
        return [p]
    ur_g, en_g = _even_groups(ur, k), _even_groups(en, k)
    n = max(len(ur_g), len(en_g))
    pad = lambda g: g + [[]] * (n - len(g))  # noqa: E731
    return [
        Page(ur=" ".join(u), en=" ".join(e), scene=p.scene if i == 0 else None, source_turns=list(p.source_turns))
        for i, (u, e) in enumerate(zip(pad(ur_g), pad(en_g)))
    ]


def _merge(group: list[Page]) -> Page:
    sources: list[int] = []
    for p in group:
        sources.extend(n for n in p.source_turns if n not in sources)
    return Page(
        ur="\n\n".join(p.ur for p in group if p.ur),
        en="\n\n".join(p.en for p in group if p.en),
        scene=next((p.scene for p in group if p.scene), None),
        source_turns=sources[:20],
    )


def lay_out(paragraphs: list[Page]) -> list[Page]:
    """Paragraphs in, pages out: short ones share a page, long ones are split, at most MAX_PAGES."""
    paragraphs = [p for p in paragraphs if p.ur.strip() or p.en.strip()]
    if not paragraphs:
        return []
    total = sum(page_words(p) for p in paragraphs)
    pieces = [piece for p in paragraphs for piece in _fit(p, max(WORDS_PER_PAGE, math.ceil(total / MAX_PAGES)))]
    # How many pages: about a painting's worth of words each, but a short story still gets one moment
    # (paragraph) per page, up to MIN_PAGES, and never more than MAX_PAGES.
    pages = min(MAX_PAGES, max(min(MIN_PAGES, len(pieces)), math.ceil(total / WORDS_PER_PAGE)))
    # Balanced: a piece starts a new page when its middle falls past that page's share of the words.
    groups: list[list[Page]] = []
    seen = 0
    for piece in pieces:
        n = page_words(piece)
        if not groups or (len(groups) < pages and seen + n / 2 >= total * len(groups) / pages):
            groups.append([])
        groups[-1].append(piece)
        seen += n
    return [_merge(g) for g in groups]


def _short_quote(turns: list[Turn]) -> PullQuote | None:
    """One whole sentence they said, short enough to read at a glance."""
    said = [(s, t.index or 0) for t in turns if t.role == "elder" for s in sentences(t.text)]
    fits = [x for x in said if words(x[0]) >= 6 and len(x[0]) <= 160]
    if not fits:
        return None
    text, n = max(fits, key=lambda x: len(x[0]))
    return PullQuote(text=text, turn_index=n)


def draft_chapter(elder: ElderProfile, theme: str, turns: list[Turn]) -> Chapter | None:
    """The elder's own words, in order, nothing added, laid out as pages. Used when the story editor
    couldn't run, so the family still gets a real book (and its paintings) instead of a transcript."""
    answers = [(i, t) for i, t in enumerate(turns) if t.role == "elder" and t.text.strip()]
    if not answers:
        return None
    paragraphs = [
        Page(
            ur=t.text.strip() if t.lang == "ur" else "",
            en=t.text.strip() if t.lang == "en" else "",
            source_turns=[t.index if t.index is not None else i],
        )
        for i, t in answers
    ]
    pages = lay_out(paragraphs)
    who = f"{elder.relation} {elder.name}".strip()
    ur_who = URDU_RELATION.get(elder.relation, "ان")
    free = theme in ("", "Free talk")
    return Chapter(
        title=Bilingual(en=f"{who} remembers" if free else f"{who} remembers: {theme}", ur=f"{ur_who} کی یادیں"),
        body=Bilingual(
            ur="\n\n".join(t.text.strip() for _, t in answers if t.lang == "ur"),
            en="\n\n".join(t.text.strip() for _, t in answers if t.lang == "en"),
        ),
        source_turns=[p for page in paragraphs for p in page.source_turns],
        pull_quote=_short_quote(turns),
        year="1947" if theme == "1947" else None,
        place=elder.birthplace or None,
        pages=pages,
    )
