from datetime import datetime, timedelta

from engine import adapt
from engine.types import ItemMeta

T0 = datetime(2026, 11, 7, 15, 0)
SEEKING = adapt.ItemOutcome(score=0.0, attempts=1, seeking=1, hints_used=0, latency_ratio=0.2, first_wrong=True)
GOOD = adapt.ItemOutcome(score=1.0, attempts=1, seeking=0, hints_used=0, latency_ratio=1.0)


def state(**kw):
    return adapt.AdaptState(**{"baseline": 3, "target": 3, **kw})


def test_one_signal_or_attention_alone_never_eases():
    one = [adapt.ItemOutcome(score=1.0, attempts=1, seeking=2, hints_used=0)] * 3
    assert adapt.adapt(state(), one, 3, "FOCUSED", T0).change == "NONE"
    assert adapt.adapt(state(), [GOOD] * 3, 3, "LAPSED", T0).change == "NONE"


def test_seeking_plus_fast_wrong_eases_one_notch_once():
    d = adapt.adapt(state(), [SEEKING] * 3, 3, "FOCUSED", T0)
    assert (d.change, d.state.target) == ("EASED", 2) and "easier" in d.reason
    again = adapt.adapt(d.state, [SEEKING] * 3, 3, "FOCUSED", T0)
    assert again.change == "NONE" and again.state.target == 2


def test_floor_is_one():
    assert adapt.adapt(state(baseline=1, target=1), [SEEKING] * 3, 3, "FOCUSED", T0).change == "NONE"


def test_ramp_back_needs_two_good_windows_and_dwell():
    eased = adapt.adapt(state(), [SEEKING] * 3, 3, "FOCUSED", T0).state
    w1 = adapt.adapt(eased, [GOOD] * 3, 6, "FOCUSED", T0 + timedelta(minutes=2))
    assert w1.change == "NONE" and w1.state.good_windows == 1
    early = adapt.adapt(w1.state, [GOOD] * 3, 9, "FOCUSED", T0 + timedelta(minutes=4))
    assert early.change == "NONE" and early.state.target == 2
    late = adapt.adapt(w1.state, [GOOD] * 3, 9, "FOCUSED", T0 + timedelta(minutes=6))
    assert (late.change, late.state.target) == ("RESTORED", 3)


def test_a_bad_window_resets_the_count():
    eased = adapt.adapt(state(), [SEEKING] * 3, 3, "FOCUSED", T0).state
    w1 = adapt.adapt(eased, [GOOD] * 3, 6, "FOCUSED", T0 + timedelta(minutes=6)).state
    bad = adapt.adapt(w1, [SEEKING] * 3, 9, "FOCUSED", T0 + timedelta(minutes=7)).state
    assert bad.good_windows == 0


def test_pick_next_prefers_target_difficulty_only_while_eased():
    items = [ItemMeta(item_id=i, kind="MCQ", difficulty=d, expected_seconds=30) for i, d in ((1, 3), (2, 2), (3, 1))]
    assert adapt.pick_next(items, state()).item_id == 1
    assert adapt.pick_next(items, state(target=2)).item_id == 2
    assert adapt.pick_next([], state()) is None
