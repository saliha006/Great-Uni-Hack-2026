"""Attune API. Real routes by default; API_MODE=fixtures serves the PRD §11 fixtures (frontend work with no backend state)."""
import hmac
import logging
import os
import re
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session

from app import db, flow, guard_db, tutor
from app import fixtures as fx
from app import schemas as s
from app.limits import limit
from app.llm import service as llm

log = logging.getLogger("attune")
DB = Depends(db.get_session)
MAX_BODY_BYTES = 15_000_000  # largest legit body is a ~10 MB PDF sent base64 (schemas cap each field)
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
}
SECRET = re.compile(r"sk-[A-Za-z0-9_-]{8,}|sk_[A-Za-z0-9]{8,}")


def _redacting_factory(base):
    # Keys must never reach a log line, whichever library emits it.
    def make(*args, **kwargs):
        record = base(*args, **kwargs)
        message = record.getMessage()
        if SECRET.search(message):
            record.msg, record.args = SECRET.sub("[redacted]", message), ()
        return record
    return make


logging.setLogRecordFactory(_redacting_factory(logging.getLogRecordFactory()))
logging.getLogger("httpx").setLevel(logging.WARNING)


def _record_usage(purpose: str, model: str, prompt_tokens: int, completion_tokens: int, cache_hit: bool) -> None:
    with Session(db.engine) as ses:
        ses.add(db.LLMUsageRow(ts=flow.clock.now(), purpose=purpose, model=model or "none",
                               prompt_tokens=prompt_tokens, completion_tokens=completion_tokens, cache_hit=cache_hit))
        ses.commit()


llm.sink = _record_usage


def require_dev_token(x_dev_token: str | None = Header(default=None)) -> None:
    """Dev routes can reset the database: when DEV_TOKEN is set, callers must send it as X-Dev-Token."""
    expected = os.getenv("DEV_TOKEN")
    if expected and not hmac.compare_digest(x_dev_token or "", expected):
        raise HTTPException(403, "forbidden")


def _real_routes() -> APIRouter:
    api = APIRouter(prefix="/api", dependencies=[Depends(limit("global"))])

    @api.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    @api.post("/subjects", response_model=s.Subject)
    def create_subject(body: s.SubjectCreate, ses: Session = DB):
        return flow.create_subject(ses, body)

    @api.get("/subjects", response_model=list[s.SubjectSummary])
    def list_subjects(ses: Session = DB):
        return flow.list_subjects(ses)

    @api.post("/subjects/{subject_id}/material", response_model=s.MaterialResult, dependencies=[Depends(limit("material"))])
    def add_material(subject_id: int, body: s.MaterialBody, ses: Session = DB):
        return flow.add_material(ses, subject_id, body)

    @api.get("/subjects/{subject_id}/state", response_model=s.SubjectState)
    def subject_state(subject_id: int, ses: Session = DB):
        return flow.subject_state(ses, subject_id)

    @api.post("/sessions", response_model=s.Session, dependencies=[Depends(limit("session"))])
    def create_session(body: s.SessionCreate, ses: Session = DB):
        return flow.create_session(ses, body)

    @api.get("/sessions/{session_id}/next-item", response_model=s.NextItem)
    def next_item(session_id: int, ses: Session = DB):
        return flow.next_item(ses, session_id)

    @api.post("/sessions/{session_id}/answer", response_model=s.AnswerResult, dependencies=[Depends(limit("answer"))])
    def answer(session_id: int, body: s.AnswerBody, ses: Session = DB):
        return flow.answer(ses, session_id, body)

    @api.post("/sessions/{session_id}/events", response_model=s.EventsResult, dependencies=[Depends(limit("events"))])
    def events(session_id: int, body: s.EventsBody, ses: Session = DB):
        return flow.events(ses, session_id, body)

    @api.get("/voice/signed-url", response_model=s.SignedUrl, dependencies=[Depends(limit("voice"))])
    def voice_signed_url(session_id: int, ses: Session = DB):
        return flow.voice_signed_url(ses, session_id)

    @api.post("/sessions/{session_id}/feynman-transcript", response_model=s.FeynmanResult, dependencies=[Depends(limit("feynman"))])
    def feynman_transcript(session_id: int, body: s.FeynmanBody, ses: Session = DB):
        return flow.feynman_transcript(ses, session_id, body)

    @api.post("/sessions/{session_id}/finish", response_model=s.FinishResult)
    def finish(session_id: int, ses: Session = DB):
        return flow.finish(ses, session_id)

    @api.post("/sessions/{session_id}/probe", response_model=s.SessionResult, dependencies=[Depends(limit("probe"))])
    def probe(session_id: int, body: s.ProbeBody, ses: Session = DB):
        return flow.probe(ses, session_id, body)

    @api.get("/subjects/{subject_id}/insights", response_model=s.Insights)
    def insights(subject_id: int, ses: Session = DB):
        return flow.insights(ses, subject_id)

    @api.get("/subjects/{subject_id}/reflections", response_model=list[s.Reflection])
    def reflections(subject_id: int, ses: Session = DB):
        return flow.reflections(ses, subject_id)

    @api.post("/subjects/{subject_id}/ask", response_model=s.AskResult, dependencies=[Depends(limit("ask"))])
    def ask(subject_id: int, body: s.AskBody, ses: Session = DB):
        return tutor.ask(ses, subject_id, body)

    @api.post("/subjects/{subject_id}/study-set", response_model=s.StudySet, dependencies=[Depends(limit("ask"))])
    def study_set(subject_id: int, body: s.StudySetBody, ses: Session = DB):
        return tutor.study_set(ses, subject_id, body)

    @api.post("/subjects/{subject_id}/quiz-answer", response_model=s.AnswerResult,
              dependencies=[Depends(limit("answer"))])
    def quiz_answer(subject_id: int, body: s.QuizAnswerBody, ses: Session = DB):
        return tutor.quiz_answer(ses, subject_id, body)

    @api.post("/agent/reflect", response_model=s.Reflection, dependencies=[Depends(limit("reflect"))])
    def reflect(body: s.ReflectBody, ses: Session = DB):
        return flow.reflect(ses, body)

    return api


