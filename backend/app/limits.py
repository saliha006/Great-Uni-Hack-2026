"""Rate limits and per-user quotas, hand-rolled to avoid a dependency.

Every scope is unlimited unless `RL_<SCOPE>="<count>/<seconds>"` is set (e.g. `RL_VOICE=20/86400` is a daily voice
quota), so the default behaviour matches the PRD §11 contract. Each hit counts against the caller's IP and their user id;
the user id header is unauthenticated, so the IP key stops anyone dodging a limit by changing it.
In-process only: with several workers each one keeps its own counts (a shared store is post-hackathon).
"""
import math
import os
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

MAX_KEYS = 10_000  # past this, idle keys are dropped so many one-off IPs can't grow memory without bound


class Limiter:
    def __init__(self, clock=time.monotonic) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        self._clock = clock

    def hit(self, key: str, count: int, window: float) -> float | None:
        """Record one hit; return the seconds to wait if the key is already at its limit."""
        now = self._clock()
        with self._lock:
            if len(self._hits) > MAX_KEYS:
                for k in [k for k, q in self._hits.items() if not q or now - q[-1] >= window]:
                    del self._hits[k]
            q = self._hits[key]
            while q and now - q[0] >= window:
                q.popleft()
            if len(q) >= count:
                return window - (now - q[0])
            q.append(now)
            return None

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = Limiter()


def rule(scope: str) -> tuple[int, float] | None:
    spec = os.getenv(f"RL_{scope.upper()}")
    if not spec:
        return None
    count, seconds = spec.split("/")
    return int(count), float(seconds)


def limit(scope: str):
    """FastAPI dependency enforcing the `scope` limit for this request's IP and user."""

    def check(request: Request) -> None:
        found = rule(scope)
        if found is None:
            return
        count, window = found
        ip = request.client.host if request.client else "unknown"
        user = request.headers.get("x-user-id", "demo")
        for key in (f"{scope}:ip:{ip}", f"{scope}:user:{user}"):
            wait = limiter.hit(key, count, window)
            if wait is not None:
                raise HTTPException(429, "rate_limited", headers={"Retry-After": str(max(1, math.ceil(wait)))})

    return check
