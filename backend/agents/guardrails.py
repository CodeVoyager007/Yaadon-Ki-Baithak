"""Deterministic checks the agents run around every model call.

The prompts ask the model to behave; these make sure it did. Cue lists cover
English, Roman Urdu and Urdu script, and are kept specific on purpose: a false
"sensitive" only makes Hudhud gentler, but a false "private info" throws a good
question away.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

_DIACRITICS = re.compile("[ً-ٰٟـ]")
_NON_WORD = re.compile(r"[\W_]+", re.UNICODE)
_CONTROL = re.compile("[\u0000-\u0008\u000b-\u001f\u007f]")


def normalize(text: str) -> str:
    """Lowercase, Urdu diacritics and tatweel removed, punctuation to spaces, Urdu digits to ASCII."""
    text = _DIACRITICS.sub("", text.lower())
    # Extended Arabic-Indic (Urdu) and Arabic-Indic digits are both Unicode decimals.
    text = "".join(str(unicodedata.decimal(c)) if c.isdecimal() and not c.isascii() else c for c in text)
    return _NON_WORD.sub(" ", text).strip()


def _has_cue(text: str, cues: tuple[str, ...]) -> bool:
    haystack = f" {normalize(text)} "
    return any(f" {normalize(cue)}" in haystack for cue in cues)


# Grief, loss, 1947 violence.
SENSITIVE_CUES = (
    "passed away", "died", "death", "killed", "murdered", "riot", "riots", "massacre", "blood", "corpse",
    "funeral", "crying", "tears", "never saw them again",
    "intiqal", "faut ho", "qatal", "fasad", "khoon", "laash", "aansu", "rona aa", "bichhar",
    "انتقال", "فوت", "وفات", "قتل", "فساد", "خون", "لاش", "آنسو", "رونا", "رو پڑ", "بچھڑ", "جنازہ",
    "مار دیا", "مار ڈالا", "جلا دیا",
)

# The elder asking to stop or rest.
TIRED_CUES = (
    "i am tired", "i'm tired", "im tired", "that's enough", "thats enough", "let's stop", "lets stop", "need rest",
    "thak gaya", "thak gayi", "thak gai", "bas karo", "bas karein", "kafi hai", "phir kabhi", "aaram karna",
    "تھک گیا", "تھک گئی", "تھک گئ", "بس کرو", "بس کریں", "کافی ہے", "پھر کبھی", "آرام کرنا",
)

# Things Hudhud must never ask for. Matched against Hudhud's own question, not the elder's answer.
PRIVATE_CUES = (
    "phone number", "mobile number", "cnic", "id card", "identity card", "home address", "your address",
    "bank account", "account number", "password", "pin code", "salary", "how much money",
    "فون نمبر", "موبائل نمبر", "شناختی کارڈ", "گھر کا پتہ", "ایڈریس", "بینک", "اکاؤنٹ", "پاس ورڈ", "تنخواہ",
)


def sounds_sensitive(text: str) -> bool:
    return _has_cue(text, SENSITIVE_CUES)


def sounds_tired(text: str) -> bool:
    return _has_cue(text, TIRED_CUES)


def asks_for_private_info(question: str) -> bool:
    return _has_cue(question, PRIVATE_CUES)


def word_count(text: str) -> int:
    return len(text.split())


def question_marks(text: str) -> int:
    """Latin and Urdu question marks; more than one means two questions at once."""
    return text.count("?") + text.count("؟")


def as_data(text: str) -> str:
    """Transcripts are data, not instructions. Strip control characters and the
    fence markers we wrap them in, so an answer can't close its own fence."""
    return _CONTROL.sub(" ", text).replace("<<<", " ").replace(">>>", " ").strip()


def text_field(value: Any, limit: int) -> str:
    """A plain string, trimmed and bounded; anything else becomes ""."""
    return value.strip()[:limit] if isinstance(value, str) else ""


def string_list(value: Any, item_limit: int, count: int) -> list[str]:
    if not isinstance(value, list):
        return []
    return [v.strip()[:item_limit] for v in value if isinstance(v, str) and v.strip()][:count]
