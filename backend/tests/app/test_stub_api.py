import pytest
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

GETS = [
    "/api/health",
    "/api/subjects",
    "/api/subjects/1/state",
    "/api/sessions/1/next-item",
    "/api/voice/signed-url?session_id=1",
    "/api/subjects/1/insights",
    "/api/subjects/1/reflections",
    "/api/dev/usage",
]

POSTS = [
    ("/api/subjects", {"name": "Maths", "kind": "PERFORMANCE"}),
    ("/api/subjects/1/material", {"title": "Notes", "text": "Some text"}),
    ("/api/sessions", {"subject_id": 1}),
    ("/api/sessions/1/answer", {"item_id": 1, "answer": "x", "latency_ms": 900, "self_grade": 0.5}),
    ("/api/sessions/1/events", {"events": [{"type": "TAB_BLUR", "ts": "2026-11-07T14:40:00Z"}]}),
    ("/api/sessions/1/feynman-transcript", {"turns": [{"role": "user", "text": "hi", "ts": "2026-11-07T14:40:00Z"}]}),
    ("/api/sessions/1/finish", None),
    ("/api/sessions/1/probe", {"answers": [{"item_id": 10, "answer": "A", "latency_ms": 500}], "felt_rating": 4}),
    ("/api/agent/reflect", {"subject_id": 1, "trigger": "MANUAL"}),
    ("/api/dev/seed", None),
    ("/api/dev/advance-days", {"days": 7}),
    ("/api/dev/reset", None),
]


@pytest.mark.parametrize("path", GETS)
def test_get_endpoints_return_200(path):
    assert client.get(path).status_code == 200


@pytest.mark.parametrize("path,body", POSTS)
def test_post_endpoints_return_200(path, body):
    assert client.post(path, json=body).status_code == 200


def test_health_is_ok():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_create_subject_echoes_body():
    got = client.post("/api/subjects", json={"name": "Maths", "kind": "PERFORMANCE"}).json()
    assert got["name"] == "Maths" and got["kind"] == "PERFORMANCE"


def test_bad_enum_is_rejected():
    assert client.post("/api/subjects", json={"name": "x", "kind": "NOPE"}).status_code == 422


def test_probe_returns_five_items():
    assert len(client.post("/api/sessions/1/finish").json()["probe_items"]) == 5


CONTRACT_PATHS = {
    "/api/health",
    "/api/subjects",
    "/api/subjects/{subject_id}/material",
    "/api/subjects/{subject_id}/state",
    "/api/subjects/{subject_id}/insights",
    "/api/subjects/{subject_id}/reflections",
    "/api/sessions",
    "/api/sessions/{session_id}/next-item",
    "/api/sessions/{session_id}/answer",
    "/api/sessions/{session_id}/events",
    "/api/sessions/{session_id}/feynman-transcript",
    "/api/sessions/{session_id}/finish",
    "/api/sessions/{session_id}/probe",
    "/api/voice/signed-url",
    "/api/agent/reflect",
    "/api/dev/seed",
    "/api/dev/advance-days",
    "/api/dev/reset",
    "/api/dev/usage",
}


def test_openapi_matches_contract_paths():
    assert set(client.get("/openapi.json").json()["paths"]) == CONTRACT_PATHS
