from datetime import datetime

from engine import types
from engine.types import Event, MethodStats, Plan, SessionSummary


def test_module_exports_the_interface_names():
    assert all(hasattr(types, n) for n in ("LLM", "SessionSummary", "SubjectCtx", "SessionCtx", "Baseline"))


def test_event_parses_iso_timestamp_from_contract():
    assert Event(type="TAB_BLUR", ts="2026-11-07T14:40:00Z").ts.year == 2026


def test_plan_matches_contract_fields():
    assert set(Plan.model_fields) == {"method", "mode", "session_minutes", "trial_until", "reason"}


def test_session_summary_fields_match_brief():
    assert set(SessionSummary.model_fields) == {
        "session_id", "ts", "method", "mode", "probe_score", "delayed_score", "active_minutes", "completion",
        "felt_rating", "drift_share", "lapse_share", "gap_days_before", "hour_of_day", "is_seeded",
        "minutes_to_first_drift",
    }
    SessionSummary(session_id=1, ts=datetime(2026, 11, 7), method="FEYNMAN", mode="SAMPLER", probe_score=0.5,
                   active_minutes=10, completion=1, felt_rating=3, drift_share=0, lapse_share=0,
                   gap_days_before=1, hour_of_day=14)


def test_method_stats_starts_with_no_sessions():
    assert MethodStats(alpha=2, beta=2).n == 0
