from datetime import datetime, timedelta

import pytest
from engine import attention
from engine.types import (
    AttentionReading,
    Baseline,
    Event,
    ItemMeta,
    SessionCtx,
    SessionSummary,
)

START = datetime(2026, 11, 7, 15, 0)
EXPECTED_S = 30


def stream(ratios, blur_after=(), idle_after=(), scores=None):
    """Answer events for items 1..n whose latency is ratio * expected_seconds; optional blur/idle after item i."""
    events, items, ts = [], {}, START
    for i, ratio in enumerate(ratios, start=1):
        items[i] = ItemMeta(item_id=i, kind="MCQ", difficulty=3, expected_seconds=EXPECTED_S)
        events.append(Event(type="ITEM_SHOWN", ts=ts, item_id=i))
        ts += timedelta(seconds=ratio * EXPECTED_S)
        score = scores[i - 1] if scores else 1.0
        events.append(Event(type="ITEM_ANSWERED", ts=ts, item_id=i, latency_ms=int(ratio * EXPECTED_S * 1000),
                            score=score))
        if i in blur_after:
            events.append(Event(type="TAB_BLUR", ts=ts + timedelta(seconds=1)))
        if i in idle_after:
            events.append(Event(type="IDLE", ts=ts + timedelta(seconds=1)))
    return events, items


def states_over_time(ratios, baseline=None, **kw):
    events, items = stream(ratios, **kw)
    answered_ts = [e.ts for e in events if e.type == "ITEM_ANSWERED"]
    return [attention.score_attention([e for e in events if e.ts <= t], items, baseline or Baseline()).state
            for t in answered_ts]


STEADY = [1.0, 1.05, 0.95, 1.1, 0.9, 1.0, 1.05, 0.95, 1.0, 1.1, 0.9, 1.0]


def ctx(**kw):
    return SessionCtx(**{"session_id": 1, "method": "PRACTICE_TEST", "elapsed_minutes": 5, "focus_window_min": 20,
                         "current_difficulty": 3, **kw})


def reading(state):
    return AttentionReading(state=state, latency_cv=None, latency_ratio=None, idle_count=0, blur_count=0, window_n=8)


def test_no_events_reads_focused():
    assert attention.score_attention([], {}, Baseline()).state == "FOCUSED"


def test_steady_answers_stay_focused_throughout():
    assert set(states_over_time(STEADY)) == {"FOCUSED"}


def test_single_slow_answer_does_not_flicker():
    ratios = STEADY[:6] + [5.0] + STEADY[6:]
    assert set(states_over_time(ratios)) == {"FOCUSED"}


def test_rising_latencies_drift_within_eight_items():
    rising = [1.0 + 0.15 * i for i in range(8)]
    states = states_over_time(STEADY[:6] + rising)
    assert set(states[:6]) == {"FOCUSED"}
    assert any(s != "FOCUSED" for s in states[6:])


def test_erratic_latencies_leave_focused():
    erratic = [0.5, 1.9] * 5
    assert states_over_time(STEADY[:5] + erratic)[-1] != "FOCUSED"


def test_persistent_long_latencies_read_lapsed():
    assert states_over_time(STEADY[:5] + [2.5] * 8)[-1] == "LAPSED"


def test_two_tab_switches_read_drifting():
    assert states_over_time(STEADY, blur_after=(9, 10))[-1] == "DRIFTING"


def test_reading_reports_window_numbers():
    events, items = stream(STEADY)
    r = attention.score_attention(events, items, Baseline())
    assert r.window_n == attention.WINDOW and r.latency_ratio == pytest.approx(1.0, abs=0.06)
    assert r.latency_cv is not None and r.blur_count == 0


def test_first_drift_makes_it_easier():
    got = attention.recommend_intervention(reading("DRIFTING"), ctx(drifting_windows=1))
    assert (got.type, got.new_difficulty) == ("EASIER", 2)


def test_first_drift_at_easiest_switches_format():
    assert attention.recommend_intervention(reading("DRIFTING"), ctx(current_difficulty=1)).type == "SWITCH_FORMAT"


def test_persistent_drift_gets_a_break_and_second_break_is_longer():
    first = attention.recommend_intervention(reading("DRIFTING"), ctx(drifting_windows=2))
    second = attention.recommend_intervention(reading("DRIFTING"), ctx(drifting_windows=2, breaks_taken=1))
    assert (first.type, first.break_seconds, second.break_seconds) == ("BREAK", 180, 300)


def test_lapse_gets_a_break_immediately():
    assert attention.recommend_intervention(reading("LAPSED"), ctx()).type == "BREAK"


def test_cooldown_suppresses_interventions():
    assert attention.recommend_intervention(reading("LAPSED"), ctx(minutes_since_intervention=2)).type == "NONE"


def test_past_focus_window_and_not_focused_wraps_up():
    assert attention.recommend_intervention(reading("DRIFTING"), ctx(elapsed_minutes=21)).type == "WRAP_UP"


def test_focused_needs_nothing():
    assert attention.recommend_intervention(reading("FOCUSED"), ctx(elapsed_minutes=30)).type == "NONE"


def test_baseline_ignores_short_sessions():
    events, items = stream([1.0] * 3)
    assert attention.update_baseline(Baseline(), events, items) == Baseline()


def test_baseline_learns_a_slow_but_steady_user():
    slow = [1.7, 1.75, 1.65, 1.8, 1.6, 1.7, 1.75, 1.65, 1.7, 1.8]
    assert states_over_time(slow)[-1] != "FOCUSED"  # against the cold-start default this looks like drift
    events, items = stream(slow)
    base = Baseline()
    for _ in range(2):
        base = attention.update_baseline(base, events, items)
    assert base.n_sessions == 2 and base.baseline_ratio == pytest.approx(1.7, abs=0.05)
    assert states_over_time(slow, baseline=base)[-1] == "FOCUSED"


def test_minutes_to_first_drift():
    assert attention.minutes_to_first_drift(*stream(STEADY), Baseline()) is None
    minutes = attention.minutes_to_first_drift(*stream(STEADY[:6] + [2.5] * 6), Baseline())
    assert minutes is not None and minutes > 3


def summary(active, drift_at=None):
    return SessionSummary(session_id=1, ts=START, method="FEYNMAN", mode="ADAPTIVE", probe_score=0.5,
                          active_minutes=active, completion=1, felt_rating=3, drift_share=0, lapse_share=0,
                          gap_days_before=1, hour_of_day=15, minutes_to_first_drift=drift_at)


def test_focus_window_default_median_and_clamps():
    assert attention.focus_window([]) == 20
    assert attention.focus_window([summary(30, d) for d in (12, 14, 16)]) == 14
    assert attention.focus_window([summary(30, 3)]) == 10
    assert attention.focus_window([summary(90)]) == 45


def test_demo_burst_leaves_focused_within_four_erratic_answers():
    """scripts/attention_burst.py's pattern on 45 s demo recall items: 5 steady answers, then an erratic burst."""
    steady = [1.0] * 5
    burst = [150 / 45, 20 / 45, 160 / 45, 15 / 45, 170 / 45, 140 / 45]
    states = states_over_time(steady + burst)
    assert set(states[:5]) == {"FOCUSED"}
    assert any(s != "FOCUSED" for s in states[5:9])


def test_two_slow_answers_in_a_row_are_noticed_by_the_next_answer():
    # Hysteresis needs two agreeing windows, so the state can move one answer after the second slow one.
    assert any(s != "FOCUSED" for s in states_over_time(STEADY[:6] + [3.0, 3.0] + STEADY[:2])[7:9])
