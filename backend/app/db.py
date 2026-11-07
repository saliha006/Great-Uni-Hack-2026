import os
from collections.abc import Iterator
from datetime import datetime

from sqlalchemy import Engine
from sqlalchemy.engine import make_url
from sqlmodel import Field, Session, SQLModel, create_engine


def create_db_engine(url: str) -> Engine:
    if make_url(url).get_backend_name() == "sqlite":
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url, pool_pre_ping=True)


url = os.getenv("DATABASE_URL", "sqlite:///./attune.db")
engine = create_db_engine(url)


class UserRow(SQLModel, table=True):
    __tablename__ = "users"
    id: str = Field(primary_key=True)
    name: str
    profiles_json: str = "[]"


class SubjectRow(SQLModel, table=True):
    __tablename__ = "subjects"
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    name: str
    kind: str
    exam_date: str | None = None
    phase: str = "SAMPLING"


class MaterialRow(SQLModel, table=True):
    __tablename__ = "materials"
    id: int | None = Field(default=None, primary_key=True)
    subject_id: int = Field(foreign_key="subjects.id", index=True)
    title: str | None = None
    source: str


class ChunkRow(SQLModel, table=True):
    __tablename__ = "chunks"
    id: int | None = Field(default=None, primary_key=True)
    subject_id: int = Field(foreign_key="subjects.id", index=True)
    material_id: int = Field(foreign_key="materials.id", index=True)
    idx: int
    text: str
    key_points_json: str = "[]"
    difficulty_est: float


class SessionRow(SQLModel, table=True):
    __tablename__ = "sessions"
    id: int | None = Field(default=None, primary_key=True)
    subject_id: int = Field(foreign_key="subjects.id", index=True)
    chunk_id: int = Field(foreign_key="chunks.id", index=True)
    method: str
    mode: str
    planned_minutes: int
    started_at: datetime
    ended_at: datetime | None = None
    active_minutes: float | None = None
    minutes_to_first_drift: float | None = None
    completion: float | None = None
    probe_score: float | None = None
    delayed_score: float | None = None
    felt_rating: int | None = None
    reward: float | None = None
    is_seeded: bool = False


class ItemRow(SQLModel, table=True):
    __tablename__ = "items"
    id: int | None = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="sessions.id", index=True)
    kind: str
    phase: str
    prompt: str
    options_json: str | None = None
    answer_key: str | None = None
    rubric: str | None = None
    difficulty: int
    expected_seconds: int


class ResponseRow(SQLModel, table=True):
    __tablename__ = "responses"
    id: int | None = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="items.id", index=True)
    session_id: int = Field(foreign_key="sessions.id", index=True)
    answer: str
    score: float | None = None
    latency_ms: int
    ts: datetime


class EventRow(SQLModel, table=True):
    __tablename__ = "events"
    id: int | None = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="sessions.id", index=True)
    type: str
    ts: datetime
    item_id: int | None = Field(default=None, foreign_key="items.id", index=True)
    latency_ms: int | None = None
    payload_json: str | None = None


class MethodStatRow(SQLModel, table=True):
    __tablename__ = "method_stats"
    subject_id: int = Field(primary_key=True, foreign_key="subjects.id")
    method: str = Field(primary_key=True)
    alpha: float
    beta: float
    n: int = 0
    last_updated: datetime


class AttentionBaselineRow(SQLModel, table=True):
    __tablename__ = "attention_baselines"
    user_id: str = Field(primary_key=True, foreign_key="users.id")
    baseline_ratio: float
    baseline_ratio_sd: float
    baseline_cv: float
    baseline_cv_sd: float
    focus_window_min: int
    updated_at: datetime


class PlanRow(SQLModel, table=True):
    __tablename__ = "plans"
    subject_id: int = Field(primary_key=True, foreign_key="subjects.id")
    method: str
    mode: str
    session_minutes: int
    trial_until: str | None = None
    reason: str


class ReflectionRow(SQLModel, table=True):
    __tablename__ = "reflections"
    id: int | None = Field(default=None, primary_key=True)
    subject_id: int = Field(foreign_key="subjects.id", index=True)
    ts: datetime
    trigger: str
    diagnosis: str
    evidence_json: str
    decision_json: str
    explanation: str


class LLMUsageRow(SQLModel, table=True):
    __tablename__ = "llm_usage"
    id: int | None = Field(default=None, primary_key=True)
    ts: datetime
    purpose: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    cache_hit: bool


def init_db(bind: Engine = engine) -> None:
    with bind.begin() as connection:
        SQLModel.metadata.create_all(connection)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
