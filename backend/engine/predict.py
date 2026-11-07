"""Y0b stub: mean of recent probes. Shrinkage and recency weighting land in Y4 (PRD §8.6)."""
from engine.types import Readiness, SessionSummary, SubjectKind

RECENT = 5


def predict_readiness(history: list[SessionSummary], kind: SubjectKind) -> Readiness:
    recent = [s.probe_score for s in history[-RECENT:]]
    score = sum(recent) / len(recent) if recent else None
    if kind == "PERFORMANCE":
        return Readiness(performance=score, understanding=None, confidence="LOW")
    return Readiness(performance=None, understanding=score, confidence="LOW")
