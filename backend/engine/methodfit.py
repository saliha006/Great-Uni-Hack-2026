"""Reward and method choice (PRD §8.2): Beta per (subject, method), Thompson sampling with an exploration floor."""
import math
import random
import statistics
from datetime import datetime

from engine.priors import METHOD_TECHNIQUE, PRIOR_MEAN, PRIOR_STRENGTH, SHORT_BLOCKS
from engine.types import (
    LIVE_METHODS,
    METHOD_LABELS,
    Confidence,
    Method,
    MethodStats,
    MethodStatView,
    Plan,
    SessionSummary,
    SubjectCtx,
)

EFFICIENCY_SCALE = 0.02  # TUNE: spread of learning-per-minute around the user's median
EXPLORATION_FLOOR = 0.15  # TUNE: share of adaptive sessions forced onto a non-best method
CI_Z = 1.645  # TUNE: 90% interval; normal approximation to the Beta, fine once alpha + beta >= 4
DEFAULT_MEDIAN_EFFICIENCY = 0.035  # TUNE: about 0.6 probe score in 17 minutes


def _retention(probe: float, delayed: float | None) -> float:
    # A delayed probe measures what stuck; prefer it when it exists (PRD §8.1).
    return delayed if delayed is not None else probe


def session_reward(probe: float, delayed: float | None, active_min: float, felt: int, user_median_eff: float) -> float:
    retention = _retention(probe, delayed)
    efficiency = retention / max(active_min, 1)
    eff_norm = 1 / (1 + math.exp(-(efficiency - user_median_eff) / EFFICIENCY_SCALE))
    felt_norm = (felt - 1) / 4
    return 0.60 * retention + 0.25 * eff_norm + 0.15 * felt_norm  # TUNE weights


def prior_stats(method: Method) -> MethodStats:
    """Cold-start Beta for a method; the backend creates each method_stats row from this."""
    technique = METHOD_TECHNIQUE.get(method)
    # BLURTING (roadmap) has no Dunlosky row; give it a neutral prior instead of failing.
    mean = PRIOR_MEAN[technique.utility] if technique else PRIOR_MEAN["moderate"]
    return MethodStats(alpha=mean * PRIOR_STRENGTH, beta=(1 - mean) * PRIOR_STRENGTH)


def update_stats(stats: MethodStats, reward: float) -> MethodStats:
    return MethodStats(alpha=stats.alpha + reward, beta=stats.beta + 1 - reward, n=stats.n + 1)


def posterior_mean(stats: MethodStats) -> float:
    return stats.alpha / (stats.alpha + stats.beta)


def with_priors(stats: dict[Method, MethodStats]) -> dict[Method, MethodStats]:
    """Stats for every live method, filling any method with no row yet from its prior."""
    return {m: stats.get(m) or prior_stats(m) for m in LIVE_METHODS}


def stat_view(method: Method, stats: MethodStats) -> MethodStatView:
    """Posterior mean reward with a 90% credible interval, as the API's method_stats rows."""
    total = stats.alpha + stats.beta
    mean = posterior_mean(stats)
    half = CI_Z * math.sqrt(stats.alpha * stats.beta / (total ** 2 * (total + 1)))
    return MethodStatView(method=method, n=stats.n, mean_reward=round(mean, 3),
                          ci_low=round(max(0.0, mean - half), 3), ci_high=round(min(1.0, mean + half), 3))


def median_efficiency(history: list[SessionSummary]) -> float:
    effs = [_retention(s.probe_score, s.delayed_score) / max(s.active_minutes, 1) for s in history]
    return statistics.median(effs) if effs else DEFAULT_MEDIAN_EFFICIENCY


def stats_from_history(history: list[SessionSummary]) -> dict[Method, MethodStats]:
    """Replay sessions into Beta stats from the priors; /dev/seed uses it so seeded rows and stats agree."""
    median = median_efficiency(history)
    stats = with_priors({})
    for s in sorted(history, key=lambda s: s.ts):
        reward = session_reward(s.probe_score, s.delayed_score, s.active_minutes, s.felt_rating, median)
        stats[s.method] = update_stats(stats.get(s.method) or prior_stats(s.method), reward)
    return stats


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
            "reason": f"Trying {METHOD_LABELS[current.method]} until {current.trial_until[:10]} to see if it beats the plateau.",
        })

    n = len(LIVE_METHODS)
    if subject.phase == "SAMPLING":
        shift = subject.subject_id % n  # Latin-square rotation so subjects don't all start on the same method
        order = LIVE_METHODS[shift:] + LIVE_METHODS[:shift]
        round_idx = subject.sampler_round % n
        method = order[round_idx]
        return Plan(method=method, mode="SAMPLER", session_minutes=minutes,
                    reason=f"Calibration round {round_idx + 1} of {n}: trying {METHOD_LABELS[method]}.")

    posterior = with_priors(stats)
    best = max(LIVE_METHODS, key=lambda m: posterior_mean(posterior[m]))
    if rng.random() < EXPLORATION_FLOOR:
        method = rng.choice([m for m in LIVE_METHODS if m != best])
        reason = f"Checking {METHOD_LABELS[method]} again so the comparison with {METHOD_LABELS[best]} stays fair."
    else:
        method = max(LIVE_METHODS, key=lambda m: rng.betavariate(posterior[m].alpha, posterior[m].beta))
        label = METHOD_LABELS[method].capitalize()
        reason = (f"{label} has worked best for you so far." if method == best
                  else f"{label} could still beat {METHOD_LABELS[best]}, so trying it.")
    return Plan(method=method, mode="ADAPTIVE", session_minutes=minutes, reason=reason)


def confidence(stats: dict[Method, MethodStats]) -> Confidence:
    fewest = min((s.n for s in stats.values()), default=0)
    if fewest < 2:
        return "EARLY"
    if fewest < 5:
        return "MODERATE"
    # HIGH also needs the best method's interval to clear the runner-up's (PRD §8.2).
    views = sorted((stat_view(m, s) for m, s in stats.items()), key=lambda v: v.mean_reward, reverse=True)
    return "HIGH" if len(views) < 2 or views[0].ci_low > views[1].ci_high else "MODERATE"
