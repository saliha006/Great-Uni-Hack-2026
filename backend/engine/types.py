"""Engine data types. Models mirrored from PRD §11 keep its field names and string timestamps;
engine-internal models use datetime because the engine does date maths on them."""
from datetime import datetime
from typing import Literal, Protocol

from pydantic import BaseModel

Method = Literal["ACTIVE_RECALL", "FEYNMAN", "PRACTICE_TEST", "SPACED_FLASHCARDS", "BLURTING"]
SubjectKind = Literal["PERFORMANCE", "KNOWLEDGE"]
Phase = Literal["SAMPLING", "ADAPTIVE"]
SessionMode = Literal["SAMPLER", "ADAPTIVE", "TRIAL"]
AttentionStateName = Literal["FOCUSED", "DRIFTING", "LAPSED"]
InterventionType = Literal["NONE", "EASIER", "SWITCH_FORMAT", "BREAK", "WRAP_UP"]
DiagnosisName = Literal["ON_TRACK", "MASTERED", "LOW_ENGAGEMENT", "FATIGUE", "PLATEAU"]
ReflectionTrigger = Literal["WEEKLY", "PLATEAU", "MANUAL"]
Confidence = Literal["EARLY", "MODERATE", "HIGH"]
EventType = Literal[
    "ITEM_SHOWN", "ITEM_ANSWERED", "TAB_BLUR", "TAB_FOCUS", "IDLE", "BREAK_START", "BREAK_END", "VOICE_TURN"
]
ItemKind = Literal["RECALL_PROMPT", "MCQ", "SHORT_ANSWER", "PROBLEM", "FEYNMAN_BRIEF"]
Tier = Literal["fast", "smart"]
# Support needs the student opts into; never a diagnosis (CLAUDE.md honesty rule).
ProfileName = Literal["short_blocks", "reading_support", "dyslexia_ui"]

# MVP methods the sampler rotates through (PRD §5); the rest are roadmap.
LIVE_METHODS: tuple[Method, ...] = ("ACTIVE_RECALL", "PRACTICE_TEST", "FEYNMAN")
# How a method reads mid-sentence in plan reasons and reflections.
METHOD_LABELS: dict[Method, str] = {
    "ACTIVE_RECALL": "active recall",
    "PRACTICE_TEST": "practice test",
    "FEYNMAN": "Feynman",
    "SPACED_FLASHCARDS": "spaced flashcards",
    "BLURTING": "blurting",
}


# ---- Mirrored from PRD §11 -------------------------------------------------

class Plan(BaseModel):
    method: Method
    mode: SessionMode
    session_minutes: int
    trial_until: str | None = None
    reason: str


class MethodStatView(BaseModel):
    method: Method
    n: int
    mean_reward: float
    ci_low: float
    ci_high: float


class Readiness(BaseModel):
    performance: float | None
    understanding: float | None
    confidence: Literal["LOW", "MEDIUM", "HIGH"]


class AttentionReading(BaseModel):
    state: AttentionStateName
    latency_cv: float | None
    latency_ratio: float | None
    idle_count: int
    blur_count: int
    window_n: int


class Intervention(BaseModel):
    type: InterventionType
    message: str
    break_seconds: int | None = None
    new_difficulty: int | None = None


class Decision(BaseModel):
    action: Literal["KEEP", "TRIAL_METHOD", "SHORTEN_SESSIONS", "EASE_IN", "RAISE_DIFFICULTY"]
    method: Method | None = None
    trial_days: int | None = None
    session_minutes: int | None = None


class Reflection(BaseModel):
    id: int
    ts: str
    trigger: ReflectionTrigger
    diagnosis: DiagnosisName
    evidence: dict
    decision: Decision
    explanation: str


# ---- Engine internals -------------------------------------------------------

class Event(BaseModel):
    type: EventType
    ts: datetime
    item_id: int | None = None
    latency_ms: int | None = None
    # Backend fills this from the graded response; the error-streak rule (PRD §8.3) needs it.
    score: float | None = None
    payload: dict | None = None


class ItemMeta(BaseModel):
    item_id: int
    kind: ItemKind
    difficulty: int
    expected_seconds: int


class Baseline(BaseModel):
    # Cold-start placeholders (TUNE), replaced by the user's own values after ~2 sessions.
    baseline_ratio: float = 1.0
    baseline_ratio_sd: float = 0.35
    baseline_cv: float = 0.30
    baseline_cv_sd: float = 0.12
    focus_window_min: int = 20
    n_sessions: int = 0


class MethodStats(BaseModel):
    alpha: float
    beta: float
    n: int = 0


class SessionSummary(BaseModel):
    session_id: int
    ts: datetime
    method: Method
    mode: SessionMode
    probe_score: float
    delayed_score: float | None = None
    active_minutes: float
    completion: float
    felt_rating: int
    drift_share: float
    lapse_share: float
    gap_days_before: float
    hour_of_day: int
    is_seeded: bool = False
    # From attention.minutes_to_first_drift at session end; None = never drifted (focus_window uses active_minutes).
    minutes_to_first_drift: float | None = None


class SubjectCtx(BaseModel):
    subject_id: int
    kind: SubjectKind
    phase: Phase
    exam_date: str | None = None
    # The engine never reads the clock; the backend passes "now" (shifted by /dev/advance-days).
    now: datetime
    sampler_round: int = 0
    current_plan: Plan | None = None
    focus_window_min: int = 20
    profiles: tuple[ProfileName, ...] = ()


class SessionCtx(BaseModel):
    session_id: int
    method: Method
    elapsed_minutes: float
    focus_window_min: int
    current_difficulty: int
    minutes_since_intervention: float | None = None
    breaks_taken: int = 0
    drifting_windows: int = 0


class Diagnosis(BaseModel):
    name: DiagnosisName
    evidence: dict


class TrialOutcome(BaseModel):
    adopt: bool
    delta: float
    n: int


class LLM(Protocol):
    def complete_json(self, system: str, user: str, schema: dict, tier: Tier) -> dict: ...
