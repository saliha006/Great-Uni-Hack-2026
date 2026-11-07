"""Y0b stub: templated reflection, no LLM call. Real policy + LLM narration lands in Y4 (PRD §8.5)."""
from engine.diagnose import diagnose
from engine.types import (
    LLM,
    Decision,
    Method,
    MethodStats,
    Plan,
    Reflection,
    SessionSummary,
    SubjectCtx,
)


def reflect(
    subject: SubjectCtx,
    history: list[SessionSummary],
    stats: dict[Method, MethodStats],
    plan: Plan,
    trigger: str,
    llm: LLM,
) -> Reflection:
    found = diagnose(history, plan)
    return Reflection(
        id=0,
        ts=subject.now.isoformat(),
        trigger=trigger,
        diagnosis=found.name,
        evidence=found.evidence,
        decision=Decision(action="KEEP"),
        explanation=f"You're on track with {plan.method.replace('_', ' ').lower()}, so the plan stays as it is.",
    )
