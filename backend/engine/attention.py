"""Real-time attention reading and interventions (PRD §8.3). Pure functions over client events.

Spread is a trimmed CV (drop the fastest and slowest answer, then SD / mean): one slow answer must not flip
the state, but two or more must. Plain SD over-reacts to a single outlier; MAD ignores up to half the window.
"""
import math
import statistics
from datetime import datetime

from engine.types import (
    AttentionReading,
    AttentionStateName,
    Baseline,
    Event,
    Intervention,
    ItemMeta,
    SessionCtx,
    SessionSummary,
)

WINDOW = 8
MIN_WINDOW = 5
MIN_SD = 0.05  # floor so a very consistent user doesn't get z-scores that explode
COOLDOWN_MIN = 4.0  # TUNE
FIRST_BREAK_S, LATER_BREAK_S = 180, 300
FOCUS_MIN, FOCUS_MAX, FOCUS_DEFAULT, FOCUS_SESSIONS = 10, 45, 20, 5
BASELINE_MIN_RATE = 0.2  # later sessions still move the baseline by at least this much


def _ratio(event: Event, items: dict[int, ItemMeta]) -> float | None:
    item = items.get(event.item_id) if event.item_id is not None else None
    if item is None or event.latency_ms is None or item.expected_seconds <= 0:
        return None
    return event.latency_ms / 1000 / item.expected_seconds


def _trimmed_cv(ratios: list[float]) -> float:
    trimmed = sorted(ratios)[1:-1]
    mean = statistics.mean(trimmed)
    return statistics.pstdev(trimmed) / mean if mean > 0 else 0.0


def _z(value: float, mean: float, sd: float) -> float:
    return (value - mean) / max(sd, MIN_SD)


def _classify(ratios: list[float], scores: list[float | None], idle: int, blur: int, base: Baseline) -> AttentionStateName:
    z_lat = _z(statistics.median(ratios), base.baseline_ratio, base.baseline_ratio_sd) if ratios else 0.0
    z_cv = _z(_trimmed_cv(ratios), base.baseline_cv, base.baseline_cv_sd) if len(ratios) >= MIN_WINDOW else 0.0
    streak = 0
    for score in reversed(scores):
        if score is None or score >= 0.5:
            break
        streak += 1
    rising = len(ratios) >= 2 and ratios[-1] > statistics.median(ratios)
    # Thresholds below are PRD §8.3 starting values (TUNE).
    if z_cv >= 2 or z_lat >= 2 or idle >= 2 or (streak >= 3 and rising):
        return "LAPSED"
    if z_cv >= 1 or z_lat >= 1 or blur >= 2 or idle == 1:
        return "DRIFTING"
    return "FOCUSED"


def _windows(events: list[Event], items: dict[int, ItemMeta], baseline: Baseline):
    """Yield (state, ratios, idle, blur) for the window ending at each answered item; the last one includes
    everything after the final answer, so a trailing idle gap still counts."""
    events = sorted(events, key=lambda e: e.ts)
    answered = [e for e in events if e.type == "ITEM_ANSWERED"]
    ends = list(range(len(answered))) or [-1]
    for end in ends:
        start = max(0, end - WINDOW + 1)
        after = answered[start - 1].ts if start > 0 else datetime.min.replace(tzinfo=events[0].ts.tzinfo)
        until = answered[end].ts if end < len(answered) - 1 else None
        in_window = [e for e in events if e.ts > after and (until is None or e.ts <= until)]
        window = answered[start:end + 1]
        ratios = [r for e in window if (r := _ratio(e, items)) is not None]
        idle = sum(e.type == "IDLE" for e in in_window)
        blur = sum(e.type == "TAB_BLUR" for e in in_window)
        yield _classify(ratios, [e.score for e in window], idle, blur, baseline), ratios, idle, blur


def score_attention(events: list[Event], items: dict[int, ItemMeta], baseline: Baseline) -> AttentionReading:
    if not events:
        return AttentionReading(state="FOCUSED", latency_cv=None, latency_ratio=None, idle_count=0, blur_count=0,
                                window_n=0)
    state: AttentionStateName = "FOCUSED"
    previous: AttentionStateName | None = None
    for raw, ratios, idle, blur in _windows(events, items, baseline):
        # Hysteresis: the state only moves once two consecutive windows agree (stops flicker).
        if raw == previous:
            state = raw
        previous = raw
    return AttentionReading(
        state=state,
        latency_cv=round(_trimmed_cv(ratios), 3) if len(ratios) >= MIN_WINDOW else None,
        latency_ratio=round(statistics.median(ratios), 3) if ratios else None,
        idle_count=idle,
        blur_count=blur,
        window_n=len(ratios),
    )


