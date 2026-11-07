"""Answer guardrails: tell real attempts from answer-seeking, and size the hint ladder. Pure functions, no I/O."""
import re
from typing import Literal

from engine.types import ItemKind

AttemptSignal = Literal["ATTEMPT", "ANSWER_SEEKING", "REPEAT"]
TutorIntent = Literal["QUIZ", "ANSWER_REQUEST", "ASK"]

RAPID_RETRY_MS = 1500  # TUNE: a retry faster than this with a tiny answer is clicking through, not thinking
RAPID_REPEAT_MS = 3000  # TUNE
REPEAT_JACCARD = 0.9
SEEKING = re.compile(
    r"\b(show|tell|give|reveal)\b.{0,12}\b(answer|solution)\b|\bwhat('?s| is) the (answer|solution)\b|\bidk\b|"
    r"\bi (don'?t|do not) know\b|\bdunno\b|\bno idea\b|\bjust tell me\b|\banswer please\b|^\s*(skip|help|pass)\s*[.!?]*$",
    re.IGNORECASE,
)
QUIZ = re.compile(r"\b(quiz|test) me\b|\b(give|ask) me (some )?(questions|a question)\b|\bpractice questions?\b", re.IGNORECASE)
ANSWER_REQUEST = re.compile(
    r"\b(what('?s| is) the answer|(give|show|tell) me the (answer|solution)|just (tell|give) me|solve (it|this) for me)\b",
    re.IGNORECASE,
)


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _jaccard(a: str, b: str) -> float:
    x, y = set(_tokens(a)), set(_tokens(b))
    return len(x & y) / len(x | y) if x | y else 1.0


def classify_attempt(answer: str, previous: list[str], latency_ms: int,
                     kind: ItemKind) -> tuple[AttemptSignal, str | None]:
    """Only an ATTEMPT moves the hint ladder; asking for the answer or resubmitting never does."""
    text = answer.strip()
    compact = re.sub(r"\s", "", text)
    # Count every visible character, so short real answers like "O(1)" pass while "ok" or "?" do not.
    if not compact or (len(compact) < 3 and not compact.isdigit()):
        return "ANSWER_SEEKING", "blank"
    if kind != "MCQ" and len(text.split()) <= 8 and SEEKING.search(text):
        return "ANSWER_SEEKING", "asked_for_answer"
    if previous:
        last = previous[-1]
        same = text.lower() == last.strip().lower() if kind == "MCQ" else (
            " ".join(_tokens(text)) == " ".join(_tokens(last)) or _jaccard(text, last) >= REPEAT_JACCARD)
        if same:
            return ("ANSWER_SEEKING", "rapid_repeat") if latency_ms < RAPID_REPEAT_MS else ("REPEAT", None)
        if kind != "MCQ" and latency_ms < RAPID_RETRY_MS and len(text.split()) <= 3:
            return "ANSWER_SEEKING", "rapid_retry"
    if kind == "MCQ" and latency_ms < RAPID_RETRY_MS:
        return "ATTEMPT", "rapid"  # still advances: eliminated options shrink the space, but easing can see it
    return "ATTEMPT", None


def ladder_hints(kind: ItemKind) -> int:
    """Hints before the explanation. MCQ stops at 2: a third elimination would leave only the answer."""
    return {"MCQ": 2, "SHORT_ANSWER": 3}.get(kind, 0)


def ladder_step(kind: ItemKind, wrong_attempts: int) -> tuple[Literal["HINT", "EXPLAIN"], int]:
    hints = ladder_hints(kind)
    if wrong_attempts > hints:
        return "EXPLAIN", hints
    return "HINT", wrong_attempts


def item_score(solved_on_attempt: int | None) -> float:
    """1.0 first try, 0.5 after hints, 0.0 never solved (TUNE)."""
    if solved_on_attempt is None:
        return 0.0
    return 1.0 if solved_on_attempt == 1 else 0.5


def leaks_answer(text: str, answer_key: str) -> bool:
    flat_text, flat_key = " ".join(_tokens(text)), " ".join(_tokens(answer_key))
    if flat_key and flat_key in flat_text:
        return True
    key_words = {w for w in _tokens(answer_key) if len(w) > 3}
    return bool(key_words) and len(key_words & set(_tokens(text))) / len(key_words) >= 0.8


def tutor_intent(text: str) -> TutorIntent:
    if QUIZ.search(text):
        return "QUIZ"
    if ANSWER_REQUEST.search(text):
        return "ANSWER_REQUEST"
    return "ASK"
