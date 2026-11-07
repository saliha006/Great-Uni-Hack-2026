"""Every PRD §11 engine function is callable with plain data and returns the right type (Y0b)."""
import random
from datetime import datetime

from engine import agent, attention, diagnose, methodfit, predict, simulate
from engine.types import (
    AttentionReading,
    Baseline,
    Diagnosis,
    Event,
    Intervention,
    ItemMeta,
    MethodStats,
    Plan,
    Readiness,
    Reflection,
    SessionCtx,
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


def test_attention_functions_return_typed_results():
    reading = attention.score_attention(EVENTS, ITEMS, Baseline())
    assert isinstance(reading, AttentionReading) and reading.blur_count == 1 and reading.window_n == 1
    ctx = SessionCtx(session_id=1, method="FEYNMAN", elapsed_minutes=5, focus_window_min=20, current_difficulty=2)
    assert isinstance(attention.recommend_intervention(reading, ctx), Intervention)
    assert attention.update_baseline(Baseline(), EVENTS, ITEMS).n_sessions == 1
    assert attention.focus_window(HISTORY) == 20


def test_reward_is_between_zero_and_one():
    assert 0 <= methodfit.session_reward(0.8, None, 15, 4, 0.04) <= 1
    assert 0 <= methodfit.session_reward(0.0, 0.0, 0, 1, 0.04) <= 1


def test_delayed_score_beats_immediate_when_present():
    assert methodfit.session_reward(0.9, 0.3, 15, 3, 0.04) < methodfit.session_reward(0.9, None, 15, 3, 0.04)


def test_update_stats_adds_fractional_reward():
    assert methodfit.update_stats(MethodStats(alpha=2, beta=2), 0.7) == MethodStats(alpha=2.7, beta=2.3, n=1)


def test_sampler_visits_each_live_method_once():
    methods = [
        methodfit.choose_plan(SUBJECT.model_copy(update={"sampler_round": r}), STATS, [], random.Random(0)).method
        for r in range(3)
    ]
    assert sorted(methods) == ["ACTIVE_RECALL", "FEYNMAN", "PRACTICE_TEST"]


def test_confidence_levels():
    assert methodfit.confidence(STATS) == "EARLY"
    assert methodfit.confidence({m: MethodStats(alpha=5, beta=5, n=3) for m in STATS}) == "MODERATE"
    assert methodfit.confidence({m: MethodStats(alpha=9, beta=9, n=6) for m in STATS}) == "HIGH"


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
