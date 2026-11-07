"""Attune API. Real routes by default; API_MODE=fixtures serves the PRD §11 fixtures (frontend work with no backend state)."""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session

from app import db, flow
from app import fixtures as fx
from app import schemas as s

log = logging.getLogger("attune")
DB = Depends(db.get_session)


def _real_routes() -> APIRouter:
    api = APIRouter(prefix="/api")

    @api.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    @api.post("/subjects", response_model=s.Subject)
    def create_subject(body: s.SubjectCreate, ses: Session = DB):
        return flow.create_subject(ses, body)

    @api.get("/subjects", response_model=list[s.SubjectSummary])
    def list_subjects(ses: Session = DB):
        return flow.list_subjects(ses)

    @api.post("/subjects/{subject_id}/material", response_model=s.MaterialResult)
    def add_material(subject_id: int, body: s.MaterialBody, ses: Session = DB):
        return flow.add_material(ses, subject_id, body)

    @api.get("/subjects/{subject_id}/state", response_model=s.SubjectState)
    def subject_state(subject_id: int, ses: Session = DB):
        return flow.subject_state(ses, subject_id)

    @api.post("/sessions", response_model=s.Session)
    def create_session(body: s.SessionCreate, ses: Session = DB):
        return flow.create_session(ses, body)

    @api.get("/sessions/{session_id}/next-item", response_model=s.NextItem)
    def next_item(session_id: int, ses: Session = DB):
        return flow.next_item(ses, session_id)

    @api.post("/sessions/{session_id}/answer", response_model=s.AnswerResult)
    def answer(session_id: int, body: s.AnswerBody, ses: Session = DB):
        return flow.answer(ses, session_id, body)

    @api.post("/sessions/{session_id}/events", response_model=s.EventsResult)
    def events(session_id: int, body: s.EventsBody, ses: Session = DB):
        return flow.events(ses, session_id, body)

    @api.get("/voice/signed-url", response_model=s.SignedUrl)
    def voice_signed_url(session_id: int, ses: Session = DB):
        return flow.voice_signed_url(ses, session_id)

    @api.post("/sessions/{session_id}/feynman-transcript", response_model=s.FeynmanResult)
    def feynman_transcript(session_id: int, body: s.FeynmanBody, ses: Session = DB):
        return flow.feynman_transcript(ses, session_id, body)

    @api.post("/sessions/{session_id}/finish", response_model=s.FinishResult)
    def finish(session_id: int, ses: Session = DB):
        return flow.finish(ses, session_id)

    @api.post("/sessions/{session_id}/probe", response_model=s.SessionResult)
    def probe(session_id: int, body: s.ProbeBody, ses: Session = DB):
        return flow.probe(ses, session_id, body)

    @api.get("/subjects/{subject_id}/insights", response_model=s.Insights)
    def insights(subject_id: int, ses: Session = DB):
        return flow.insights(ses, subject_id)

    @api.get("/subjects/{subject_id}/reflections", response_model=list[s.Reflection])
    def reflections(subject_id: int, ses: Session = DB):
        return flow.reflections(ses, subject_id)

    @api.post("/agent/reflect", response_model=s.Reflection)
    def reflect(body: s.ReflectBody, ses: Session = DB):
        return flow.reflect(ses, body)

    @api.post("/dev/seed")
    def dev_seed(ses: Session = DB) -> dict:
        return flow.seed(ses)

    @api.post("/dev/advance-days", response_model=s.AdvanceDaysResult)
    def dev_advance_days(body: s.AdvanceDaysBody, ses: Session = DB):
        return flow.advance_days(ses, body.days)

    @api.post("/dev/reset")
    def dev_reset() -> dict:
        return flow.reset()

    @api.get("/dev/usage")
    def dev_usage() -> dict:
        return flow.usage()

    return api


