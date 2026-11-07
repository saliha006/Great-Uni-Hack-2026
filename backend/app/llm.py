"""LLM service: the only place the backend talks to OpenAI.

Modes (LLM_MODE): `live` always calls; `cache` reads the disk cache and calls only on a miss; `fixtures` never calls
and raises on a miss, so callers fall back to their templates/heuristics. Every caller must handle LLMError.
"""
import hashlib
import json
import logging
import os
import threading
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

import openai
from engine.types import Tier

log = logging.getLogger("attune.llm")

DEFAULT_CACHE_DIR = Path(__file__).resolve().parent.parent / ".llm_cache"
MAX_LIVE_CALLS = 60  # hard ceiling per process; spend on the shared key is tracked
TIMEOUT_S = 20
TRANSIENT = (openai.APITimeoutError, openai.APIConnectionError, openai.RateLimitError, openai.InternalServerError)


class LLMError(Exception):
    pass


@dataclass
class Usage:
    calls: int = 0
    live_calls: int = 0
    cache_hits: int = 0
    failures: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0

    def as_dict(self) -> dict:
        return dict(self.__dict__)


@dataclass
class LLMService:
    mode: str = "cache"
    models: dict[str, str] = field(default_factory=dict)
    reasoning_effort: str | None = None
    fail_closed: bool = False
    cache_dir: Path = DEFAULT_CACHE_DIR
    max_live_calls: int = MAX_LIVE_CALLS
    client: object | None = None
    # Called once per answered request: (purpose, model, prompt_tokens, completion_tokens, cache_hit).
    sink: Callable[[str, str, int, int, bool], None] | None = None
    usage: Usage = field(default_factory=Usage)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    @classmethod
    def from_env(cls) -> "LLMService":
        return cls(
            mode=os.getenv("LLM_MODE", "cache"),
            models={"fast": os.getenv("OPENAI_MODEL_FAST", ""), "smart": os.getenv("OPENAI_MODEL_SMART", "")},
            reasoning_effort=os.getenv("OPENAI_REASONING_EFFORT") or None,
            fail_closed=os.getenv("LLM_FAIL_CLOSED") == "1",
        )

    def complete_json(self, system: str, user: str, schema: dict, tier: Tier, max_tokens: int = 1000,
                      purpose: str = "engine", effort: str | None = None) -> dict:
        model = self.models.get(tier) or ""
        key = hashlib.sha256(json.dumps([model, system, user, schema], sort_keys=True).encode()).hexdigest()
        with self._lock:
            self.usage.calls += 1
        cached = self._read(key)
        if cached is not None and self.mode != "live":
            with self._lock:
                self.usage.cache_hits += 1
            self._record(purpose, model, 0, 0, True)
            return cached
        if self.mode == "fixtures" or self.fail_closed:
            raise LLMError("cache miss and live calls are off")
        if not model:
            raise LLMError(f"OPENAI_MODEL_{tier.upper()} is not set")
        with self._lock:
            if self.usage.live_calls >= self.max_live_calls:
                raise LLMError("live call cap reached")
            self.usage.live_calls += 1
        try:
            result, prompt_tokens, completion_tokens = self._call_with_retry(model, system, user, schema, max_tokens,
                                                                         effort or self.reasoning_effort)
        except LLMError:
            with self._lock:
                self.usage.failures += 1
            raise
        self._write(key, result)
        self._record(purpose, model, prompt_tokens, completion_tokens, False)
        return result

    def _record(self, purpose: str, model: str, prompt_tokens: int, completion_tokens: int, cache_hit: bool) -> None:
        if self.sink is None:
            return
        try:
            self.sink(purpose, model, prompt_tokens, completion_tokens, cache_hit)
        except Exception:
            # Usage logging must never fail a student's request.
            log.exception("could not record LLM usage")

    def for_engine(self) -> "EngineLLM":
        return EngineLLM(self)

    def _call_with_retry(self, model: str, system: str, user: str, schema: dict, max_tokens: int,
                         effort: str | None) -> tuple[dict, int, int]:
        # The SDK's own retries are off (max_retries=0) so every attempt is counted here; one retry on transient errors.
        try:
            return self._call(model, system, user, schema, max_tokens, effort)
        except TRANSIENT as exc:
            log.warning("retrying after %s", type(exc).__name__)
        try:
            return self._call(model, system, user, schema, max_tokens, effort)
        except TRANSIENT as exc:
            raise LLMError(f"OpenAI unavailable: {type(exc).__name__}") from exc

    def _call(self, model: str, system: str, user: str, schema: dict, max_tokens: int,
              effort: str | None) -> tuple[dict, int, int]:
        if self.client is None:
            self.client = openai.OpenAI(max_retries=0, timeout=TIMEOUT_S)
        client = self.client
        # Reasoning tokens share max_completion_tokens with the answer, so the effort is always set explicitly.
        extra = {"reasoning_effort": effort} if effort else {}
        messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
        strict = {"type": "json_schema", "json_schema": {"name": "out", "schema": schema, "strict": True}}
        try:
            resp = client.chat.completions.create(model=model, messages=messages, response_format=strict,
                                                  max_completion_tokens=max_tokens, **extra)
        except openai.BadRequestError as exc:
            # Strict mode rejects schemas without additionalProperties=false / all-required; fall back loudly.
            log.warning("strict schema rejected (%s); retrying as plain JSON", exc.message)
            messages[0]["content"] = f"{system}\nReply with JSON matching this schema: {json.dumps(schema)}"
            try:
                resp = client.chat.completions.create(model=model, messages=messages,
                                                      response_format={"type": "json_object"},
                                                      max_completion_tokens=max_tokens, **extra)
            except openai.BadRequestError as exc2:
                raise LLMError(f"OpenAI rejected the request: {exc2.message}") from exc2
        choice = resp.choices[0]
        prompt_tokens = resp.usage.prompt_tokens if resp.usage else 0
        completion_tokens = resp.usage.completion_tokens if resp.usage else 0
        with self._lock:
            self.usage.prompt_tokens += prompt_tokens
            self.usage.completion_tokens += completion_tokens
        if getattr(choice.message, "refusal", None):
            raise LLMError("model refused the request")
        # Reasoning tokens count against max_completion_tokens: a "length" finish can be empty yet billed.
        if choice.finish_reason != "stop" or not choice.message.content:
            raise LLMError(f"incomplete response (finish_reason={choice.finish_reason})")
        try:
            data = json.loads(choice.message.content)
        except json.JSONDecodeError as exc:
            raise LLMError("response was not JSON") from exc
        if not isinstance(data, dict):
            raise LLMError("response was not a JSON object")
        return data, prompt_tokens, completion_tokens

    def _read(self, key: str) -> dict | None:
        path = self.cache_dir / f"{key}.json"
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    def _write(self, key: str, data: dict) -> None:
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        tmp = self.cache_dir / f"{key}.tmp"
        tmp.write_text(json.dumps(data), encoding="utf-8")
        tmp.replace(self.cache_dir / f"{key}.json")


@dataclass
class EngineLLM:
    """Adapter for the engine's LLM protocol: any failure becomes {} so the engine uses its template."""
    service: LLMService

    def complete_json(self, system: str, user: str, schema: dict, tier: Tier) -> dict:
        try:
            return self.service.complete_json(system, user, schema, tier, purpose="reflect", effort="low")
        except LLMError as exc:
            log.warning("engine LLM call failed: %s", exc)
            return {}


service = LLMService.from_env()
