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


def _story(client, persona):
    sid = client.post("/api/dev/seed", json={"persona": persona}).json()["subject_ids"][0]
    refs = sorted(client.get(f"/api/subjects/{sid}/reflections").json(), key=lambda r: r["ts"])
    return sid, refs


def test_recalibrations_come_every_7_to_9_days(client):
    from datetime import datetime
    from itertools import pairwise
    _, refs = _story(client, "steady")
    days = [datetime.fromisoformat(r["ts"]) for r in refs]
    assert len(refs) == 5 and all(7 <= (b - a).days <= 9 for a, b in pairwise(days))
    assert all(r["explanation"].startswith(flow.DEMO_LABEL) for r in refs)


def test_breakthrough_student_improves_after_each_recalibration(client):
    sid, refs = _story(client, "breakthrough")
    means = [r["evidence"]["mean_probe"] for r in refs]
    assert means == sorted(means) and means[-1] - means[0] > 0.3
    assert [r["diagnosis"] for r in refs][:-1] == ["PLATEAU"] * 4 and refs[-1]["diagnosis"] == "MASTERED"
    insights = client.get(f"/api/subjects/{sid}/insights").json()
    kinds = {e["kind"] for e in insights["timeline"]}
    assert {"SAMPLER_DONE", "RECALIBRATION", "TRIAL_START"} <= kinds


def test_steady_student_performs_about_the_same_each_time(client):
    _, refs = _story(client, "steady")
    means = [r["evidence"]["mean_probe"] for r in refs]
    assert max(means) - min(means) < 0.03


def test_bursts_student_alternates_fatigue_and_recovery(client):
    _, refs = _story(client, "bursts")
    assert [r["diagnosis"] for r in refs][:4] == ["FATIGUE", "ON_TRACK", "FATIGUE", "ON_TRACK"]
    assert refs[0]["decision"]["action"] == "SHORTEN_SESSIONS"


def test_advance_continues_the_same_student(client):
    sid, refs = _story(client, "breakthrough")
    out = client.post("/api/dev/advance-days", json={"days": 8}).json()
    assert len(out["reflections"]) == 1
    assert len(client.get(f"/api/subjects/{sid}/reflections").json()) == len(refs) + 1


def test_unknown_persona_is_rejected(client):
    assert client.post("/api/dev/seed", json={"persona": "nobody"}).status_code == 422
    assert [p["key"] for p in client.get("/api/dev/personas").json()] == ["steady", "breakthrough", "bursts"]


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


def test_pdf_material_is_read_with_ingest(client, monkeypatch):
    import base64
    monkeypatch.setattr(flow.ingest, "extract_text", lambda pdf: flow.DEMO_MATERIAL if pdf == b"%PDF-fake" else "")
    sid = client.post("/api/subjects", json={"name": "Data Structures", "kind": "PERFORMANCE"}).json()["id"]
    body = {"title": "notes.pdf", "pdf_base64": base64.b64encode(b"%PDF-fake").decode()}
    r = client.post(f"/api/subjects/{sid}/material", json=body)
    assert r.status_code == 200 and r.json()["chunk_count"] == 3


def test_unreadable_pdf_asks_to_paste(client):
    import base64
    import io

    from pypdf import PdfWriter
    buf = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.write(buf)
    sid = client.post("/api/subjects", json={"name": "Maths", "kind": "KNOWLEDGE"}).json()["id"]
    for payload in (base64.b64encode(buf.getvalue()).decode(), "not base64!!"):
        r = client.post(f"/api/subjects/{sid}/material", json={"pdf_base64": payload})
        assert r.status_code == 422 and "paste" in r.json()["detail"]


def test_insights_carry_active_minutes(client):
    client.post("/api/dev/seed")
    rows = client.get("/api/subjects/1/insights").json()["attention_by_session"]
    assert rows and all(r["active_minutes"] > 0 for r in rows)
