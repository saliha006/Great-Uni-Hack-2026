import pytest
from app import db, flow
from app.llm import LLMService
from app.main import create_app
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import create_engine


@pytest.fixture
def client(monkeypatch, tmp_path):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(flow, "llm", LLMService(mode="fixtures", cache_dir=tmp_path))
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    flow.reset()
    with TestClient(create_app("real")) as c:
        yield c
    flow.reset()


def _subject_with_demo_material(client) -> int:
    sid = client.post("/api/subjects", json={"name": "Data Structures", "kind": "PERFORMANCE"}).json()["id"]
    r = client.post(f"/api/subjects/{sid}/material", json={"title": "Hash tables", "text": flow.DEMO_MATERIAL})
    assert r.status_code == 200 and r.json()["chunk_count"] == 3
    return sid


def _run_session(client, subject_id: int, method: str | None = None) -> dict:
    sess = client.post("/api/sessions", json={"subject_id": subject_id, **({"method": method} if method else {})}).json()
    while (item := client.get(f"/api/sessions/{sess['id']}/next-item").json()).get("done") is not True:
        answer = item["options"][0] if item["kind"] == "MCQ" else "hash the key modulo the bucket count"
        r = client.post(f"/api/sessions/{sess['id']}/answer",
                        json={"item_id": item["id"], "answer": answer, "latency_ms": 9000, "self_grade": 1})
        assert r.status_code == 200
    probe_items = client.post(f"/api/sessions/{sess['id']}/finish").json()["probe_items"]
    assert len(probe_items) == 5
    answers = [{"item_id": p["id"], "answer": (p["options"] or ["x"])[0], "latency_ms": 5000} for p in probe_items]
    result = client.post(f"/api/sessions/{sess['id']}/probe", json={"answers": answers, "felt_rating": 4})
    assert result.status_code == 200
    return {"session": sess, "result": result.json(), "answers": answers}


def test_short_material_is_rejected(client):
    sid = client.post("/api/subjects", json={"name": "Maths", "kind": "KNOWLEDGE"}).json()["id"]
    r = client.post(f"/api/subjects/{sid}/material", json={"text": "too short"})
    assert r.status_code == 422


def test_unknown_subject_is_404(client):
    assert client.get("/api/subjects/999/state").status_code == 404


def test_sampler_runs_each_method_then_turns_adaptive(client):
    sid = _subject_with_demo_material(client)
    methods = set()
    for _ in range(3):
        out = _run_session(client, sid)
        methods.add(out["session"]["method"])
        assert out["session"]["mode"] == "SAMPLER"
    state = client.get(f"/api/subjects/{sid}/state").json()
    assert methods == {"ACTIVE_RECALL", "PRACTICE_TEST", "FEYNMAN"}
    assert state["subject"]["phase"] == "ADAPTIVE"
    assert all(entry["done"] for entry in state["sampler"].values())
    assert state["plan"]["mode"] == "ADAPTIVE"


def test_probe_is_idempotent(client):
    sid = _subject_with_demo_material(client)
    out = _run_session(client, sid)
    again = client.post(f"/api/sessions/{out['session']['id']}/probe",
                        json={"answers": out["answers"], "felt_rating": 4}).json()
    assert again["probe_score"] == out["result"]["probe_score"]
    state = client.get(f"/api/subjects/{sid}/state").json()
    assert sum(m["n"] for m in state["method_stats"]) == 1


def test_mcq_accepts_option_text_or_letter():
    opts = ["O(1)", "O(log n)", "O(n)", "O(n log n)"]
    assert flow.mcq_correct("O(1)", "O(1)", opts)
    assert flow.mcq_correct("a", "O(1)", opts)
    assert not flow.mcq_correct("B", "O(1)", opts)


def test_feynman_keyword_fallback_scores_covered_points(client):
    sid = _subject_with_demo_material(client)
    sess = client.post("/api/sessions", json={"subject_id": sid, "method": "FEYNMAN"}).json()
    chunk = flow.BANK["chunks"][sess["chunk_id"] - 1]  # chunk ids follow bank order in a fresh DB
    turns = [{"role": "user", "ts": "2026-11-07T15:00:00Z", "text": chunk["key_points"][0]},
             {"role": "agent", "ts": "2026-11-07T15:00:05Z", "text": "Why can't it be avoided?"}]
    r = client.post(f"/api/sessions/{sess['id']}/feynman-transcript", json={"turns": turns}).json()
    assert 0 < r["score"] < 1
    assert r["gaps"] and "covered" in r["feedback"]


