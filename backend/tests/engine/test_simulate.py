"""The demo story (PRD §18) must hold: Ada goes FATIGUE (no method change) -> PLATEAU -> Feynman trial adopted."""
import pytest
from engine import agent, diagnose, methodfit, simulate
from engine.types import LIVE_METHODS, Plan, SubjectCtx

PT_PLAN = Plan(method="PRACTICE_TEST", mode="ADAPTIVE", session_minutes=20, reason="r")
SEEDS = range(5)


def stats_from(history):
    stats = {m: methodfit.prior_stats(m) for m in LIVE_METHODS}
    for s in history:
        reward = methodfit.session_reward(s.probe_score, s.delayed_score, s.active_minutes, s.felt_rating, 0.035)
        stats[s.method] = methodfit.update_stats(stats[s.method], reward)
    return stats


def ctx(history):
    return SubjectCtx(subject_id=1, kind="KNOWLEDGE", phase="ADAPTIVE", now=history[-1].ts)


@pytest.mark.parametrize("name", simulate.PERSONAS)
def test_persona_is_three_weeks_seeded_and_deterministic(name):
    a, b = simulate.make_persona(name, 1), simulate.make_persona(name, 1)
    assert a == b and len(a) == 21 and all(s.is_seeded for s in a)
    assert (a[-1].ts - a[0].ts).days == 20 and all(0 <= s.probe_score <= 1 for s in a)


@pytest.mark.parametrize("seed", SEEDS)
def test_ada_week_two_reads_fatigue_and_keeps_the_method(seed):
    week2 = simulate.make_persona("Ada", seed)[:14]
    got = agent.reflect(ctx(week2), week2, stats_from(week2), PT_PLAN, "WEEKLY", None)
    assert got.diagnosis == "FATIGUE" and got.decision.action == "SHORTEN_SESSIONS" and got.decision.method is None


@pytest.mark.parametrize("seed", SEEDS)
def test_ada_week_three_reads_plateau_and_trials_feynman(seed):
    ada = simulate.make_persona("Ada", seed)
    got = agent.reflect(ctx(ada), ada, stats_from(ada), PT_PLAN, "WEEKLY", None)
    assert got.diagnosis == "PLATEAU" and got.decision == agent.Decision(action="TRIAL_METHOD", method="FEYNMAN",
                                                                         trial_days=7)


@pytest.mark.parametrize("seed", SEEDS)
def test_ada_feynman_trial_is_adopted(seed):
    ada = simulate.make_persona("Ada", seed)
    trial = Plan(method="FEYNMAN", mode="TRIAL", session_minutes=20, trial_until="2026-11-14", reason="r")
    after = simulate.trial_sessions("Ada", seed, "FEYNMAN", ada[-1].ts, 4, first_id=100)
    outcome = diagnose.evaluate_trial(ada + after, trial)
    assert outcome.adopt and outcome.delta >= 0.05


@pytest.mark.parametrize("seed", SEEDS)
def test_ben_is_on_track_then_mastered(seed):
    ben = simulate.make_persona("Ben", seed)
    assert diagnose.diagnose(ben[:11], Plan(method="ACTIVE_RECALL", mode="ADAPTIVE", session_minutes=20,
                                            reason="r")).name == "ON_TRACK"
    assert diagnose.diagnose(ben, Plan(method="ACTIVE_RECALL", mode="ADAPTIVE", session_minutes=20,
                                       reason="r")).name == "MASTERED"


def test_ada_rates_practice_test_best_then_feynman_after_week_one():
    stats = stats_from(simulate.make_persona("Ada", 0)[:7])
    ranked = sorted(stats, key=lambda m: stats[m].alpha / (stats[m].alpha + stats[m].beta), reverse=True)
    assert ranked[:2] == ["PRACTICE_TEST", "FEYNMAN"]
