"""Tables for the hint ladder and real-time easing.

They live in their own registry, apart from db.py (Yehor's), so his schema and its exact-table test stay untouched.
No foreign keys for the same reason: a key into db.py's tables would tie the two metadata sets together.
"""
from datetime import datetime

from sqlalchemy import Engine
from sqlalchemy.orm import registry
from sqlmodel import Field, SQLModel


class GuardBase(SQLModel, registry=registry()):
    pass


class AttemptRow(GuardBase, table=True):
    __tablename__ = "attempts"
    id: int | None = Field(default=None, primary_key=True)
    session_id: int = Field(index=True)
    item_id: int = Field(index=True)
    answer: str
    signal: str  # ATTEMPT | ANSWER_SEEKING | REPEAT | SKIPPED | TUTOR_SEEKING
    score: float | None = None
    hint_level: int = 0
    latency_ms: int = 0
    ts: datetime
    result_json: str | None = None


class SessionStateRow(GuardBase, table=True):
    __tablename__ = "session_state"
    session_id: int = Field(primary_key=True)
    baseline: int
    target: int
    eased_at: datetime | None = None
    good_windows: int = 0
    last_window: int = 0
    inserted: int = 0
    restored_pending: bool = False
    reason: str | None = None


def init(bind: Engine) -> None:
    GuardBase.metadata.create_all(bind)


def drop(bind: Engine) -> None:
    GuardBase.metadata.drop_all(bind)
