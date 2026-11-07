from datetime import datetime, timedelta

import pytest
from engine import diagnose
from engine.types import Plan, SessionSummary, TrialOutcome

START = datetime(2026, 10, 20, 18, 0)
PLAN = Plan(method="PRACTICE_TEST", mode="ADAPTIVE", session_minutes=20, reason="r")


def history(probes, every_days=1.0, completion=1.0, not_focused=None, method="PRACTICE_TEST", mode="ADAPTIVE"):
    not_focused = not_focused or [0.1] * len(probes)
    return [
        SessionSummary(session_id=i + 1, ts=START + timedelta(days=i * every_days), method=method, mode=mode,
                       probe_score=p, active_minutes=20, completion=completion, felt_rating=3,
                       drift_share=nf, lapse_share=0.0, gap_days_before=0 if i == 0 else every_days, hour_of_day=18)
        for i, (p, nf) in enumerate(zip(probes, not_focused))
    ]


def name(h):
    return diagnose.diagnose(h, PLAN).name


def test_too_few_sessions_is_on_track_with_insufficient_data():
    got = diagnose.diagnose(history([0.5, 0.6]), PLAN)
    assert got.name == "ON_TRACK" and got.evidence["insufficient_data"] is True


def test_sessions_on_too_few_days_is_insufficient():
    assert diagnose.diagnose(history([0.5, 0.5, 0.5, 0.5], every_days=0.25), PLAN).evidence.get("insufficient_data")


def test_fatigue_spell_reads_fatigue():
    assert name(history([0.6, 0.62, 0.6, 0.61, 0.6, 0.59], not_focused=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6])) == "FATIGUE"


def test_gap_of_days_reads_low_engagement():
    assert name(history([0.5, 0.55, 0.6, 0.65, 0.7, 0.75], every_days=4)) == "LOW_ENGAGEMENT"


def test_low_completion_reads_low_engagement():
    assert name(history([0.5, 0.55, 0.6, 0.65, 0.7, 0.75], completion=0.5)) == "LOW_ENGAGEMENT"


def test_flat_with_good_attention_below_085_reads_plateau():
    assert name(history([0.6, 0.61, 0.6, 0.6, 0.61, 0.6])) == "PLATEAU"


def test_declining_reads_plateau():
    assert name(history([0.8, 0.75, 0.7, 0.65, 0.6, 0.55])) == "PLATEAU"


def test_flat_above_085_reads_mastered():
    assert name(history([0.9, 0.9, 0.91, 0.9, 0.9, 0.9])) == "MASTERED"


def test_rising_reads_on_track():
    assert name(history([0.4, 0.48, 0.55, 0.62, 0.7, 0.78])) == "ON_TRACK"


def test_evidence_names_the_numbers_the_agent_explains():
    ev = diagnose.diagnose(history([0.6] * 6), PLAN).evidence
    assert {"days", "method", "mean_probe", "slope_per_session", "median_not_focused"} <= set(ev)


def test_theil_sen_ignores_one_bad_session():
    assert diagnose.theil_sen_slope([0.6, 0.6, 0.6, 0.1, 0.6, 0.6]) == pytest.approx(0.0)


def trial_history(before, during):
    pre = history(before)
    trial = history(during, method="FEYNMAN", mode="TRIAL")
    for i, s in enumerate(trial):
        s.ts = pre[-1].ts + timedelta(days=i + 1)
        s.session_id = 100 + i
    return pre + trial


TRIAL = Plan(method="FEYNMAN", mode="TRIAL", session_minutes=20, trial_until="2026-11-01", reason="r")


def test_trial_that_helps_is_adopted():
    got = diagnose.evaluate_trial(trial_history([0.6, 0.6, 0.6], [0.7, 0.72]), TRIAL)
    assert got.adopt and got.n == 2 and got.delta == pytest.approx(0.11)


def test_trial_that_does_not_help_is_reverted():
    assert not diagnose.evaluate_trial(trial_history([0.6, 0.6, 0.6], [0.62, 0.6]), TRIAL).adopt


def test_one_trial_session_is_not_enough():
    assert not diagnose.evaluate_trial(trial_history([0.5, 0.5], [0.9]), TRIAL).adopt


def test_no_trial_sessions_yet():
    assert diagnose.evaluate_trial(history([0.6] * 3), TRIAL) == TrialOutcome(adopt=False, delta=0.0, n=0)
