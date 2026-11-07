"""Pydantic models mirroring PRD §11 field-for-field. The TS there is the source of truth."""
from typing import Literal

from pydantic import BaseModel, Field

# Generous caps against oversized or abusive payloads; normal use never gets near them.
TEXT_MAX = 5_000
MATERIAL_MAX = 200_000
TS_MAX = 64
LATENCY_MAX_MS = 3_600_000

Method = Literal["ACTIVE_RECALL", "FEYNMAN", "PRACTICE_TEST", "SPACED_FLASHCARDS", "BLURTING"]
SubjectKind = Literal["PERFORMANCE", "KNOWLEDGE"]
Phase = Literal["SAMPLING", "ADAPTIVE"]
SessionMode = Literal["SAMPLER", "ADAPTIVE", "TRIAL"]
AttentionStateName = Literal["FOCUSED", "DRIFTING", "LAPSED"]
InterventionType = Literal["NONE", "EASIER", "SWITCH_FORMAT", "BREAK", "WRAP_UP"]
DiagnosisName = Literal["ON_TRACK", "MASTERED", "LOW_ENGAGEMENT", "FATIGUE", "PLATEAU"]
Confidence = Literal["EARLY", "MODERATE", "HIGH"]
EventType = Literal[
    "ITEM_SHOWN", "ITEM_ANSWERED", "TAB_BLUR", "TAB_FOCUS", "IDLE", "BREAK_START", "BREAK_END", "VOICE_TURN"
]


class Subject(BaseModel):
    id: int
    name: str
    kind: SubjectKind
    exam_date: str | None = None
    phase: Phase


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


class SamplerEntry(BaseModel):
    done: bool
    probe_score: float | None = None


class SubjectState(BaseModel):
    subject: Subject
    sampler: dict[str, SamplerEntry]
    method_stats: list[MethodStatView]
    plan: Plan
    readiness: Readiness | None
    focus_window_min: int
    confidence: Confidence


class SubjectSummary(BaseModel):
    subject: Subject
    plan: Plan
    readiness: Readiness | None


class Session(BaseModel):
    id: int
    subject_id: int
    method: Method
    mode: SessionMode
    planned_minutes: int
    chunk_id: int
    reason: str


class Item(BaseModel):
    id: int
    kind: Literal["RECALL_PROMPT", "MCQ", "SHORT_ANSWER", "PROBLEM", "FEYNMAN_BRIEF"]
    phase: Literal["MAIN", "PROBE", "WARMUP_PROBE"]
    prompt: str
    options: list[str] | None = None
    difficulty: Literal[1, 2, 3, 4, 5]
    expected_seconds: int
    hint: str | None = None


class Done(BaseModel):
    done: Literal[True] = True


class AnswerBody(BaseModel):
    item_id: int
    answer: str = Field(max_length=TEXT_MAX)
    latency_ms: int = Field(ge=0, le=LATENCY_MAX_MS)
    self_grade: Literal[0, 0.5, 1] | None = None


class AnswerResult(BaseModel):
    score: float
    correct: bool | None = None
    feedback: str | None = None
    reveal: str | None = None


class SessionEvent(BaseModel):
    type: EventType
    ts: str = Field(max_length=TS_MAX)
    item_id: int | None = None
    latency_ms: int | None = Field(default=None, ge=0, le=LATENCY_MAX_MS)
    payload: dict | None = None


class EventsBody(BaseModel):
    events: list[SessionEvent] = Field(max_length=500)


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


class EventsResult(BaseModel):
    attention: AttentionReading
    intervention: Intervention


class FeynmanTurn(BaseModel):
    role: Literal["user", "agent"]
    text: str = Field(max_length=TEXT_MAX)
    ts: str = Field(max_length=TS_MAX)


class FeynmanBody(BaseModel):
    turns: list[FeynmanTurn] = Field(max_length=200)


class FeynmanResult(BaseModel):
    score: float
    covered: list[str]
    gaps: list[str]
    feedback: str


class Decision(BaseModel):
    action: Literal["KEEP", "TRIAL_METHOD", "SHORTEN_SESSIONS", "EASE_IN", "RAISE_DIFFICULTY"]
    method: Method | None = None
    trial_days: int | None = None
    session_minutes: int | None = None


class Reflection(BaseModel):
    id: int
    ts: str
    trigger: Literal["WEEKLY", "PLATEAU", "MANUAL"]
    diagnosis: DiagnosisName
    evidence: dict
    decision: Decision
    explanation: str


class SessionResult(BaseModel):
    probe_score: float
    active_minutes: float
    efficiency: float
    reward: float
    subject_state: SubjectState
    reflection: Reflection | None = None


class ProbeAnswer(BaseModel):
    item_id: int
    answer: str = Field(max_length=TEXT_MAX)
    latency_ms: int = Field(ge=0, le=LATENCY_MAX_MS)


class ProbeBody(BaseModel):
    answers: list[ProbeAnswer] = Field(max_length=50)
    felt_rating: Literal[1, 2, 3, 4, 5]


class FinishResult(BaseModel):
    probe_items: list[Item]


class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    kind: SubjectKind
    exam_date: str | None = Field(default=None, max_length=TS_MAX)


class MaterialBody(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    text: str | None = Field(default=None, max_length=MATERIAL_MAX)


class MaterialResult(BaseModel):
    material_id: int
    chunk_count: int


class SessionCreate(BaseModel):
    subject_id: int
    method: Method | None = None


class VoiceContext(BaseModel):
    topic: str
    key_points: list[str]
    first_message: str


class SignedUrl(BaseModel):
    signed_url: str
    context: VoiceContext


class ScorePoint(BaseModel):
    ts: str
    probe_score: float


class AttentionBySession(BaseModel):
    session_id: int
    ts: str
    method: Method
    drift_share: float
    lapse_share: float


class TimelineEntry(BaseModel):
    ts: str
    kind: Literal["RECALIBRATION", "BREAK", "TRIAL_START", "TRIAL_END", "SAMPLER_DONE"]
    label: str


class ReadinessPoint(BaseModel):
    ts: str
    performance: float | None
    understanding: float | None


class Insights(BaseModel):
    method_series: dict[str, list[ScorePoint]]
    attention_by_session: list[AttentionBySession]
    timeline: list[TimelineEntry]
    readiness_series: list[ReadinessPoint]


class ReflectBody(BaseModel):
    subject_id: int
    trigger: Literal["MANUAL", "WEEKLY"]


class AdvanceDaysBody(BaseModel):
    days: int = Field(ge=0, le=60)


class AdvanceDaysResult(BaseModel):
    advanced_to: str
    reflections: list[Reflection]


NextItem = Item | Done
