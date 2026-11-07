"""Y0b stub: deterministic seeded history with plausible numbers. Ada's fatigue/plateau story lands in Y3."""
import random
from datetime import datetime, timedelta

from engine.types import LIVE_METHODS, SessionSummary

DAYS = 21
START = datetime(2026, 10, 17, 18, 0)


def make_persona(name: str, seed: int) -> list[SessionSummary]:
    rng = random.Random(f"{name}:{seed}")
    return [
        SessionSummary(
            session_id=day + 1,
            ts=START + timedelta(days=day),
            method=LIVE_METHODS[day % len(LIVE_METHODS)],
            mode="SAMPLER" if day < len(LIVE_METHODS) else "ADAPTIVE",
            probe_score=round(min(1.0, 0.45 + 0.015 * day + rng.uniform(-0.08, 0.08)), 2),
            active_minutes=round(rng.uniform(12, 22), 1),
            completion=1.0,
            felt_rating=rng.randint(2, 5),
            drift_share=round(rng.uniform(0.0, 0.25), 2),
            lapse_share=round(rng.uniform(0.0, 0.08), 2),
            gap_days_before=0.0 if day == 0 else 1.0,
            hour_of_day=18,
            is_seeded=True,
        )
        for day in range(DAYS)
    ]
