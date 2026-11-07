"""Seeded demo personas (every session is_seeded=True). Noise is small on purpose so the story the demo
tells (PRD §18) holds for any seed: the numbers are illustrative, not data from a real student."""
import random
from datetime import datetime, timedelta

from engine.types import Method, SessionMode, SessionSummary

START = datetime(2026, 10, 17, 18, 0)
NOISE = 0.015


def _session(rng: random.Random, sid: int, day: int, method: Method, mode: SessionMode, probe: float,
             drift: float, completion: float, hour: int, gap: float) -> SessionSummary:
    jitter = rng.uniform(-NOISE, NOISE)
    active = round(rng.uniform(16, 20) * completion, 1)
    return SessionSummary(
        session_id=sid,
        ts=START.replace(hour=hour) + timedelta(days=day),
        method=method,
        mode=mode,
        probe_score=round(min(1.0, max(0.0, probe + jitter)), 3),
        active_minutes=active,
        completion=round(completion, 2),
        felt_rating=4 if drift < 0.3 else 2,
        drift_share=round(max(0.0, drift + jitter), 3),
        lapse_share=round(max(0.0, drift / 4), 3),
        gap_days_before=gap,
        hour_of_day=hour,
        minutes_to_first_drift=round(active * (1 - drift), 1) if drift >= 0.15 else None,
        is_seeded=True,
    )


def _ada(rng: random.Random) -> list[SessionSummary]:
    """Week 1 improves on Practice Test; week 2 a late-night fatigue spell (scores hold, focus slips);
    week 3 focus is back but Practice Test is flat below 0.85: a plateau a Feynman trial can fix."""
    plan: list[tuple[Method, SessionMode, float, float, float, int]] = [
        ("ACTIVE_RECALL", "SAMPLER", 0.38, 0.10, 1.0, 18),
        ("PRACTICE_TEST", "SAMPLER", 0.60, 0.08, 1.0, 18),
        ("FEYNMAN", "SAMPLER", 0.64, 0.10, 1.0, 18),
        ("PRACTICE_TEST", "ADAPTIVE", 0.63, 0.08, 1.0, 18),
        ("PRACTICE_TEST", "ADAPTIVE", 0.66, 0.10, 1.0, 19),
        ("FEYNMAN", "ADAPTIVE", 0.68, 0.10, 1.0, 18),
        ("PRACTICE_TEST", "ADAPTIVE", 0.70, 0.08, 1.0, 18),
    ]
    plan += [("PRACTICE_TEST", "ADAPTIVE", 0.70, 0.12 + 0.07 * i, 0.95 - 0.03 * i, 23) for i in range(7)]
    plan += [("PRACTICE_TEST", "ADAPTIVE", 0.66 - 0.005 * i, 0.10, 1.0, 18) for i in range(7)]
    return [_session(rng, i + 1, i, *row, gap=0.0 if i == 0 else 1.0) for i, row in enumerate(plan)]


def _ben(rng: random.Random) -> list[SessionSummary]:
    """Steady learner: scores rise for two weeks (ON_TRACK), then hold near 0.9 (MASTERED)."""
    methods: tuple[Method, ...] = ("ACTIVE_RECALL", "PRACTICE_TEST", "FEYNMAN")
    rows = []
    for day in range(21):
        method = methods[day] if day < 3 else "ACTIVE_RECALL"
        mode: SessionMode = "SAMPLER" if day < 3 else "ADAPTIVE"
        probe = min(0.9, 0.5 + 0.03 * day)
        rows.append(_session(rng, day + 1, day, method, mode, probe, 0.08, 1.0, 17, 0.0 if day == 0 else 1.0))
    return rows


PERSONAS = {"Ada": _ada, "Ben": _ben}


def make_persona(name: str, seed: int) -> list[SessionSummary]:
    """About 3 weeks of one-session-a-day history for a named persona (Ada or Ben)."""
    return PERSONAS[name](random.Random(f"{name}:{seed}"))


def trial_sessions(name: str, seed: int, method: Method, after: datetime, days: int,
                   first_id: int) -> list[SessionSummary]:
    """Sessions a persona would log during a method trial, for /dev/advance-days. Ada does better on Feynman."""
    rng = random.Random(f"{name}:{seed}:trial:{method}")
    base = 0.74 if (name, method) == ("Ada", "FEYNMAN") else 0.64
    start_day = (after - START).days + 1
    return [_session(rng, first_id + i, start_day + i, method, "TRIAL", base + 0.01 * i, 0.10, 1.0, 18, 1.0)
            for i in range(days)]