def _fixture_routes() -> APIRouter:
    api = APIRouter(prefix="/api")

    @api.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    @api.post("/subjects", response_model=s.Subject)
    def create_subject(body: s.SubjectCreate):
        return fx.SUBJECT.model_copy(update=body.model_dump())

    @api.get("/subjects", response_model=list[s.SubjectSummary])
    def list_subjects():
        return [s.SubjectSummary(subject=fx.SUBJECT, plan=fx.PLAN, readiness=fx.READINESS)]

    @api.post("/subjects/{subject_id}/material", response_model=s.MaterialResult)
    def add_material(subject_id: int, body: s.MaterialBody):
        return s.MaterialResult(material_id=1, chunk_count=3)

    @api.get("/subjects/{subject_id}/state", response_model=s.SubjectState)
    def subject_state(subject_id: int):
        return fx.SUBJECT_STATE

    @api.post("/sessions", response_model=s.Session)
    def create_session(body: s.SessionCreate):
        return fx.SESSION.model_copy(update={"subject_id": body.subject_id, "method": body.method or fx.SESSION.method})

    @api.get("/sessions/{session_id}/next-item", response_model=s.NextItem)
    def next_item(session_id: int):
        return fx.ITEM

    @api.post("/sessions/{session_id}/answer", response_model=s.AnswerResult)
    def answer(session_id: int, body: s.AnswerBody):
        return fx.ANSWER_RESULT

    @api.post("/sessions/{session_id}/events", response_model=s.EventsResult)
    def events(session_id: int, body: s.EventsBody):
        return fx.EVENTS_RESULT

    @api.get("/voice/signed-url", response_model=s.SignedUrl)
    def voice_signed_url(session_id: int):
        return fx.SIGNED_URL

    @api.post("/sessions/{session_id}/feynman-transcript", response_model=s.FeynmanResult)
    def feynman_transcript(session_id: int, body: s.FeynmanBody):
        return fx.FEYNMAN_RESULT

    @api.post("/sessions/{session_id}/finish", response_model=s.FinishResult)
    def finish(session_id: int):
        return s.FinishResult(probe_items=fx.PROBE_ITEMS)

    @api.post("/sessions/{session_id}/probe", response_model=s.SessionResult)
    def probe(session_id: int, body: s.ProbeBody):
        return fx.SESSION_RESULT

    @api.get("/subjects/{subject_id}/insights", response_model=s.Insights)
    def insights(subject_id: int):
        return fx.INSIGHTS

    @api.get("/subjects/{subject_id}/reflections", response_model=list[s.Reflection])
    def reflections(subject_id: int):
        return [fx.REFLECTION]

    @api.post("/agent/reflect", response_model=s.Reflection)
    def reflect(body: s.ReflectBody):
        return fx.REFLECTION.model_copy(update={"trigger": body.trigger})

    @api.post("/dev/seed")
    def dev_seed() -> dict:
        return {"subject_ids": [fx.SUBJECT.id]}

    @api.post("/dev/advance-days", response_model=s.AdvanceDaysResult)
    def dev_advance_days(body: s.AdvanceDaysBody):
        return s.AdvanceDaysResult(advanced_to=fx.TS, reflections=[fx.REFLECTION])

    @api.post("/dev/reset")
    def dev_reset() -> dict:
        return {"ok": True}

    @api.get("/dev/usage")
    def dev_usage() -> dict:
        return {"calls": 0, "live_calls": 0, "cache_hits": 0, "prompt_tokens": 0, "completion_tokens": 0}

    return api


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


def create_app(mode: str = "real") -> FastAPI:
    app = FastAPI(title="Attune API", lifespan=lifespan)

    # Registered before CORS so it sits inside it: an unhandled error still gets CORS headers,
    # otherwise the browser reports a 500 as a CORS failure and hides the real cause.
    @app.middleware("http")
    async def json_errors(request: Request, call_next):
        try:
            return await call_next(request)
        except Exception:
            log.exception("unhandled error on %s %s", request.method, request.url.path)
            return JSONResponse({"detail": "internal_error"}, status_code=500)

    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(_fixture_routes() if mode == "fixtures" else _real_routes())
    return app


app = create_app(os.getenv("API_MODE", "real"))