def recommend_intervention(reading: AttentionReading, ctx: SessionCtx) -> Intervention:
    """ctx.drifting_windows = consecutive DRIFTING readings so far, counting this one (the backend keeps it)."""
    if ctx.minutes_since_intervention is not None and ctx.minutes_since_intervention < COOLDOWN_MIN:
        return Intervention(type="NONE", message="")
    if ctx.elapsed_minutes >= ctx.focus_window_min and reading.state != "FOCUSED":
        return Intervention(type="WRAP_UP", message="Good place to stop. Let's finish this block with a quick check.")
    break_s = FIRST_BREAK_S if ctx.breaks_taken == 0 else LATER_BREAK_S
    if reading.state == "LAPSED" or (reading.state == "DRIFTING" and ctx.drifting_windows >= 2):
        return Intervention(type="BREAK", message=f"Take {break_s // 60} minutes off. Your place is saved.",
                            break_seconds=break_s)
    if reading.state == "DRIFTING":
        if ctx.current_difficulty > 1:
            return Intervention(type="EASIER", message="Let's try a smaller step.",
                                new_difficulty=ctx.current_difficulty - 1)
        return Intervention(type="SWITCH_FORMAT", message="Let's switch to a different kind of question.")
    return Intervention(type="NONE", message="")


def minutes_to_first_drift(events: list[Event], items: dict[int, ItemMeta], baseline: Baseline) -> float | None:
    """Minutes from the first event until the (hysteresis-confirmed) state first leaves FOCUSED; None if never.
    The backend stores it on the session so focus_window can learn the user's span."""
    events = sorted(events, key=lambda e: e.ts)
    answered = [e for e in events if e.type == "ITEM_ANSWERED"]
    if not answered:
        return None
    previous: AttentionStateName | None = None
    for i, (raw, *_) in enumerate(_windows(events, items, baseline)):
        if raw != "FOCUSED" and raw == previous:
            return (answered[i].ts - events[0].ts).total_seconds() / 60
        previous = raw
    return None


def update_baseline(baseline: Baseline, session_events: list[Event], items: dict[int, ItemMeta]) -> Baseline:
    answered = sorted((e for e in session_events if e.type == "ITEM_ANSWERED"), key=lambda e: e.ts)
    ratios = [r for e in answered if (r := _ratio(e, items)) is not None]
    if len(ratios) < MIN_WINDOW:
        return baseline  # too little data to learn from; don't count the session
    windows = [ratios[i:i + WINDOW] for i in range(len(ratios) - MIN_WINDOW + 1)]
    medians = [statistics.median(w) for w in windows]
    cvs = [_trimmed_cv(w) for w in windows]
    rate = max(1 / (baseline.n_sessions + 1), BASELINE_MIN_RATE)

    def blend(old: float, new: float) -> float:
        return old + rate * (new - old)

    return baseline.model_copy(update={
        "baseline_ratio": blend(baseline.baseline_ratio, statistics.median(medians)),
        "baseline_ratio_sd": max(MIN_SD, blend(baseline.baseline_ratio_sd, statistics.pstdev(medians) or MIN_SD)),
        "baseline_cv": blend(baseline.baseline_cv, statistics.median(cvs)),
        "baseline_cv_sd": max(MIN_SD, blend(baseline.baseline_cv_sd, statistics.pstdev(cvs) or MIN_SD)),
        "n_sessions": baseline.n_sessions + 1,
    })


def focus_window(sessions: list[SessionSummary]) -> int:
    """Median minutes-to-first-drift over the last 5 sessions; a session that never drifted counts its full length."""
    recent = sessions[-FOCUS_SESSIONS:]
    if not recent:
        return FOCUS_DEFAULT
    minutes = [s.minutes_to_first_drift if s.minutes_to_first_drift is not None else s.active_minutes for s in recent]
    return int(min(FOCUS_MAX, max(FOCUS_MIN, math.floor(statistics.median(minutes)))))
