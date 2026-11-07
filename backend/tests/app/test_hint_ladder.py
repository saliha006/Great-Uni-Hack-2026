import pytest
from app import db, flow, guard
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


def _practice_session(client, method="PRACTICE_TEST"):
    sid = client.post("/api/subjects", json={"name": "Data Structures", "kind": "PERFORMANCE"}).json()["id"]
    client.post(f"/api/subjects/{sid}/material", json={"title": "Hash tables", "text": flow.DEMO_MATERIAL})
    return client.post("/api/sessions", json={"subject_id": sid, "method": method}).json()


def _item(client, sess, kind):
    while True:
        item = client.get(f"/api/sessions/{sess['id']}/next-item").json()
        if item.get("done") or item["kind"] == kind:
            return item
        client.post(f"/api/sessions/{sess['id']}/answer",
                    json={"item_id": item["id"], "answer": "skip it", "latency_ms": 5000})


def _answer(client, sess, item, text, guided=True, ms=20000, **extra):
    return client.post(f"/api/sessions/{sess['id']}/answer",
                       json={"item_id": item["id"], "answer": text, "latency_ms": ms, "guided": guided, **extra}).json()


def _key(item_id):
    with Session(db.engine) as ses:
        return ses.get(db.ItemRow, item_id).answer_key


def test_legacy_answers_still_reveal_at_once(client):
    sess = _practice_session(client)
    item = _item(client, sess, "MCQ")
    r = _answer(client, sess, item, "wrong", guided=False)
    assert r["reveal"] and r.get("done_with_item") is None


def test_mcq_ladder_two_hints_then_explanation(client):
    sess = _practice_session(client)
    item = _item(client, sess, "MCQ")
    wrong = [o for o in item["options"] if o != _key(item["id"])]
    first = _answer(client, sess, item, wrong[0])
    assert first["done_with_item"] is False and first["reveal"] is None and len(first["eliminated"]) == 1
    second = _answer(client, sess, item, wrong[1])
    assert second["reveal"] is None and len(second["eliminated"]) == 2 and second["hint_level"] == 2
    third = _answer(client, sess, item, wrong[2])
    assert third["done_with_item"] is True and third["reveal"] == _key(item["id"])
    assert third["explanation"] and wrong[0][:10] in third["why_wrong"]


def test_short_answer_three_hints_and_no_leaks(client):
    sess = _practice_session(client)
    item = _item(client, sess, "SHORT_ANSWER")
    key = _key(item["id"])
    results = [_answer(client, sess, item, f"my wrong guess number {n} about arrays") for n in range(4)]
    assert [r["hint_level"] for r in results[:3]] == [1, 2, 3]
    for r in results[:3]:
        assert r["reveal"] is None and key not in r["hint"]["text"] + (r["hint"]["quote"] or "")
    assert results[3]["done_with_item"] is True and results[3]["reveal"] == key and results[3]["quotes"]


def test_asking_for_the_answer_never_reveals_it(client):
    sess = _practice_session(client)
    item = _item(client, sess, "SHORT_ANSWER")
    key = _key(item["id"])
    replies = [_answer(client, sess, item, text) for text in
               ("show me the answer", "idk", "", "just tell me", "what is the answer")]
    assert all(r["signal"] == "ANSWER_SEEKING" and r["reveal"] is None and r["hint_level"] == 0 for r in replies)
    assert key not in str(replies)
    assert replies[1]["can_skip"] is True


def test_skip_gives_no_answer_and_ends_the_item(client):
    sess = _practice_session(client)
    item = _item(client, sess, "SHORT_ANSWER")
    assert _answer(client, sess, item, "idk")["can_skip"] is False
    _answer(client, sess, item, "no idea")
    r = _answer(client, sess, item, "", skip=True)
    assert r["done_with_item"] is True and r["reveal"] is None and r["score"] == 0
    assert client.get(f"/api/sessions/{sess['id']}/next-item").json().get("id") != item["id"]


def test_one_response_row_timed_by_first_attempt(client):
    sess = _practice_session(client)
    item = _item(client, sess, "MCQ")
    wrong = [o for o in item["options"] if o != _key(item["id"])]
    _answer(client, sess, item, wrong[0], ms=7000)
    _answer(client, sess, item, _key(item["id"]), ms=30000)
    with Session(db.engine) as ses:
        rows = ses.exec(select(db.ResponseRow).where(db.ResponseRow.item_id == item["id"])).all()
    assert len(rows) == 1 and rows[0].latency_ms == 7000 and rows[0].score == 0.5


def test_reload_restores_the_hint_card(client):
    sess = _practice_session(client)
    item = _item(client, sess, "SHORT_ANSWER")
    _answer(client, sess, item, "a wrong but real attempt here")
    again = client.get(f"/api/sessions/{sess['id']}/next-item").json()
    assert again["id"] == item["id"] and again["progress"]["hint_level"] == 1


def test_recall_blank_gets_a_cue_first_then_reveals(client):
    sess = _practice_session(client, "ACTIVE_RECALL")
    item = client.get(f"/api/sessions/{sess['id']}/next-item").json()
    first = _answer(client, sess, item, "")
    assert first["done_with_item"] is False and first["reveal"] is None and "Cue" in first["feedback"]
    second = _answer(client, sess, item, "")
    assert second["reveal"]


def test_explanation_keeps_only_quoted_sentences(monkeypatch):
    class Stub:
        def complete_json(self, *args, **kwargs):
            return {"explanation": [{"sentence": "Grounded.", "quote": "Separate chaining stores a small list"},
                                    {"sentence": "Invented.", "quote": "hash tables were invented in 1953"}],
                    "example": "Like a coat check with numbered hooks."}

    monkeypatch.setattr(flow, "llm", Stub())
    text, quotes, example = guard.explain(flow.BANK["chunks"][1]["text"], "q", "a small list per bucket")
    assert text == "Grounded." and len(quotes) == 1 and example


def test_explanation_template_when_llm_is_off(client):
    text, quotes, example = guard.explain(flow.BANK["chunks"][0]["text"], "What is the average lookup time?", "O(1)")
    assert "In your notes" in text and quotes and example is None


def test_answer_seeking_eases_the_next_items(client):
    sess = _practice_session(client)
    for _ in range(3):
        item = client.get(f"/api/sessions/{sess['id']}/next-item").json()
        if item.get("done"):
            break
        for text in ("idk", "show me the answer"):
            _answer(client, sess, item, text, ms=800)
        _answer(client, sess, item, "", skip=True)
    nxt = client.get(f"/api/sessions/{sess['id']}/next-item").json()
    assert nxt["adapt"]["state"] == "EASED" and "easier" in nxt["adapt"]["reason"]
    with Session(db.engine) as ses:
        assert ses.exec(select(AttemptRow)).first() is not None
