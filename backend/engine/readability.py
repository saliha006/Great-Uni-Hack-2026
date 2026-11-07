"""Reading-load estimates for the reading_support profile. Pure text maths; no word lists or network.

The syllable count is a vowel-group heuristic, so grades are approximate.
Pre-teaching words above a CEFR level needs a licensed CEFR word list and is not done here.
"""
import re

from engine.priors import READING_SUPPORT, ReadingSupport

_WORD = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
_SENTENCE_END = re.compile(r"[.!?]+(?:\s|$)")
_VOWEL_GROUP = re.compile(r"[aeiouy]+")


def syllables(word: str) -> int:
    word = word.lower()
    count = len(_VOWEL_GROUP.findall(word))
    if word.endswith("e") and not word.endswith(("le", "ee")) and count > 1:
        count -= 1  # silent final e: "make", "time"
    return max(1, count)


def flesch_kincaid_grade(text: str) -> float | None:
    """US school grade needed to read the text; None when there are no words."""
    words = _WORD.findall(text)
    if not words:
        return None
    sentences = max(1, len(_SENTENCE_END.findall(text)))
    total_syllables = sum(syllables(w) for w in words)
    return round(0.39 * len(words) / sentences + 11.8 * total_syllables / len(words) - 15.59, 1)


def needs_simplification(text: str, profile: ReadingSupport = READING_SUPPORT) -> bool:
    grade = flesch_kincaid_grade(text)
    return grade is not None and grade > profile.simplify_above_fk_grade
