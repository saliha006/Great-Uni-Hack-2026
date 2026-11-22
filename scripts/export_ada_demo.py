"""Export the backend's seeded Ada walkthrough for the no-backend browser tour.

From backend, run: .venv/bin/python ../scripts/export_ada_demo.py
"""

import json
import sys
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, create_engine

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app import db, flow


def timestamped(view):
    result = view.model_dump()
    result["ts"] = datetime.fromisoformat(result["ts"]).replace(tzinfo=UTC).isoformat()
    return result


def snapshot(ses, subject_id, previous_sessions, previous_refs):
    rows = flow._completed(ses, subject_id)
    history = flow._history(rows)
    state = flow.subject_state(ses, subject_id)
    reflections = reversed(flow.reflections(ses, subject_id))
    sessions = [
        {
            "ts": row.ts.replace(tzinfo=UTC).isoformat(),
            "method": row.method,
            "probe_score": row.probe_score,
            "active_minutes": row.active_minutes,
            "drift_share": row.drift_share,
            "lapse_share": row.lapse_share,
            "felt": row.felt_rating,
        }
        for row in history[previous_sessions:]
    ]
    stats = {method: stat.model_dump() for method, stat in flow._stats(ses, subject_id).items()}
    return {
        "sessions": sessions,
        "sampler": {method: item.model_dump() for method, item in state.sampler.items()},
        "plan": state.plan.model_dump(),
        "stats": stats,
        "reflections": [timestamped(ref) for ref in reflections if ref.id > previous_refs],
        "timeline": [timestamped(entry) for entry in flow.insights(ses, subject_id).timeline],
    }


def main():
    db.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    flow.reset()
    with Session(db.engine) as ses:
        subject_id = flow.seed(ses, "ada")["subject_ids"][0]
        stages = []
        for week in range(3):
            if week:
                flow.advance_days(ses, 7)
            stages.append(snapshot(ses, subject_id, sum(len(s["sessions"]) for s in stages),
                                   sum(len(s["reflections"]) for s in stages)))
    target = ROOT / "frontend" / "src" / "api" / "ada-demo.json"
    target.write_text(json.dumps(stages, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
