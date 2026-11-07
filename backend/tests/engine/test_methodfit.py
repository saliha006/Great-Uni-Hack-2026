import random
from collections import Counter
from datetime import datetime

import pytest
from engine import methodfit
from engine.types import LIVE_METHODS, MethodStats, Plan, SubjectCtx

NOW = datetime(2026, 11, 7, 15, 0)


def subject(**kw) -> SubjectCtx:
    return SubjectCtx(**{"subject_id": 1, "kind": "KNOWLEDGE", "phase": "ADAPTIVE", "now": NOW, **kw})


def priors() -> dict:
    return {m: methodfit.prior_stats(m) for m in LIVE_METHODS}


def picks(ctx: SubjectCtx, stats: dict, n: int = 2000) -> Counter:
    rng = random.Random(7)
    return Counter(methodfit.choose_plan(ctx, stats, [], rng).method for _ in range(n))


def test_reward_stays_in_unit_range():
    assert 0 <= methodfit.session_reward(0.8, None, 15, 4, 0.04) <= 1
    assert 0 <= methodfit.session_reward(0.0, 0.0, 0, 1, 0.04) <= 1


def test_delayed_score_replaces_immediate_when_present():
    assert methodfit.session_reward(0.9, 0.3, 15, 3, 0.04) < methodfit.session_reward(0.9, None, 15, 3, 0.04)


def test_update_stats_adds_fractional_reward():
    assert methodfit.update_stats(MethodStats(alpha=2, beta=2), 0.7) == MethodStats(alpha=2.7, beta=2.3, n=1)


def test_priors_favour_testing_over_feynman_with_strength_four():
    stats = priors()
    assert stats["PRACTICE_TEST"].alpha > stats["FEYNMAN"].alpha
    assert stats["ACTIVE_RECALL"] == stats["PRACTICE_TEST"]
    assert all(s.alpha + s.beta == pytest.approx(4) and s.n == 0 for s in stats.values())


@pytest.mark.parametrize("subject_id", [1, 2, 3])
def test_sampler_visits_each_live_method_once_in_rotated_order(subject_id):
    rounds = [
        methodfit.choose_plan(subject(subject_id=subject_id, phase="SAMPLING", sampler_round=r), priors(), [],
                              random.Random(0))
        for r in range(3)
    ]
    assert sorted(p.method for p in rounds) == sorted(LIVE_METHODS)
    assert all(p.mode == "SAMPLER" and "Calibration round" in p.reason for p in rounds)


def test_sampler_start_rotates_across_subjects():
    firsts = {
        methodfit.choose_plan(subject(subject_id=i, phase="SAMPLING"), priors(), [], random.Random(0)).method
        for i in range(3)
    }
    assert len(firsts) == 3


def test_consistently_better_method_becomes_most_chosen():
    stats = priors()
    for _ in range(8):
        stats["FEYNMAN"] = methodfit.update_stats(stats["FEYNMAN"], 0.9)
        stats["PRACTICE_TEST"] = methodfit.update_stats(stats["PRACTICE_TEST"], 0.4)
        stats["ACTIVE_RECALL"] = methodfit.update_stats(stats["ACTIVE_RECALL"], 0.4)
    assert picks(subject(), stats).most_common(1)[0][0] == "FEYNMAN"


def test_exploration_floor_holds_even_when_one_method_dominates():
    stats = priors() | {"FEYNMAN": MethodStats(alpha=200, beta=2, n=50)}
    counts = picks(subject(), stats)
    assert 1 - counts["FEYNMAN"] / sum(counts.values()) >= methodfit.EXPLORATION_FLOOR - 0.02  # sampling noise


def test_active_trial_keeps_trial_method():
    trial = Plan(method="FEYNMAN", mode="TRIAL", session_minutes=15, trial_until="2026-11-10", reason="r")
    plan = methodfit.choose_plan(subject(current_plan=trial, focus_window_min=25), priors(), [], random.Random(0))
    assert (plan.method, plan.mode, plan.session_minutes) == ("FEYNMAN", "TRIAL", 25)


def test_expired_trial_falls_back_to_adaptive():
    trial = Plan(method="FEYNMAN", mode="TRIAL", session_minutes=15, trial_until="2026-11-07T00:00:00Z", reason="r")
    assert methodfit.choose_plan(subject(current_plan=trial), priors(), [], random.Random(0)).mode == "ADAPTIVE"


def test_missing_stats_fall_back_to_priors():
    assert methodfit.choose_plan(subject(), {}, [], random.Random(0)).method in LIVE_METHODS


def test_confidence_levels():
    assert methodfit.confidence(priors()) == "EARLY"
    assert methodfit.confidence({m: MethodStats(alpha=5, beta=5, n=3) for m in LIVE_METHODS}) == "MODERATE"
    tied = {m: MethodStats(alpha=9, beta=9, n=6) for m in LIVE_METHODS}
    assert methodfit.confidence(tied) == "MODERATE"  # enough sessions, but the intervals overlap
    clear = tied | {"FEYNMAN": MethodStats(alpha=40, beta=5, n=30)}
    assert methodfit.confidence(clear) == "HIGH"


def test_stat_view_interval_brackets_the_mean_and_narrows_with_data():
    few, many = methodfit.stat_view("FEYNMAN", MethodStats(alpha=3, beta=2, n=1)), \
        methodfit.stat_view("FEYNMAN", MethodStats(alpha=30, beta=20, n=46))
    assert few.ci_low < few.mean_reward < few.ci_high and 0 <= few.ci_low and few.ci_high <= 1
    assert (many.ci_high - many.ci_low) < (few.ci_high - few.ci_low)
    assert many.mean_reward == pytest.approx(0.6)


def test_stats_from_history_replays_every_session():
    from engine.simulate import make_persona
    ada = make_persona("Ada", 0)
    stats = methodfit.stats_from_history(ada)
    assert sum(s.n for s in stats.values()) == len(ada)
    assert max(stats, key=lambda m: stats[m].alpha / (stats[m].alpha + stats[m].beta)) == "PRACTICE_TEST"


def test_roadmap_method_gets_a_neutral_prior():
    assert methodfit.prior_stats("BLURTING").alpha == pytest.approx(0.55 * 4)


def test_short_blocks_profile_fixes_session_length_in_every_phase():
    for phase in ("SAMPLING", "ADAPTIVE"):
        ctx = subject(phase=phase, focus_window_min=25, profiles=("short_blocks",))
        assert methodfit.choose_plan(ctx, priors(), [], random.Random(0)).session_minutes == 10


def test_no_profile_uses_the_focus_window():
    assert methodfit.choose_plan(subject(focus_window_min=25), priors(), [], random.Random(0)).session_minutes == 25
