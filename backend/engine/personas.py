"""Seeded demo students whose history is generated period by period, so the engine's own reflections tell the story.

Every session is is_seeded=True: illustrative numbers, not data from a real student. Each period lasts 7-9 days
(drawn from a seeded RNG, so a given seed always tells the same story) and ends with a recalibration.
"""
import random
from datetime import datetime, timedelta

from pydantic import BaseModel

from engine.types import Method, SessionSummary


class Persona(BaseModel):
    key: str
    name: str
    label: str
    blurb: str


PERSONAS: dict[str, Persona] = {p.key: p for p in (
    Persona(key="steady", name="Mia", label="Steady",
            blurb="Scores hold at about the same level whatever she tries, so recalibrations confirm her plan."),
    Persona(key="breakthrough", name="Leo", label="Plateaus, then breaks through",
            blurb="Progress flattens every week or so; each recalibration switches method and his scores step up."),
    Persona(key="bursts", name="Kai", label="Focus comes in bursts",
            blurb="Tired late-night spells make his focus slip; shorter sessions bring it back and scores climb."),
)}
PERIODS = 5
MIN_DAYS, MAX_DAYS = 7, 9
NOISE = 0.012


def period_days(rng: random.Random) -> int:
    return rng.randint(MIN_DAYS, MAX_DAYS)


def period(key: str, rng: random.Random, start: datetime, days: int, method: Method, minutes: int, index: int,
           first_id: int) -> list[SessionSummary]:
    """One session a day for `days` days on `method`, shaped by the persona and how many recalibrations came before."""
    out = []
    for d in range(days):
        jitter = rng.uniform(-NOISE, NOISE)
        if key == "steady":
            probe, drift, hour = 0.74, 0.12, 18
        elif key == "breakthrough":
            probe, drift, hour = min(0.9, 0.5 + 0.1 * index), 0.12, 18
        else:
            tired = index % 2 == 0
            # Tired spells: focus slips but scores hold (FATIGUE). Rested spells: focus back, scores climbing.
            probe = 0.6 + 0.02 * index + (0.0 if tired else 0.025 * d)
            drift, hour = (0.42, 23) if tired else (0.15, 17)
        completion = 0.9
        active = round(minutes * completion * rng.uniform(0.9, 1.0), 1)
        out.append(SessionSummary(
            session_id=first_id + d, ts=start + timedelta(days=d, hours=hour - start.hour), method=method,
            mode="ADAPTIVE", probe_score=round(min(1.0, max(0.0, probe + jitter)), 3), active_minutes=active,
            completion=completion, felt_rating=4 if drift < 0.3 else 2, drift_share=round(max(0.0, drift + jitter), 3),
            lapse_share=round(drift / 4, 3), gap_days_before=1.0, hour_of_day=hour,
            minutes_to_first_drift=round(active * (1 - drift), 1) if drift >= 0.15 else None, is_seeded=True))
    return out
