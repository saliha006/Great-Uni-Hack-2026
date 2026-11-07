import importlib
from datetime import datetime

import pytest
from sqlalchemy import event, inspect
from sqlalchemy.dialects.postgresql import dialect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.schema import CreateTable
from sqlmodel import Session, select


@pytest.fixture
def db(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite://")
    return importlib.import_module("app.db")


@pytest.fixture
def database(db):
    bind = db.create_db_engine("sqlite://")

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
            planned_minutes=10, started_at=now, is_seeded=True,
        )
        session.add(study)
        session.commit()
        study_id = study.id
    with Session(database) as session:
        stored = session.get(db.SessionRow, study_id)
        assert stored.is_seeded is True
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


@pytest.mark.parametrize("scheme", ["postgres", "postgresql", "postgresql+psycopg"])
def test_postgres_urls_use_psycopg_and_tls_without_connecting(db, scheme):
    bind = db.create_db_engine(f"{scheme}://backend:p%40ss@localhost:5432/postgres")
    try:
        assert bind.dialect.driver == "psycopg"
        assert bind.url.password == "p@ss"
        assert bind.dialect.create_connect_args(bind.url)[1]["sslmode"] == "require"
    finally:
        bind.dispose()


def test_postgres_keeps_certificate_verification_settings(db):
    bind = db.create_db_engine("postgresql://localhost/postgres?sslmode=verify-full&sslrootcert=/tmp/test-ca.crt")
    try:
        assert bind.url.query["sslmode"] == "verify-full"
        assert bind.url.query["sslrootcert"] == "/tmp/test-ca.crt"
    finally:
        bind.dispose()


def test_missing_database_url_does_not_fall_back_to_sqlite(db):
    with pytest.raises(RuntimeError, match="Set DATABASE_URL"):
        db.create_db_engine(None)


def test_table_definitions_compile_for_postgres(db):
    for table in db.SQLModel.metadata.sorted_tables:
        assert f"CREATE TABLE {table.name}" in str(CreateTable(table).compile(dialect=dialect()))
