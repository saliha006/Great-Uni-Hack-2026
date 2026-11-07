"""Real-time easing and gradual ramp-back. Pure functions; the backend stores the state and serves items.

Easing keeps a session from collapsing into guessing; it is not a claim that easier items teach more.
Every constant is a starting default (TUNE), not a research-derived number.
"""
from datetime import datetime, timedelta
from typing import Literal

from pydantic import BaseModel

from engine.types import AttentionStateName, ItemMeta

WINDOW_ITEMS = 3
MIN_WINDOW_ITEMS = 2
EASE_MIN_SIGNALS = 2
GOOD_WINDOWS_NEEDED = 2
DWELL = timedelta(minutes=5)
FAST_RATIO = 0.3
FAST_WRONG_SHARE = 0.4
BEHAVIOURAL = ("answer_seeking", "fast_wrong", "error_streak", "hint_chain")

EASED_REASON = "A few skipped or very quick answers in a row, so the next questions are one small step easier."
RESTORED_REASON = "You're steady again, so questions are back to normal."


class ItemOutcome(BaseModel):
    score: float
    attempts: int
    seeking: int
    hints_used: int
    max_hints: int = 3
    latency_ratio: float | None = None
    first_wrong: bool = False


class AdaptState(BaseModel):
    baseline: int
    target: int
    eased_at: datetime | None = None
    good_windows: int = 0
    last_window: int = 0


class AdaptDecision(BaseModel):
    state: AdaptState
    change: Literal["NONE", "EASED", "RESTORED"]
    reason: str | None = None


def signals(recent: list[ItemOutcome], attention: AttentionStateName) -> dict[str, bool]:
    window = recent[-WINDOW_ITEMS:]
    fast_wrong = [o for o in window if o.first_wrong and o.latency_ratio is not None and o.latency_ratio < FAST_RATIO]
    return {
        "answer_seeking": sum(o.seeking for o in window) >= 2,
        "fast_wrong": bool(window) and len(fast_wrong) / len(window) >= FAST_WRONG_SHARE,
        "error_streak": len(window) >= WINDOW_ITEMS and all(o.score < 0.5 for o in window),
        "hint_chain": sum(1 for o in window if o.max_hints and o.hints_used >= o.max_hints) >= 2,
        "attention": attention != "FOCUSED",
    }


def adapt(state: AdaptState, recent: list[ItemOutcome], finished_count: int,
          attention: AttentionStateName, now: datetime) -> AdaptDecision:
    if len(recent) < MIN_WINDOW_ITEMS:
        return AdaptDecision(state=state, change="NONE")
    fired = signals(recent, attention)
    behavioural = [k for k in BEHAVIOURAL if fired[k]]
    if state.target == state.baseline:
        # Attention alone never eases: it needs at least one thing the student actually did.
        if behavioural and sum(fired.values()) >= EASE_MIN_SIGNALS:
            eased = state.model_copy(update={"target": max(1, state.baseline - 1), "eased_at": now,
                                             "good_windows": 0, "last_window": finished_count // WINDOW_ITEMS})
            if eased.target < state.target:
                return AdaptDecision(state=eased, change="EASED", reason=EASED_REASON)
        return AdaptDecision(state=state, change="NONE")
    window = finished_count // WINDOW_ITEMS
    if window <= state.last_window:
        return AdaptDecision(state=state, change="NONE")
    good = not behavioural and fired["attention"] is False and (
        sum(o.score for o in recent[-WINDOW_ITEMS:]) / len(recent[-WINDOW_ITEMS:]) >= 0.5)
    goods = state.good_windows + 1 if good else 0
    if goods >= GOOD_WINDOWS_NEEDED and state.eased_at and now - state.eased_at >= DWELL:
        restored = state.model_copy(update={"target": state.baseline, "eased_at": None, "good_windows": 0,
                                            "last_window": window})
        return AdaptDecision(state=restored, change="RESTORED", reason=RESTORED_REASON)
    return AdaptDecision(state=state.model_copy(update={"good_windows": goods, "last_window": window}), change="NONE")


def pick_next(unanswered: list[ItemMeta], state: AdaptState) -> ItemMeta | None:
    """While eased, the item nearest the target difficulty; otherwise the original order."""
    if not unanswered:
        return None
    if state.target >= state.baseline:
        return min(unanswered, key=lambda m: m.item_id)
    return min(unanswered, key=lambda m: (abs(m.difficulty - state.target), m.item_id))
