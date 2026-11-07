"""Reward and method choice (PRD §8.2): Beta per (subject, method), Thompson sampling with an exploration floor."""
import math
import random
from datetime import datetime

from engine.priors import METHOD_TECHNIQUE, PRIOR_MEAN, PRIOR_STRENGTH, SHORT_BLOCKS
from engine.types import (
    LIVE_METHODS,
    METHOD_LABELS,
    Confidence,
    Method,
    MethodStats,
    Plan,
    SessionSummary,
    SubjectCtx,
)

EFFICIENCY_SCALE = 0.02  # TUNE: spread of learning-per-minute around the user's median
EXPLORATION_FLOOR = 0.15  # TUNE: share of adaptive sessions forced onto a non-best method


def session_reward(probe: float, delayed: float | None, active_min: float, felt: int, user_median_eff: float) -> float:
    retention = delayed if delayed is not None else probe
    efficiency = retention / max(active_min, 1)
    eff_norm = 1 / (1 + math.exp(-(efficiency - user_median_eff) / EFFICIENCY_SCALE))
    felt_norm = (felt - 1) / 4
    return 0.60 * retention + 0.25 * eff_norm + 0.15 * felt_norm  # TUNE weights


def prior_stats(method: Method) -> MethodStats:
    """Cold-start Beta for a method; the backend creates each method_stats row from this."""
    mean = PRIOR_MEAN[METHOD_TECHNIQUE[method].utility]
    return MethodStats(alpha=mean * PRIOR_STRENGTH, beta=(1 - mean) * PRIOR_STRENGTH)


def update_stats(stats: MethodStats, reward: float) -> MethodStats:
    return MethodStats(alpha=stats.alpha + reward, beta=stats.beta + 1 - reward, n=stats.n + 1)


def _mean(stats: MethodStats) -> float:
    return stats.alpha / (stats.alpha + stats.beta)


def _label(method: Method) -> str:
    return METHOD_LABELS[method]


def _trial_running(plan: Plan | None, now: datetime) -> bool:
    # Compare calendar dates as strings: trial_until may carry a timezone while "now" is naive.
    return bool(plan and plan.mode == "TRIAL" and plan.trial_until and now.date().isoformat() < plan.trial_until[:10])


def choose_plan(
    subject: SubjectCtx, stats: dict[Method, MethodStats], history: list[SessionSummary], rng: random.Random
) -> Plan:
    minutes = SHORT_BLOCKS.session_minutes if "short_blocks" in subject.profiles else subject.focus_window_min
    current = subject.current_plan
    if _trial_running(current, subject.now):
        return current.model_copy(update={
            "session_minutes": minutes,
            "reason": f"Trying {_label(current.method)} until {current.trial_until[:10]} to see if it beats the plateau.",
        })

    n = len(LIVE_METHODS)
    if subject.phase == "SAMPLING":
        shift = subject.subject_id % n  # Latin-square rotation so subjects don't all start on the same method
        order = LIVE_METHODS[shift:] + LIVE_METHODS[:shift]
        round_idx = subject.sampler_round % n
        method = order[round_idx]
        return Plan(method=method, mode="SAMPLER", session_minutes=minutes,
                    reason=f"Calibration round {round_idx + 1} of {n}: trying {_label(method)}.")

    posterior = {m: stats.get(m) or prior_stats(m) for m in LIVE_METHODS}
    best = max(LIVE_METHODS, key=lambda m: _mean(posterior[m]))
    if rng.random() < EXPLORATION_FLOOR:
        method = rng.choice([m for m in LIVE_METHODS if m != best])
        reason = f"Checking {_label(method)} again so the comparison with {_label(best)} stays fair."
    else:
        method = max(LIVE_METHODS, key=lambda m: rng.betavariate(posterior[m].alpha, posterior[m].beta))
        reason = (f"{_label(method).capitalize()} has taught you the most per minute so far."
                  if method == best else f"{_label(method).capitalize()} could still beat {_label(best)}, so trying it.")
    return Plan(method=method, mode="ADAPTIVE", session_minutes=minutes, reason=reason)


def confidence(stats: dict[Method, MethodStats]) -> Confidence:
    fewest = min((s.n for s in stats.values()), default=0)
    if fewest < 2:
        return "EARLY"
    return "MODERATE" if fewest < 5 else "HIGH"
