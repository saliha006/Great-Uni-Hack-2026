"""Y0b stub: shapes only. Real decision table lands in Y3 (PRD §8.4)."""
from engine.types import Diagnosis, Plan, SessionSummary, TrialOutcome


def diagnose(history: list[SessionSummary], plan: Plan) -> Diagnosis:
    return Diagnosis(name="ON_TRACK", evidence={"sessions": len(history), "stub": True})


def evaluate_trial(history: list[SessionSummary], trial: Plan) -> TrialOutcome:
    return TrialOutcome(adopt=False, delta=0.0, n=sum(s.method == trial.method for s in history))
