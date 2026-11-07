# YEHOR — Builder file: Backend + Data + LLM/Voice Services

**Read `docs/PRD.md` and `AGENTS.md` first.** This file is your task list and agent setup.

## Mission
You own the backbone: the FastAPI app, the database, material ingestion, the **LLM service** (OpenAI, with spend guards), the **voice backend** (ElevenLabs signed URL + transcript grading), the session orchestration that calls Saliha's engine, and the seed/dev endpoints. You also own repo hygiene and the submission paperwork.

Your two deliverables that decide everything: **(1)** a **stub API with fixtures by 14:40** so Maxime and Saliha can integrate, **(2)** a session flow that runs end-to-end and survives the demo.

## Your agent setup

Claude Pro has tighter limits, so spend it where reasoning matters and put Codex on volume from the start.

| Tool | Role | Use it for |
|---|---|---|
| **Claude Pro** (main driver) | Stream A, main worktree | LLM service (cache/fixtures modes, batching, JSON schemas), session orchestration, engine integration, ElevenLabs endpoints |
| **Codex Plus** | Stream B, second worktree | Stub API + fixtures, CRUD endpoints, SQLModel tables, ingestion/chunking, seed/dev endpoints, tests, README, Insights page wiring |
| OpenAI / ElevenLabs / Firecrawl keys | Runtime only | The *app* uses them. Your coding agents don't need them except to test |

```bash
git worktree add ../attune-api -b yehor-backend-api   # Stream B (Codex): stub, CRUD, ingestion, seed, tests; merge into yehor-backend
# main checkout on yehor-backend = Stream A (Claude Pro): llm.py, sessions flow, voice, engine glue
```
**Bootstrap prompt (first message to any agent working for you):**
> Read `AGENTS.md`, `docs/PRD.md` (§9–§13, §18) and `docs/builders/YEHOR_BUILDER.md` fully. I'm Yehor. You work only in `backend/app/**`, `backend/tests/app/**`, `scripts/**`, root docs/`.env.example`, and `frontend/src/pages/Insights.tsx` + `frontend/src/components/insights/**`. Never edit `backend/engine/**` (Saliha) or other `frontend/**` (Maxime). Match PRD §11 field-for-field. Default `LLM_MODE=cache`. Reply in ≤5 lines: scope, interfaces, first task. Then start; commit after each task.

**Failover:** if Claude Pro nears its limit → "handoff" → agent appends to `docs/handoff/YEHOR.md` → Codex takes the main seat (and vice-versa).

**Before 14:15:** check Claude + Codex usage. Collect keys (OpenAI, ElevenLabs, optional Firecrawl) from Saliha; put them in a local `.env` only.

## Ownership
`backend/app/**`, `backend/tests/app/**`, `scripts/**`, `.env.example`, `README.md`, plus the Insights page files in the frontend. **Don't touch** `backend/engine/**` or the rest of `frontend/**`.

## ▶ Current tasks (in order)

**Y0 · 14:15–14:40 · Repo + stub API** *(Codex does most of this)*
- ~~Create the repo~~ *(done by Saliha 14:2x: `saliha006/Great-Uni-Hack-2026`; `main`, `context` (docs) and role branches `sali-engine`, `maxime-frontend`, `yehor-backend` exist; `.gitignore` covers `.env`, `*.db` and every `.md` except `progress.md`/`README.md`)*. Make sure **Maxime and every teammate are collaborators now** (don't leave it for 17:45). Code layout per PRD §9 on `yehor-backend`; `.env.example` per PRD §12 (names only, no values). Docs are not committed to code branches: they live on `context` (CLAUDE.md 📤).
- `backend/app`: FastAPI + SQLModel + SQLite, CORS for `http://localhost:5173`, Pydantic schemas **identical to PRD §11**, **all 16 endpoint groups returning hard-coded fixtures** (`app/fixtures.py`). `/openapi.json` live.
- `make dev` (or README one-liner) starts the API on :8000; `GET /api/dev/usage` placeholder.
- ✅ Accept: `curl` each endpoint returns schema-valid JSON; **Maxime can generate TS types from `/openapi.json` at 14:40.**
- Also now: `GET /api/voice/signed-url` (real: `GET https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=…` with `xi-api-key`; returns `{signed_url, context}`; the `context` can be fixture until Y2). Maxime needs it for M3.
- **🔔 14:45 Sync 1:** contract frozen.

**Y1 · 14:40–15:05 · DB + subjects + ingestion**
- Tables per PRD §10. `POST /subjects`, `GET /subjects`, `POST /subjects/{id}/material` (paste text or PDF via `pypdf`; **P1: `{url}` via Firecrawl** → markdown).
- Chunking: ~300 words per chunk, split on headings/paragraphs, **min 3 chunks** (split by length if needed); `difficulty_est` = cheap heuristic (avg sentence length + rare-word share). `key_points_json` filled by the LLM in Y2 (fast tier).
- ✅ Accept: pasting ~1,500 words yields ≥3 chunks; `GET /subjects` returns real data.

**Y2 · 15:05–15:35 · LLM service (the spend-critical piece)** *(Claude, main)*
- `app/llm.py` implementing the engine's `LLM` protocol: `complete_json(system, user, schema, tier)`. Models from `OPENAI_MODEL_FAST` / `OPENAI_MODEL_SMART` (pick current ones from the OpenAI dashboard; **don't hardcode**). Structured/JSON-schema output, `max_tokens` on every call, retries with backoff, timeouts.
- **Modes:** `LLM_MODE=live|cache|fixtures`. `cache` = disk cache keyed by `sha256(model+system+user+schema)`. `fixtures` = canned JSON. Log every call to `llm_usage` (purpose, model, tokens, cache_hit) + `GET /dev/usage`. Enforce `LLM_MAX_CALLS_PER_SESSION`.
- Functions: `generate_items(chunk, method, kind, n=8)` (**one call**, cached per chunk+method; items include `answer_key`, `rubric`, `expected_seconds`, `difficulty`); `generate_probe(chunk, kind)` (5 items: 3 MCQ + 2 short for KNOWLEDGE; problems for PERFORMANCE); `grade_batch(items, answers)` (**one call**, temp 0, rubric-based); `extract_key_points(chunk)`; `grade_feynman(chunk.key_points, turns)` → `{score, covered, gaps, feedback}`.
- `POST /sessions/{id}/feynman-transcript` wired to `grade_feynman`.
- **Pre-generate** items/probes/key points for the demo subject once and keep the cache (`scripts/warm_cache.py`).
- ✅ Accept: second identical run makes **0 live calls**; probe generation returns schema-valid items; `GET /dev/usage` shows totals.

