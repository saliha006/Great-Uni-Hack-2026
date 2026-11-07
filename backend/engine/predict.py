"""Readiness estimate (PRD §8.6). Shown with its confidence, never as a predicted grade; not validated against exams."""
from engine.types import Method, Readiness, SessionSummary, SubjectKind

HALF_LIFE_DAYS = 7.0  # TUNE: a week-old session counts half
SHRINK_K = 3  # shrink toward 0.5 by n/(n+3)
PERFORMANCE_METHODS: tuple[Method, ...] = ("PRACTICE_TEST",)
UNDERSTANDING_METHODS: tuple[Method, ...] = ("FEYNMAN", "ACTIVE_RECALL")
STALE_DAYS = 14


def _estimate(sessions: list[SessionSummary], latest) -> float | None:
    if not sessions:
        return None
    weights = [0.5 ** ((latest - s.ts).total_seconds() / 86400 / HALF_LIFE_DAYS) for s in sessions]
    mean = sum(w * s.probe_score for w, s in zip(weights, sessions)) / sum(weights)
    n = len(sessions)
    return round(0.5 + (mean - 0.5) * n / (n + SHRINK_K), 3)


def predict_readiness(history: list[SessionSummary], kind: SubjectKind) -> Readiness:
    if not history:
        return Readiness(performance=None, understanding=None, confidence="LOW")
    latest = max(s.ts for s in history)
    perf = [s for s in history if s.method in PERFORMANCE_METHODS]
    under = [s for s in history if s.method in UNDERSTANDING_METHODS]
    primary = perf if kind == "PERFORMANCE" else under

    levels = ("LOW", "MEDIUM", "HIGH")
    level = 2 if len(primary) >= 8 else 1 if len(primary) >= 4 else 0
    if primary and (latest - max(s.ts for s in primary)).days > STALE_DAYS:
        level = max(0, level - 1)
    return Readiness(performance=_estimate(perf, latest), understanding=_estimate(under, latest),
                     confidence=levels[level])
