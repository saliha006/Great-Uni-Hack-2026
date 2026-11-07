import importlib
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import pytest
from sqlalchemy import event, inspect
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, create_engine, select


@pytest.fixture
def db(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite://")
    return importlib.import_module("app.db")


@pytest.fixture
def database(db):
    bind = create_engine("sqlite://")

    @event.listens_for(bind, "connect")
    def enable_foreign_keys(connection, record):
        connection.execute("PRAGMA foreign_keys=ON")

    db.init_db(bind)
    yield bind
    bind.dispose()


def test_init_db_creates_all_tables_and_can_run_twice(db, database):
    db.init_db(database)
    assert set(inspect(database).get_table_names()) == {
        "users", "subjects", "materials", "chunks", "sessions", "items", "responses",
        "events", "method_stats", "attention_baselines", "plans", "reflections", "llm_usage",
    }


def test_seeded_session_and_profiles_survive_round_trip(db, database):
    now = datetime(2026, 11, 7, 15)
    with Session(database) as session:
        session.add(db.UserRow(id="demo", name="Sam", profiles_json='["short_blocks"]'))
        session.commit()
        subject = db.SubjectRow(user_id="demo", name="Maths", kind="PERFORMANCE")
        session.add(subject)
        session.commit()
        material = db.MaterialRow(subject_id=subject.id, source="paste")
        session.add(material)
        session.commit()
        chunk = db.ChunkRow(subject_id=subject.id, material_id=material.id, idx=0, text="Notes", difficulty_est=0.3)
        session.add(chunk)
        session.commit()
        study = db.SessionRow(
            subject_id=subject.id, chunk_id=chunk.id, method="ACTIVE_RECALL", mode="SAMPLER",
            planned_minutes=10, started_at=now, is_seeded=True, minutes_to_first_drift=12.5,
        )
        session.add(study)
        session.commit()
        study_id = study.id
    with Session(database) as session:
        stored = session.get(db.SessionRow, study_id)
        assert stored.is_seeded is True
        assert stored.minutes_to_first_drift == 12.5
        assert stored.started_at == now
        assert stored.probe_score is None
        assert session.get(db.SubjectRow, stored.subject_id).phase == "SAMPLING"
        assert session.get(db.UserRow, "demo").profiles_json == '["short_blocks"]'


def test_method_stats_reject_duplicate_composite_key(db, database):
    with Session(database) as session:
        session.add(db.UserRow(id="demo", name="Sam"))
        session.commit()
        subject = db.SubjectRow(user_id="demo", name="Maths", kind="PERFORMANCE")
        session.add(subject)
        session.commit()
        subject_id = subject.id
        values = {
            "subject_id": subject_id, "method": "ACTIVE_RECALL", "alpha": 2.0, "beta": 2.0,
            "last_updated": datetime.now(),
        }
        session.add(db.MethodStatRow(**values))
        session.commit()
        session.add(db.MethodStatRow(**values))
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()
        session.add(db.MethodStatRow(**(values | {"method": "FEYNMAN"})))
        session.commit()
        assert len(session.exec(select(db.MethodStatRow)).all()) == 2


def test_foreign_key_rejects_unknown_user(db, database):
    with Session(database) as session:
        session.add(db.SubjectRow(user_id="missing", name="Maths", kind="PERFORMANCE"))
        with pytest.raises(IntegrityError):
            session.commit()


def test_session_dependency_rolls_back_uncommitted_changes(db, database, monkeypatch):
    monkeypatch.setattr(db, "engine", database)
    dependency = db.get_session()
    session = next(dependency)
    session.add(db.UserRow(id="unsaved", name="Sam"))
    session.flush()
    dependency.close()
    with Session(database) as session:
        assert session.get(db.UserRow, "unsaved") is None


def test_import_without_database_url_uses_sqlite():
    environment = os.environ.copy()
    environment.pop("DATABASE_URL", None)
    subprocess.run(
        [sys.executable, "-c", "from app.db import engine; assert str(engine.url) == 'sqlite:///./attune.db'"],
        cwd=Path(__file__).resolve().parents[2],
        env=environment,
        check=True,
    )
