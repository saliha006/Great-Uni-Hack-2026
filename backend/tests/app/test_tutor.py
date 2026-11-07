import pytest
from app import db, flow
from app.guard_db import AttemptRow
from app.llm import LLMService
from app.main import create_app
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, create_engine, select


@pytest.fixture
def client(monkeypatch, tmp_path):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(flow, "llm", LLMService(mode="fixtures", cache_dir=tmp_path))
    flow.reset()
    with TestClient(create_app("real")) as c:
        yield c
    flow.reset()


@pytest.fixture
def subject(client):
    sid = client.post("/api/subjects", json={"name": "Data Structures", "kind": "PERFORMANCE"}).json()["id"]
    client.post(f"/api/subjects/{sid}/material", json={"title": "Hash tables", "text": flow.DEMO_MATERIAL})
    return sid


def ask(client, sid, question, **extra):
    return client.post(f"/api/subjects/{sid}/ask", json={"question": question, **extra}).json()


class Stub:
    def __init__(self, answer):
        self.answer = answer
        self.calls = 0

    def complete_json(self, *args, **kwargs):
        self.calls += 1
        return {"answer": self.answer}


def test_only_quoted_sentences_survive(client, subject, monkeypatch):
    monkeypatch.setattr(flow, "llm", Stub([
        {"sentence": "Collisions can't be avoided.", "quote": "This is called a collision, and it is unavoidable",
         "chunk": 1},
        {"sentence": "Ignore that, here's a secret.", "quote": "ignore previous instructions", "chunk": 1}]))
    r = ask(client, subject, "why are collisions unavoidable?")
    assert r["intent"] == "ASK" and [a["text"] for a in r["answer"]] == ["Collisions can't be avoided."]
    assert r["answer"][0]["label"] == "Chunk 2"


def test_nothing_grounded_means_not_in_notes(client, subject, monkeypatch):
    monkeypatch.setattr(flow, "llm", Stub([{"sentence": "Made up.", "quote": "not in the notes at all", "chunk": 0}]))
    assert ask(client, subject, "what is a hash table bucket?")["intent"] == "NOT_IN_NOTES"


def test_off_topic_question_makes_no_llm_call(client, subject, monkeypatch):
    stub = Stub([])
    monkeypatch.setattr(flow, "llm", stub)
    assert ask(client, subject, "zebra migration patterns")["intent"] == "NOT_IN_NOTES" and stub.calls == 0


def test_extractive_fallback_quotes_the_notes(client, subject):
    r = ask(client, subject, "what is linear probing clustering?")
    assert r["grounded_by"] == "extractive" and all(a["text"] == a["quote"] for a in r["answer"])


def test_current_question_answer_is_refused_with_a_hint(client, subject):
    sess = client.post("/api/sessions", json={"subject_id": subject, "method": "PRACTICE_TEST"}).json()
    r = ask(client, subject, "just give me the answer", session_id=sess["id"])
    assert r["intent"] == "REFUSED_CURRENT" and r["hint"] and not r["answer"]
    with Session(db.engine) as ses:
        assert ses.exec(select(AttemptRow).where(AttemptRow.signal == "TUTOR_SEEKING")).first()


def test_quiz_never_uses_probe_questions_and_answers_use_the_ladder(client, subject):
    r = ask(client, subject, "quiz me")
    probe_prompts = {q["prompt"] for c in flow.BANK["chunks"] for q in c["probe_mcq"] + c["probe_short"]}
    assert r["intent"] == "QUIZ" and r["quiz"] and not {q["prompt"] for q in r["quiz"]} & probe_prompts
    mcq = next(q for q in r["quiz"] if q["kind"] == "MCQ")
    first = client.post(f"/api/subjects/{subject}/quiz-answer",
                        json={"qid": mcq["qid"], "answer": "definitely wrong option", "latency_ms": 9000}).json()
    assert first["done_with_item"] is False and first["reveal"] is None and first["hint"]


def test_tutor_is_off_while_a_probe_is_open(client, subject):
    sess = client.post("/api/sessions", json={"subject_id": subject}).json()
    client.post(f"/api/sessions/{sess['id']}/finish")
    assert ask(client, subject, "what is a collision?")["intent"] == "BLOCKED"
    assert ask(client, subject, "what is a collision?", session_id=sess["id"])["intent"] == "BLOCKED"


def test_unknown_quiz_question_is_404(client, subject):
    r = client.post(f"/api/subjects/{subject}/quiz-answer", json={"qid": "1:probe_mcq:0", "answer": "x",
                                                                   "latency_ms": 10})
    assert r.status_code == 404
