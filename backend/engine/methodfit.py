"""Reward and method choice (PRD §8.2). Y0b: reward and Beta update are real; choose_plan is round-robin only."""
import math
import random

from engine.types import (
    LIVE_METHODS,
    Confidence,
    Method,
    MethodStats,
    Plan,
    SessionSummary,
    SubjectCtx,
)

EFFICIENCY_SCALE = 0.02  # TUNE: spread of learning-per-minute around the user's median


def session_reward(probe: float, delayed: float | None, active_min: float, felt: int, user_median_eff: float) -> float:
    retention = delayed if delayed is not None else probe
    efficiency = retention / max(active_min, 1)
    eff_norm = 1 / (1 + math.exp(-(efficiency - user_median_eff) / EFFICIENCY_SCALE))
    felt_norm = (felt - 1) / 4
    return 0.60 * retention + 0.25 * eff_norm + 0.15 * felt_norm  # TUNE weights


def update_stats(stats: MethodStats, reward: float) -> MethodStats:
    return MethodStats(alpha=stats.alpha + reward, beta=stats.beta + 1 - reward, n=stats.n + 1)


def choose_plan(
    subject: SubjectCtx, stats: dict[Method, MethodStats], history: list[SessionSummary], rng: random.Random
) -> Plan:
    method = LIVE_METHODS[subject.sampler_round % len(LIVE_METHODS)]
    return Plan(
        method=method,
        mode="SAMPLER",
        session_minutes=subject.focus_window_min,
        reason=f"Calibration round {subject.sampler_round % len(LIVE_METHODS) + 1} of {len(LIVE_METHODS)}",
    )


def confidence(stats: dict[Method, MethodStats]) -> Confidence:
    fewest = min((s.n for s in stats.values()), default=0)
    if fewest < 2:
        return "EARLY"
    return "MODERATE" if fewest < 5 else "HIGH"