**Y3 · 15:35–16:05 · Session flow + engine glue** *(Claude, main)*
- `POST /sessions`: load subject state → call `engine.choose_plan` (use Saliha's stubs until real ones land) → pick chunk → create session. `GET next-item`: serve from generated items (`phase=MAIN`), adjust difficulty from the last intervention. `POST answer`: MCQ deterministic; `ACTIVE_RECALL` uses `self_grade`; short answers get provisional score, graded in batch at `probe`.
- `POST events`: persist events → `engine.score_attention` + `recommend_intervention` → return `EventsResult`.
- `POST finish` → probe items; `POST probe`: `grade_batch` once → `probe_score`, `active_minutes`, `engine.session_reward` → `update_stats` → `update_baseline` → recompute `plan` and flip `phase` to `ADAPTIVE` after 3 sampler rounds → `engine.diagnose` (if plateau → `engine.reflect`) → return `SessionResult` (+ `reflection`).
- **🔔 15:50 Sync 2:** vertical slice (create subject → session → probe → state update) must work, even on stubs.
- ✅ Accept: three sampler rounds flip a subject to `ADAPTIVE`; events return a reading + intervention; `llm_usage` ≈ 2–3 calls per session.

**Y4 · 16:05–16:25 · Insights + reflections + dev endpoints**
- `GET /subjects/{id}/insights`, `GET /subjects/{id}/reflections`, `POST /agent/reflect`.
- `POST /dev/seed`: call `engine.simulate.make_persona("Ada", seed)` → insert as sessions/events with `is_seeded=true`. `POST /dev/advance-days {days}`: shift the "now" clock used by the app, trigger weekly reflection if ≥7 days crossed, and evaluate any trial. `POST /dev/reset`: wipe DB, re-seed subjects.
- ✅ Accept: seed → advance 14 days → a `PLATEAU`/`FATIGUE` reflection exists; reset restores a clean state in seconds.

**Y5 · 16:25–16:50 · Insights page + hardening**
- Build `frontend/src/pages/Insights.tsx` + `components/insights/*` against `GET /insights` + `/reflections` (Recharts: method comparison with CI bars, probe-over-time, attention stacked bars, timeline, readiness gauges, reflection cards). Start from Saliha's Lovable output if Maxime has copied it in; otherwise build directly. Use Maxime's layout components.
- Hardening: friendly error JSON, request logging, idempotent probe submit, DB init on start.
- ✅ Accept: Insights renders from seeded + live data without errors.

**Y6 · 16:50–17:00 · Repo hygiene**
- README: run in ≤5 commands, `.env.example`, architecture sketch, honest limits (seeded data, unvalidated readiness, non-medical). Scan git history for secrets. Confirm all teammates are collaborators.

**17:40–17:55 · Devpost** (with Saliha): project name, short write-up, demo video link, repo link, **every teammate added to the Devpost project**. Checklist: PRD §18.

## Interfaces
- **You provide:** PRD §11 API. **You consume:** `backend/engine/*` (Saliha), ElevenLabs, OpenAI, optional Firecrawl.
- Match field names exactly. If you must deviate, append to "Contract changes" in the PRD and tell Maxime + Saliha.

## Cut list (if behind)
Firecrawl URL ingestion → `/dev/usage` UI → Insights polish → delayed probe → PDF upload (paste only). **Never cut:** stub API at 14:40, LLM cache mode, session flow, `/dev/seed` + `advance-days`.

## Your demo-readiness checklist
- [ ] All endpoints schema-valid; OpenAPI served
- [ ] `LLM_MODE=cache` demo path makes ~0 live calls (cache pre-warmed)
- [ ] Seed → advance → reflection works; reset <5 s
- [ ] README runs on a fresh clone; no secrets in git
- [ ] Repo collaborators + Devpost members confirmed

## ✅ Done log
*(finished task → one line: ✅ id · what · `progress.md` stamp)*
