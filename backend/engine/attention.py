"""Y0b stub: shapes only. Real windowed z-score logic lands in Y2 (PRD §8.3)."""
from engine.types import (
    AttentionReading,
    Baseline,
    Event,
    Intervention,
    ItemMeta,
    SessionCtx,
    SessionSummary,
)

WINDOW = 8


def score_attention(events: list[Event], items: dict[int, ItemMeta], baseline: Baseline) -> AttentionReading:
    answered = [e for e in events if e.type == "ITEM_ANSWERED"][-WINDOW:]
    return AttentionReading(
        state="FOCUSED",
        latency_cv=None,
        latency_ratio=None,
        idle_count=sum(e.type == "IDLE" for e in events),
        blur_count=sum(e.type == "TAB_BLUR" for e in events),
        window_n=len(answered),
    )


def recommend_intervention(reading: AttentionReading, ctx: SessionCtx) -> Intervention:
    return Intervention(type="NONE", message="")


def update_baseline(baseline: Baseline, session_events: list[Event], items: dict[int, ItemMeta]) -> Baseline:
    return baseline.model_copy(update={"n_sessions": baseline.n_sessions + 1})


def focus_window(sessions: list[SessionSummary]) -> int:
    return 20
