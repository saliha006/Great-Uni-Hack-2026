from datetime import datetime, timedelta

import pytest
from engine import agent
from engine.methodfit import prior_stats
from engine.types import (
    LIVE_METHODS,
    MethodStats,
    Plan,
    Reflection,
    SessionSummary,
    SubjectCtx,
)

START = datetime(2026, 10, 20, 18, 0)
PLAN = Plan(method="PRACTICE_TEST", mode="ADAPTIVE", session_minutes=20, reason="r")
SUBJECT = SubjectCtx(subject_id=1, kind="KNOWLEDGE", phase="ADAPTIVE", now=START + timedelta(days=6))
STATS = {m: prior_stats(m) for m in LIVE_METHODS}


def history(probes, not_focused=None):
    not_focused = not_focused or [0.1] * len(probes)
    return [SessionSummary(session_id=i, ts=START + timedelta(days=i), method="PRACTICE_TEST", mode="ADAPTIVE",
                           probe_score=p, active_minutes=20, completion=1, felt_rating=3, drift_share=nf,
                           lapse_share=0, gap_days_before=1, hour_of_day=18)
            for i, (p, nf) in enumerate(zip(probes, not_focused))]


PLATEAU = history([0.6, 0.61, 0.6, 0.6, 0.61, 0.6])
FATIGUE = history([0.6, 0.62, 0.6, 0.61, 0.6, 0.59], [0.1, 0.2, 0.3, 0.4, 0.5, 0.6])


class LLMReturning:
    def __init__(self, reply):
        self.reply, self.calls = reply, 0

    def complete_json(self, system, user, schema, tier):
        self.calls += 1
        if isinstance(self.reply, Exception):
            raise self.reply
        return self.reply


@pytest.mark.parametrize("reply", [{}, {"explanation": ""}, {"explanation": 42}, "not a dict", None,
                                   {"explanation": "x" * 2000}, RuntimeError("provider down"),
                                   {"explanation": "Your ADHD is getting worse."}])
def test_garbage_llm_still_gives_a_valid_templated_reflection(reply):
    got = agent.reflect(SUBJECT, PLATEAU, STATS, PLAN, "WEEKLY", LLMReturning(reply))
    assert isinstance(got, Reflection) and got.explanation == agent.template(
        agent.diagnose(PLATEAU, PLAN), got.decision, PLAN)


def test_good_llm_text_is_used():
    llm = LLMReturning({"explanation": "Your practice test scores stayed near 60% for 5 days, so let's try something new."})
    got = agent.reflect(SUBJECT, PLATEAU, STATS, PLAN, "PLATEAU", llm)
    assert got.explanation.startswith("Your practice test") and llm.calls == 1


def test_plateau_trials_a_different_live_method():
    got = agent.reflect(SUBJECT, PLATEAU, STATS, PLAN, "WEEKLY", LLMReturning({}))
    assert got.diagnosis == "PLATEAU" and got.decision.action == "TRIAL_METHOD"
    assert got.decision.method in LIVE_METHODS and got.decision.method != "PRACTICE_TEST"
    assert got.decision.trial_days == 7


def test_plateau_picks_the_second_best_method():
    stats = STATS | {"FEYNMAN": MethodStats(alpha=8, beta=2, n=4)}
    assert agent.reflect(SUBJECT, PLATEAU, stats, PLAN, "WEEKLY", LLMReturning({})).decision.method == "FEYNMAN"


def test_fatigue_shortens_sessions_and_keeps_the_method():
    got = agent.reflect(SUBJECT, FATIGUE, STATS, PLAN, "WEEKLY", LLMReturning({}))
    assert got.decision.action == "SHORTEN_SESSIONS" and got.decision.method is None
    assert got.decision.session_minutes == 15


def test_template_mentions_the_evidence():
    text = agent.reflect(SUBJECT, PLATEAU, STATS, PLAN, "WEEKLY", LLMReturning({})).explanation
    assert "5 days" in text and "practice test" in text and "%" in text


def test_insufficient_data_skips_the_llm():
    llm = LLMReturning({"explanation": "hi"})
    got = agent.reflect(SUBJECT, history([0.5, 0.6]), STATS, PLAN, "MANUAL", llm)
    assert got.diagnosis == "ON_TRACK" and llm.calls == 0 and "Not enough sessions" in got.explanation


def test_reflection_carries_trigger_and_engine_clock():
    got = agent.reflect(SUBJECT, PLATEAU, STATS, PLAN, "MANUAL", LLMReturning({}))
    assert got.trigger == "MANUAL" and got.ts == SUBJECT.now.isoformat()
