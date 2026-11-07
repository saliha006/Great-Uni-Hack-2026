"""Drive the 0:55 demo beat: steady answers, then a slow, erratic burst, against a running backend.

Usage: python scripts/attention_burst.py [SESSION_ID] [--api http://localhost:8000/api]
Without a session id it creates an Active Recall session on the first subject. Prints each attention reading so the
TUNE thresholds can be checked, and a replayable fallback exists if live drift won't show on camera.
"""
import argparse
from datetime import UTC, datetime, timedelta

import httpx

STEADY_MS = [45000] * 5
ERRATIC_MS = [150000, 20000, 160000, 15000, 170000, 140000]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("session_id", nargs="?", type=int)
    parser.add_argument("--api", default="http://localhost:8000/api")
    args = parser.parse_args()
    api = httpx.Client(base_url=args.api, timeout=10)
    sid = args.session_id
    if sid is None:
        subject = api.get("/subjects").raise_for_status().json()[0]["subject"]["id"]
        sid = api.post("/sessions", json={"subject_id": subject, "method": "ACTIVE_RECALL"}).raise_for_status().json()["id"]
    item = api.get(f"/sessions/{sid}/next-item").raise_for_status().json()
    ts = datetime.now(UTC)
    for i, ms in enumerate(STEADY_MS + ERRATIC_MS, 1):
        ts += timedelta(milliseconds=ms)
        event = {"type": "ITEM_ANSWERED", "ts": ts.isoformat(), "item_id": item.get("id"), "latency_ms": ms}
        out = api.post(f"/sessions/{sid}/events", json={"events": [event]}).raise_for_status().json()
        a, iv = out["attention"], out["intervention"]
        print(f"{i:2d} {ms / 1000:5.0f}s  {a['state']:9s} ratio={a['latency_ratio']} cv={a['latency_cv']}  "
              f"-> {iv['type']} {iv['message']}")


if __name__ == "__main__":
    main()
