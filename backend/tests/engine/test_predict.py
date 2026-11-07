from datetime import datetime, timedelta

import pytest
from engine.predict import predict_readiness
from engine.types import SessionSummary

START = datetime(2026, 10, 20, 18, 0)


def session(day, method, probe):
    return SessionSummary(session_id=day, ts=START + timedelta(days=day), method=method, mode="ADAPTIVE",
                          probe_score=probe, active_minutes=20, completion=1, felt_rating=3, drift_share=0,
                          lapse_share=0, gap_days_before=1, hour_of_day=18)


def test_no_history_is_low_confidence_with_no_numbers():
    assert predict_readiness([], "KNOWLEDGE").model_dump() == {"performance": None, "understanding": None,
                                                                "confidence": "LOW"}


def test_one_session_is_shrunk_hard_toward_half():
    got = predict_readiness([session(0, "PRACTICE_TEST", 1.0)], "PERFORMANCE")
    assert got.performance == pytest.approx(0.625) and got.understanding is None


def test_recent_sessions_weigh_more():
    old_bad = [session(0, "FEYNMAN", 0.2), session(14, "FEYNMAN", 0.9)]
    old_good = [session(0, "FEYNMAN", 0.9), session(14, "FEYNMAN", 0.2)]
    assert predict_readiness(old_bad, "KNOWLEDGE").understanding > predict_readiness(old_good, "KNOWLEDGE").understanding


def test_methods_feed_the_right_score():
    got = predict_readiness([session(0, "PRACTICE_TEST", 0.8), session(1, "ACTIVE_RECALL", 0.4)], "KNOWLEDGE")
    assert got.performance > 0.5 > got.understanding


def test_confidence_grows_with_primary_sessions():
    many = [session(d, "PRACTICE_TEST", 0.7) for d in range(8)]
    assert predict_readiness(many[:3], "PERFORMANCE").confidence == "LOW"
    assert predict_readiness(many[:4], "PERFORMANCE").confidence == "MEDIUM"
    assert predict_readiness(many, "PERFORMANCE").confidence == "HIGH"


def test_stale_primary_evidence_lowers_confidence():
    old = [session(d, "PRACTICE_TEST", 0.7) for d in range(8)] + [session(30, "FEYNMAN", 0.5)]
    assert predict_readiness(old, "PERFORMANCE").confidence == "MEDIUM"
