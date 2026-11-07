"""Cold-start priors and support profiles. Python constants, not a JSON file, so the engine stays free of I/O.

Utility tiers follow Dunlosky et al. 2013. `effect_size` and `source` stay None until Yehor supplies
verified citations; every number marked TUNE is our guess, not research-derived.
"""
from typing import Literal

from pydantic import BaseModel

from engine.types import Method

Utility = Literal["high", "moderate", "low"]

PRIOR_STRENGTH = 4.0  # TUNE: pseudo-sessions, so real data takes over after a few sessions (PRD §8.2)
PRIOR_MEAN: dict[Utility, float] = {"high": 0.6, "moderate": 0.55, "low": 0.5}  # TUNE


class Technique(BaseModel):
    id: str
    name: str
    utility: Utility
    methods: tuple[Method, ...] = ()  # contract methods this technique backs; empty = evidence only
    effect_size: float | None = None
    source: str | None = None


TECHNIQUES: tuple[Technique, ...] = (
    Technique(id="practice_testing", name="Practice testing", utility="high",
              methods=("PRACTICE_TEST", "ACTIVE_RECALL")),
    Technique(id="distributed_practice", name="Distributed practice", utility="high",
              methods=("SPACED_FLASHCARDS",)),
    Technique(id="elaborative_interrogation", name="Elaborative interrogation", utility="moderate"),
    Technique(id="self_explanation", name="Self-explanation", utility="moderate", methods=("FEYNMAN",)),
    Technique(id="interleaved_practice", name="Interleaved practice", utility="moderate"),
    Technique(id="summarization", name="Summarization", utility="low"),
    Technique(id="highlighting", name="Highlighting / underlining", utility="low"),
    Technique(id="keyword_mnemonic", name="Keyword mnemonic", utility="low"),
    Technique(id="imagery_for_text", name="Imagery for text", utility="low"),
    Technique(id="rereading", name="Rereading", utility="low"),
)

METHOD_TECHNIQUE: dict[Method, Technique] = {m: t for t in TECHNIQUES for m in t.methods}

# Support profiles are chosen by need, never by diagnosis (research doc; CLAUDE.md honesty rule).
ProfileName = Literal["short_blocks", "reading_support", "dyslexia_ui"]


class ShortBlocks(BaseModel):
    session_minutes: int = 10  # TUNE
    fixed_blocks: bool = True
    retrieval_criterion: int = 3  # TUNE: correct recalls in a row before an item counts as learned
    chunk_words: int = 150  # TUNE
    extra_time_multiplier: float = 1.0  # deliberately no extra time
    source: str | None = None


class ReadingSupport(BaseModel):
    reading_wpm: int = 238
    second_language_speed_factor: float = 0.65
    pre_teach_above_cefr: Literal["A1", "A2", "B1", "B2", "C1", "C2"] = "B2"  # TUNE
    simplify_above_fk_grade: float = 10.0  # TUNE
    source: str | None = None


class DyslexiaUI(BaseModel):
    read_aloud: bool = True
    increased_spacing: bool = True
    line_focus: bool = True
    source: str | None = None


SHORT_BLOCKS = ShortBlocks()
READING_SUPPORT = ReadingSupport()
DYSLEXIA_UI = DyslexiaUI()
PROFILES: dict[ProfileName, BaseModel] = {
    "short_blocks": SHORT_BLOCKS,
    "reading_support": READING_SUPPORT,
    "dyslexia_ui": DYSLEXIA_UI,
}


def reading_seconds(words: int, profile: ReadingSupport = READING_SUPPORT) -> float:
    return words / (profile.reading_wpm * profile.second_language_speed_factor) * 60
