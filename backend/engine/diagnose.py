"""Why progress stalled: tired vs absent vs plateau vs mastered (PRD §8.4). All thresholds are TUNE."""
import statistics
from datetime import timedelta
from itertools import combinations

from engine.types import Diagnosis, Plan, SessionSummary, TrialOutcome

WINDOW = 6
MIN_SESSIONS, MIN_DAYS = 3, 3
ENGAGED_SESSIONS_7D, ENGAGED_COMPLETION, ENGAGED_MAX_GAP_DAYS = 3, 0.7, 3
NOT_FOCUSED_MAX = 0.35
RISING_MIN = 0.05  # a rise smaller than this over 3 sessions is noise, not degrading attention
FLAT_SLOPE, DECLINING_SLOPE = 0.02, -0.04
MASTERED_MEAN = 0.85
TRIAL_MIN_DELTA, TRIAL_MIN_N = 0.05, 2


def theil_sen_slope(values: list[float]) -> float:
    """Median of pairwise slopes per session; robust to one bad session, unlike least squares."""
    slopes = [(values[j] - values[i]) / (j - i) for i, j in combinations(range(len(values)), 2)]
    return statistics.median(slopes) if slopes else 0.0


def diagnose(history: list[SessionSummary], plan: Plan) -> Diagnosis:
    history = sorted(history, key=lambda s: s.ts)
    window = history[-WINDOW:]
    if len(window) < MIN_SESSIONS or (window[-1].ts - window[0].ts).days < MIN_DAYS:
        return Diagnosis(name="ON_TRACK", evidence={"insufficient_data": True, "sessions": len(window)})

    latest = window[-1].ts
    sessions_7d = sum(s.ts > latest - timedelta(days=7) for s in history)
    mean_completion = statistics.mean(s.completion for s in window)
    median_gap = statistics.median(s.gap_days_before for s in window)
    engagement_ok = (sessions_7d >= ENGAGED_SESSIONS_7D and mean_completion >= ENGAGED_COMPLETION
                     and median_gap <= ENGAGED_MAX_GAP_DAYS)

    not_focused = [s.drift_share + s.lapse_share for s in window]
    last3 = not_focused[-3:]
    attention_rising = len(last3) == 3 and last3[0] < last3[1] < last3[2] and last3[2] - last3[0] >= RISING_MIN
    attention_ok = statistics.median(not_focused) < NOT_FOCUSED_MAX and not attention_rising

    on_method = [s.probe_score for s in window if s.method == plan.method]
    probes = on_method if len(on_method) >= MIN_SESSIONS else [s.probe_score for s in window]
    slope = theil_sen_slope(probes)
    mean_probe = statistics.mean(probes)
    flat, declining = abs(slope) < FLAT_SLOPE, slope < DECLINING_SLOPE

    evidence = {
        "sessions": len(window),
        "days": (latest - window[0].ts).days,
        "method": plan.method,
        "mean_probe": round(mean_probe, 3),
        "slope_per_session": round(slope, 3),
        "sessions_last_7d": sessions_7d,
        "mean_completion": round(mean_completion, 2),
        "median_gap_days": median_gap,
        "median_not_focused": round(statistics.median(not_focused), 2),
        "attention_rising": attention_rising,
        "engagement_ok": engagement_ok,
        "attention_ok": attention_ok,
    }
    # Order follows the PRD §8.4 table: a high plateau is success, so MASTERED wins first.
    if (flat or slope > 0) and mean_probe >= MASTERED_MEAN:
        name = "MASTERED"
    elif not engagement_ok:
        name = "LOW_ENGAGEMENT"
    elif not attention_ok:
        name = "FATIGUE"
    elif flat or declining:
        name = "PLATEAU"
    else:
        name = "ON_TRACK"
    return Diagnosis(name=name, evidence=evidence)


def evaluate_trial(history: list[SessionSummary], trial: Plan) -> TrialOutcome:
    """Trial sessions vs the same number of sessions just before the trial started (PRD §8.4)."""
    history = sorted(history, key=lambda s: s.ts)
    trial_idx = [i for i, s in enumerate(history) if s.mode == "TRIAL" and s.method == trial.method]
    if not trial_idx:
        return TrialOutcome(adopt=False, delta=0.0, n=0)
    before = history[max(0, trial_idx[0] - len(trial_idx)):trial_idx[0]]
    if not before:
        return TrialOutcome(adopt=False, delta=0.0, n=len(trial_idx))
    delta = statistics.mean(history[i].probe_score for i in trial_idx) - statistics.mean(s.probe_score for s in before)
    n = len(trial_idx)
    return TrialOutcome(adopt=delta >= TRIAL_MIN_DELTA and n >= TRIAL_MIN_N, delta=round(delta, 3), n=n)
