"""Reflection agent (PRD §8.5): the rule table decides, the LLM only narrates.

Any LLM failure or out-of-policy output falls back to a templated explanation; reflect() never raises on LLM output.
"""
import json

from engine.diagnose import diagnose
from engine.methodfit import prior_stats
from engine.types import (
    LIVE_METHODS,
    LLM,
    Decision,
    Diagnosis,
    Method,
    MethodStats,
    Plan,
    Reflection,
    SessionSummary,
    SubjectCtx,
)

TRIAL_DAYS = 7
EASE_IN_MINUTES = 5
MIN_SESSION_MINUTES = 10
MAX_EXPLANATION_CHARS = 600

SYSTEM = (
    "You explain a study plan change to a student in at most 3 short, supportive sentences. "
    "Use only the evidence given; name the method and at least one number from it. "
    "Never mention ADHD, diagnosis or medical terms. Do not propose any other action."
)
SCHEMA = {
    "type": "object",
    "properties": {"explanation": {"type": "string"}},
    "required": ["explanation"],
    "additionalProperties": False,
}


def _label(method: Method) -> str:
    return method.replace("_", " ").lower()


def _second_best(stats: dict[Method, MethodStats], current: Method) -> Method:
    def mean(m: Method) -> float:
        s = stats.get(m) or prior_stats(m)
        return s.alpha / (s.alpha + s.beta)

    return max((m for m in LIVE_METHODS if m != current), key=mean)


def decide(found: Diagnosis, plan: Plan, stats: dict[Method, MethodStats]) -> Decision:
    """PRD §8.4 action table. FATIGUE and LOW_ENGAGEMENT never change the method."""
    if found.name == "MASTERED":
        return Decision(action="RAISE_DIFFICULTY")
    if found.name == "LOW_ENGAGEMENT":
        return Decision(action="EASE_IN", session_minutes=EASE_IN_MINUTES)
    if found.name == "FATIGUE":
        return Decision(action="SHORTEN_SESSIONS",
                        session_minutes=max(MIN_SESSION_MINUTES, round(plan.session_minutes * 0.75)))
    if found.name == "PLATEAU":
        return Decision(action="TRIAL_METHOD", method=_second_best(stats, plan.method), trial_days=TRIAL_DAYS)
    return Decision(action="KEEP")


def template(found: Diagnosis, decision: Decision, plan: Plan) -> str:
    ev = found.evidence
    if ev.get("insufficient_data"):
        return "Not enough sessions yet to spot a pattern, so the plan stays as it is for now."
    days, method = ev.get("days", 0), _label(plan.method)
    focus = round(100 * (1 - ev.get("median_not_focused", 0)))
    texts = {
        "MASTERED": f"Your {method} scores have held at {ev.get('mean_probe', 0):.0%} over {days} days. "
                    "That's mastery, so the next sessions get harder.",
        "LOW_ENGAGEMENT": f"You've had {ev.get('sessions_last_7d', 0)} sessions in the last week. "
                          f"Let's restart gently with {decision.session_minutes}-minute sessions on {method}.",
        "FATIGUE": f"Over {days} days your focus slipped to about {focus}% while scores held, which looks like "
                   f"tiredness, not the method. Sessions drop to {decision.session_minutes} minutes; {method} stays.",
        "PLATEAU": f"Your focus was steady (about {focus}%) but {method} scores stayed flat for {days} days. "
                   f"Let's try {_label(decision.method or plan.method)} for {decision.trial_days} days and compare.",
        "ON_TRACK": f"Your {method} scores are moving the right way over {days} days, so the plan stays.",
    }
    return texts[found.name]


def _narrate(llm: LLM, found: Diagnosis, decision: Decision, plan: Plan) -> str | None:
    user = json.dumps({"diagnosis": found.name, "decision": decision.model_dump(exclude_none=True),
                       "current_method": plan.method, "evidence": found.evidence})
    try:
        text = llm.complete_json(SYSTEM, user, SCHEMA, "smart").get("explanation")
    except Exception:  # noqa: BLE001 — any provider failure must fall back to the template, never fail the call
        return None
    if not isinstance(text, str) or not text.strip() or len(text) > MAX_EXPLANATION_CHARS:
        return None
    if any(word in text.lower() for word in ("adhd", "diagnos", "disorder")):
        return None
    return text.strip()


def reflect(
    subject: SubjectCtx,
    history: list[SessionSummary],
    stats: dict[Method, MethodStats],
    plan: Plan,
    trigger: str,
    llm: LLM,
) -> Reflection:
    found = diagnose(history, plan)
    decision = decide(found, plan, stats)
    explanation = _narrate(llm, found, decision, plan) if not found.evidence.get("insufficient_data") else None
    return Reflection(
        id=0,  # the backend assigns the stored id
        ts=subject.now.isoformat(),
        trigger=trigger,
        diagnosis=found.name,
        evidence=found.evidence,
        decision=decision,
        explanation=explanation or template(found, decision, plan),
    )
