"""Pydantic models mirroring PRD §11 field-for-field. The TS there is the source of truth."""
from typing import Literal

from pydantic import BaseModel, Field

# Generous caps against oversized or abusive payloads; normal use never gets near them.
TEXT_MAX = 5_000
MATERIAL_MAX = 200_000
PDF_B64_MAX = 14_000_000  # ~10 MB PDF once base64-encoded
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


class Hint(BaseModel):
    level: int
    text: str
    quote: str | None = None  # a sentence (or masked sentence) from the notes, shown as a blockquote
    source: str | None = None


class Adapt(BaseModel):
    state: Literal["EASED", "RESTORED"]
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
    # Additive (contract change 2026-11-07): easing status, and the last hint state so a reload restores it.
    adapt: Adapt | None = None
    progress: "AnswerResult | None" = None


class Done(BaseModel):
    done: Literal[True] = True


class AnswerBody(BaseModel):
    item_id: int
    answer: str = Field(max_length=TEXT_MAX)
    latency_ms: int = Field(ge=0, le=LATENCY_MAX_MS)
    self_grade: Literal[0, 0.5, 1] | None = None
    # Additive (contract change 2026-11-07): opt in to the hint ladder; skip is honoured only after can_skip.
    guided: bool = False
    skip: bool = False


class AnswerResult(BaseModel):
    score: float
    correct: bool | None = None
    feedback: str | None = None
    reveal: str | None = None
    # Additive (contract change 2026-11-07), set only for guided answers. done_with_item None = legacy, item is over.
    attempt: int | None = None
    max_attempts: int | None = None
    hint_level: int | None = None
    hint: Hint | None = None
    eliminated: list[str] | None = None
    explanation: str | None = None
    quotes: list[str] | None = None
    example: str | None = None
    why_wrong: str | None = None
    source: str | None = None
    signal: Literal["ATTEMPT", "ANSWER_SEEKING", "REPEAT"] | None = None
    can_skip: bool | None = None
    done_with_item: bool | None = None


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
    # Additive (contract change 2026-11-07): a dropped PDF, base64-encoded, so no multipart dependency is needed.
    pdf_base64: str | None = Field(default=None, max_length=PDF_B64_MAX)


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
    active_minutes: float | None = None  # additive (contract change 2026-11-07)


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


class SeedBody(BaseModel):
    persona: Literal["steady", "breakthrough", "bursts"] = "breakthrough"  # additive (contract change 2026-11-07)


class AdvanceDaysBody(BaseModel):
    days: int = Field(ge=0, le=60)


class AdvanceDaysResult(BaseModel):
    advanced_to: str
    reflections: list[Reflection]


NextItem = Item | Done


class AskBody(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    session_id: int | None = None


class Quote(BaseModel):
    text: str
    quote: str
    chunk_idx: int
    label: str


class QuizQuestion(BaseModel):
    qid: str
    kind: Literal["MCQ", "SHORT_ANSWER", "RECALL_PROMPT"]
    prompt: str
    options: list[str] | None = None


class AskResult(BaseModel):
    intent: Literal["ASK", "QUIZ", "REFUSED_CURRENT", "NOT_IN_NOTES", "BLOCKED"]
    message: str | None = None
    answer: list[Quote] = []
    hint: Hint | None = None
    quiz: list[QuizQuestion] | None = None
    grounded_by: Literal["llm", "extractive"] | None = None


class QuizAnswerBody(BaseModel):
    qid: str = Field(max_length=100)
    answer: str = Field(max_length=TEXT_MAX)
    latency_ms: int = Field(ge=0, le=LATENCY_MAX_MS)
    previous: list[str] = Field(default=[], max_length=8)  # client-held: it only affects the student's own practice



class StudySetBody(BaseModel):
    kind: Literal["quiz", "flashcards", "paper"]
    count: int | None = Field(default=None, ge=1, le=40)


class StudyItem(BaseModel):
    qid: str
    kind: Literal["MCQ", "SHORT_ANSWER", "RECALL_PROMPT", "FLASHCARD"]
    prompt: str
    options: list[str] | None = None
    back: str | None = None  # flashcards only: flipping the card is the method
    quote: str | None = None  # the sentence in the notes this item is built on
    source: str
    marks: int | None = None
    section: str | None = None


class StudySet(BaseModel):
    kind: Literal["quiz", "flashcards", "paper"]
    title: str
    minutes: int
    items: list[StudyItem]


Item.model_rebuild()
