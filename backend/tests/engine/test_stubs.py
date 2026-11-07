"""Every PRD §11 engine function is callable with plain data and returns the right type (Y0b)."""
from datetime import datetime

from engine import agent, diagnose, predict, simulate
from engine.types import (
    Diagnosis,
    Event,
    ItemMeta,
    MethodStats,
    Plan,
    Readiness,
    Reflection,
    SubjectCtx,
    TrialOutcome,
)

NOW = datetime(2026, 11, 7, 15, 0)
SUBJECT = SubjectCtx(subject_id=1, kind="KNOWLEDGE", phase="SAMPLING", now=NOW)
EVENTS = [
    Event(type="ITEM_SHOWN", ts=NOW, item_id=1),
    Event(type="ITEM_ANSWERED", ts=NOW, item_id=1, latency_ms=4000, score=1.0),
    Event(type="TAB_BLUR", ts=NOW),
]
ITEMS = {1: ItemMeta(item_id=1, kind="MCQ", difficulty=2, expected_seconds=30)}
HISTORY = simulate.make_persona("Ada", 1)
STATS = {m: MethodStats(alpha=2, beta=2) for m in ("ACTIVE_RECALL", "PRACTICE_TEST", "FEYNMAN")}


class FakeLLM:
    def complete_json(self, system, user, schema, tier):
        return {}


def test_diagnose_reflect_predict_return_typed_results():
    plan = Plan(method="PRACTICE_TEST", mode="ADAPTIVE", session_minutes=20, reason="r")
    assert isinstance(diagnose.diagnose(HISTORY, plan), Diagnosis)
    assert isinstance(diagnose.evaluate_trial(HISTORY, plan), TrialOutcome)
    assert isinstance(agent.reflect(SUBJECT, HISTORY, STATS, plan, "WEEKLY", FakeLLM()), Reflection)
    assert isinstance(predict.predict_readiness(HISTORY, "KNOWLEDGE"), Readiness)
    assert predict.predict_readiness([], "PERFORMANCE").performance is None


def test_persona_is_deterministic_and_seeded():
    assert simulate.make_persona("Ada", 1) == simulate.make_persona("Ada", 1)
    assert simulate.make_persona("Ada", 1) != simulate.make_persona("Ben", 1)
    assert all(s.is_seeded and 0 <= s.probe_score <= 1 for s in HISTORY)