def _dev_routes() -> APIRouter:
    dev = APIRouter(prefix="/api/dev", dependencies=[Depends(require_dev_token), Depends(limit("dev"))])

    @dev.post("/seed")
    def dev_seed(body: s.SeedBody | None = None, ses: Session = DB) -> dict:
        return flow.seed(ses, body.persona if body else flow.DEFAULT_PERSONA)

    @dev.get("/personas")
    def dev_personas() -> list[dict]:
        return flow.persona_list()

    @dev.post("/advance-days", response_model=s.AdvanceDaysResult)
    def dev_advance_days(body: s.AdvanceDaysBody, ses: Session = DB):
        return flow.advance_days(ses, body.days)

    @dev.post("/reset")
    def dev_reset() -> dict:
        return flow.reset()

    @dev.get("/usage")
    def dev_usage() -> dict:
        return flow.usage()

    return dev


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
    guard_db.init(db.engine)
    yield


def create_app(mode: str = "real", env: str = "dev") -> FastAPI:
    """`env="prod"` drops the dev routes and the public schema/docs; ALLOWED_HOSTS turns on host checking."""
    prod = env == "prod"
    app = FastAPI(title="Attune API", lifespan=lifespan, openapi_url=None if prod else "/openapi.json")

    # Registered before CORS so it sits inside it: an unhandled error still gets CORS headers,
    # otherwise the browser reports a 500 as a CORS failure and hides the real cause.
    @app.middleware("http")
    async def guard(request: Request, call_next):
        size = request.headers.get("content-length")
        if size and size.isdigit() and int(size) > MAX_BODY_BYTES:
            return JSONResponse({"detail": "body_too_large"}, status_code=413, headers=SECURITY_HEADERS)
        try:
            response = await call_next(request)
        except Exception:
            log.exception("unhandled error on %s %s", request.method, request.url.path)
            response = JSONResponse({"detail": "internal_error"}, status_code=500)
        response.headers.update(SECURITY_HEADERS)
        return response

    app.add_middleware(
        CORSMiddleware,
        # CORS_ORIGINS adds exact origins, e.g. the hosted frontend talking to a backend on the presenter's laptop.
        allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()],
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Registered after CORS so it wraps the preflight CORS answers: Chrome asks before a public site (the hosted
    # frontend) may call localhost, and only proceeds when the backend opts in with this header.
    @app.middleware("http")
    async def private_network(request: Request, call_next):
        response = await call_next(request)
        if request.headers.get("access-control-request-private-network") == "true":
            response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response
    if hosts := os.getenv("ALLOWED_HOSTS"):
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=[h.strip() for h in hosts.split(",")])
    if mode == "fixtures":
        app.include_router(_fixture_routes())
    else:
        app.include_router(_real_routes())
        if not prod:
            app.include_router(_dev_routes())
    return app


app = create_app(os.getenv("API_MODE", "real"), os.getenv("ATTUNE_ENV", "dev"))
