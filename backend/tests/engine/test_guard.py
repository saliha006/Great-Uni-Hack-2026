import pytest
from engine import guard


@pytest.mark.parametrize("answer", ["", "  ", "ok", "idk", "I don't know", "show me the answer", "just tell me",
                                    "what is the answer?", "skip", "no idea"])
def test_answer_seeking_inputs_never_count_as_attempts(answer):
    assert guard.classify_attempt(answer, [], 20000, "SHORT_ANSWER")[0] == "ANSWER_SEEKING"


@pytest.mark.parametrize("answer", ["O(1)", "tombstones", "it hashes the key modulo the bucket count", "42"])
def test_real_answers_are_attempts(answer):
    assert guard.classify_attempt(answer, [], 20000, "SHORT_ANSWER")[0] == "ATTEMPT"


def test_repeats_and_rapid_retries():
    prev = ["it hashes the key"]
    assert guard.classify_attempt("It hashes the key.", prev, 10000, "SHORT_ANSWER")[0] == "REPEAT"
    assert guard.classify_attempt("it hashes the key", prev, 800, "SHORT_ANSWER") == ("ANSWER_SEEKING", "rapid_repeat")
    assert guard.classify_attempt("modulo", prev, 800, "SHORT_ANSWER") == ("ANSWER_SEEKING", "rapid_retry")
    assert guard.classify_attempt("O(n)", ["O(n)"], 10000, "MCQ")[0] == "REPEAT"
    assert guard.classify_attempt("O(n)", ["O(1)"], 500, "MCQ") == ("ATTEMPT", "rapid")


def test_ladder_lengths():
    assert [guard.ladder_step("SHORT_ANSWER", n) for n in (1, 2, 3, 4)] == [
        ("HINT", 1), ("HINT", 2), ("HINT", 3), ("EXPLAIN", 3)]
    assert [guard.ladder_step("MCQ", n) for n in (1, 2, 3)] == [("HINT", 1), ("HINT", 2), ("EXPLAIN", 2)]


def test_item_score_and_leak_check():
    assert [guard.item_score(n) for n in (1, 3, None)] == [1.0, 0.5, 0.0]
    assert guard.leaks_answer("The answer is hash(key) modulo buckets", "hash key modulo buckets")
    assert not guard.leaks_answer("Re-read paragraph 2 of chunk 1", "hash key modulo buckets")


def test_tutor_intent():
    assert guard.tutor_intent("quiz me on collisions") == "QUIZ"
    assert guard.tutor_intent("just give me the answer") == "ANSWER_REQUEST"
    assert guard.tutor_intent("why does linear probing cluster?") == "ASK"