def test_attention_burst_triggers_an_intervention(client):
    sid = _subject_with_demo_material(client)
    sess = client.post("/api/sessions", json={"subject_id": sid, "method": "ACTIVE_RECALL"}).json()
    item_id = client.get(f"/api/sessions/{sess['id']}/next-item").json()["id"]
    steady = [45000] * 5
    erratic = [150000, 20000, 160000, 15000, 170000, 140000]
    events, reading = [], None
    for i, ms in enumerate(steady + erratic):
        events.append({"type": "ITEM_ANSWERED", "ts": f"2026-11-07T15:{i:02d}:00Z", "item_id": item_id, "latency_ms": ms})
        reading = client.post(f"/api/sessions/{sess['id']}/events", json={"events": events[-1:]}).json()
    assert reading["attention"]["state"] in ("DRIFTING", "LAPSED")


def test_voice_without_keys_is_502_voice_unavailable(client):
    sid = _subject_with_demo_material(client)
    sess = client.post("/api/sessions", json={"subject_id": sid}).json()
    r = client.get("/api/voice/signed-url", params={"session_id": sess["id"]})
    assert r.status_code == 502 and r.json()["detail"] == "voice_unavailable"


def test_seed_then_advance_runs_the_plateau_story(client):
    sid = client.post("/api/dev/seed").json()["subject_ids"][0]
    first = client.post("/api/dev/advance-days", json={"days": 7}).json()
    assert [r["diagnosis"] for r in first["reflections"]] == ["PLATEAU"]
    assert first["reflections"][0]["explanation"].startswith(flow.DEMO_LABEL)
    assert client.get(f"/api/subjects/{sid}/state").json()["plan"]["mode"] == "TRIAL"
    client.post("/api/dev/advance-days", json={"days": 7})
    insights = client.get(f"/api/subjects/{sid}/insights").json()
    kinds = {e["kind"] for e in insights["timeline"]}
    assert {"SAMPLER_DONE", "RECALIBRATION", "TRIAL_START"} <= kinds
    assert insights["method_series"] and insights["attention_by_session"]
    assert len(client.get(f"/api/subjects/{sid}/reflections").json()) == 2


def test_reset_clears_everything(client):
    client.post("/api/dev/seed")
    client.post("/api/dev/reset")
    assert client.get("/api/subjects").json() == []


PASSAGE = ("A hash table stores key-value pairs so that looking up a key takes constant time on average. "
           "Two different keys can land in the same bucket, which is called a collision. "
           "Separate chaining stores a small list in each bucket. "
           "Open addressing probes other slots in a fixed sequence until it finds a free one.")


def _q(prompt, quote, **extra):
    return {"prompt": prompt, "answer": "a", "quote": quote, **extra}


def test_bank_keeps_only_items_quoted_from_the_passage():
    raw = {
        "key_points": [{"point": "Lookup is constant time on average.", "quote": "looking up a key takes constant time on average"},
                       {"point": "Hash tables were invented in 1953.", "quote": "invented by Hans Luhn in 1953"}],
        "recall": [_q("What is a collision?", "Two different keys can land in the same bucket"),
                   _q("Who invented it?", "NOT_IN_PASSAGE")],
        "mcq": [_q("Good", "Separate chaining stores a small list in each bucket",
                   options=["a", "b", "c", "d"]),
                _q("Key missing", "Separate chaining stores a small list in each bucket",
                   options=["b", "c", "d", "e"]),
                _q("Duplicate options", "Separate chaining stores a small list in each bucket",
                   options=["a", "a", "c", "d"])],
        "short": [], "probe_mcq": [], "probe_short": [],
    }
    bank = flow.ground_bank(raw, PASSAGE)
    assert "Hash tables were invented in 1953." not in bank["key_points"]
    assert bank["recall"][0]["prompt"] == "What is a collision?"
    assert all(q["prompt"] != "Who invented it?" for q in bank["recall"])
    assert [q["prompt"] for q in bank["mcq"]] == ["Good"]
    assert bank["probe_short"] and all(flow.quoted_in(q["answer"], PASSAGE) for q in bank["probe_short"])
    assert len(bank["key_points"]) >= 3


def test_bank_falls_back_to_the_passage_when_the_llm_is_down(client):
    bank = flow.chunk_bank(PASSAGE + " Deletion uses tombstones so lookups keep probing past removed entries.")
    assert bank["key_points"] and bank["probe_short"]
