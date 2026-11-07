import json
from types import SimpleNamespace

import httpx
import openai
import pytest
from app.llm import LLMError, LLMService

SCHEMA = {"type": "object", "properties": {"x": {"type": "integer"}}, "required": ["x"], "additionalProperties": False}
REQ = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")


def _resp(content, finish="stop"):
    return SimpleNamespace(
        choices=[SimpleNamespace(finish_reason=finish, message=SimpleNamespace(content=content))],
        usage=SimpleNamespace(prompt_tokens=10, completion_tokens=5),
    )


class FakeClient:
    def __init__(self, *outcomes):
        self.outcomes = list(outcomes)
        self.calls = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        out = self.outcomes.pop(0)
        if isinstance(out, Exception):
            raise out
        return out


def svc(tmp_path, *outcomes, **kw):
    kw.setdefault("models", {"fast": "m-fast", "smart": "m-smart"})
    return LLMService(cache_dir=tmp_path, client=FakeClient(*outcomes), **kw)


def test_cache_mode_calls_once_then_serves_from_disk(tmp_path):
    s = svc(tmp_path, _resp('{"x": 1}'))
    assert s.complete_json("sys", "u", SCHEMA, "fast") == {"x": 1}
    assert s.complete_json("sys", "u", SCHEMA, "fast") == {"x": 1}
    assert s.usage.live_calls == 1 and s.usage.cache_hits == 1
    assert s.usage.prompt_tokens == 10


def test_fixtures_mode_never_calls_and_raises_on_miss(tmp_path):
    s = svc(tmp_path, mode="fixtures")
    with pytest.raises(LLMError):
        s.complete_json("sys", "u", SCHEMA, "fast")
    assert s.client.calls == []


def test_fail_closed_blocks_live_calls_on_miss(tmp_path):
    s = svc(tmp_path, fail_closed=True)
    with pytest.raises(LLMError):
        s.complete_json("sys", "u", SCHEMA, "fast")


def test_missing_model_name_is_an_error_not_a_call(tmp_path):
    s = svc(tmp_path, models={})
    with pytest.raises(LLMError, match="OPENAI_MODEL_FAST"):
        s.complete_json("sys", "u", SCHEMA, "fast")


def test_truncated_response_is_an_error_and_not_cached(tmp_path):
    s = svc(tmp_path, _resp("", finish="length"), _resp('{"x": 2}'))
    with pytest.raises(LLMError, match="incomplete"):
        s.complete_json("sys", "u", SCHEMA, "fast")
    assert s.complete_json("sys", "u", SCHEMA, "fast") == {"x": 2}
    assert s.usage.failures == 1


def test_one_retry_on_timeout_then_gives_up(tmp_path):
    timeout = openai.APITimeoutError(request=REQ)
    assert svc(tmp_path, timeout, _resp('{"x": 3}')).complete_json("s", "u", SCHEMA, "fast") == {"x": 3}
    s = svc(tmp_path, timeout, timeout)
    with pytest.raises(LLMError, match="unavailable"):
        s.complete_json("s", "u2", SCHEMA, "fast")
    assert len(s.client.calls) == 2


def test_strict_schema_rejection_falls_back_to_plain_json(tmp_path):
    bad = openai.BadRequestError("bad schema", response=httpx.Response(400, request=REQ), body=None)
    s = svc(tmp_path, bad, _resp('{"x": 4}'))
    assert s.complete_json("sys", "u", SCHEMA, "smart") == {"x": 4}
    assert s.client.calls[1]["response_format"] == {"type": "json_object"}
    assert "Reply with JSON" in s.client.calls[1]["messages"][0]["content"]


def test_live_call_cap(tmp_path):
    s = svc(tmp_path, _resp('{"x": 1}'), max_live_calls=1)
    s.complete_json("s", "a", SCHEMA, "fast")
    with pytest.raises(LLMError, match="cap"):
        s.complete_json("s", "b", SCHEMA, "fast")


def test_non_object_json_is_rejected(tmp_path):
    with pytest.raises(LLMError):
        svc(tmp_path, _resp(json.dumps([1]))).complete_json("s", "u", SCHEMA, "fast")


def test_engine_adapter_turns_failures_into_empty_dict(tmp_path):
    engine_llm = svc(tmp_path, mode="fixtures").for_engine()
    assert engine_llm.complete_json("s", "u", SCHEMA, "smart") == {}
