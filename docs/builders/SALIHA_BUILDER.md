# SALIHA — Builder file: Backend + DB + LLM/Voice Services

**Read `docs/PRD.md` and `AGENTS.md` first.** This file is your task list and agent setup.

## Mission
You own the backbone: the FastAPI app, the database, material ingestion, the **LLM service** (OpenAI, with spend guards), the **voice backend** (ElevenLabs signed URL + transcript grading), the session orchestration that calls Yehor's engine, and the seed/dev endpoints. You also own repo hygiene and the submission paperwork.

Your two deliverables that decide everything: **(1)** a **stub API with fixtures by 14:40** so Maxym and Yehor can integrate, **(2)** a session flow that runs end-to-end and survives the demo.

## Your agent setup

You have the most capacity, so you carry the backbone plus one parallel stream.

| Tool | Role | Use it for |
|---|---|---|
| **Claude Enterprise** (main driver) | Stream A, main worktree | LLM service (cache/fixtures modes, batching, JSON schemas), session orchestration, engine integration, ElevenLabs endpoints |
| **Codex Plus** | Stream B, second worktree | Stub API + fixtures, CRUD endpoints, SQLModel tables, ingestion/chunking, seed/dev endpoints, tests, README, Insights page wiring |
| **Claude Pro #2** | Reserve / failover | Take over when Enterprise or Codex hits a limit (write a handoff note first). Also use it late (after 16:30) for demo tuning or helping Maxym/Yehor |
| **Lovable Pro (100 credits)** | One-off async screen generator | Fire the prompts in S-L at ~14:20, go back to backend work while it builds; Maxym copies the files. Stop using it after ~14:50 |
| OpenAI / ElevenLabs / Firecrawl keys | Runtime only | The *app* reads them from `.env`. Your coding agents don't need them except to test |

**Run two streams, no more.** Worktrees:
```bash
git worktree add ../attune-api -b sali-backend-api   # Stream B (Codex): stub, CRUD, ingestion, seed, tests; merge into sali-backend
# main checkout on sali-backend = Stream A (Claude Enterprise): llm.py, sessions flow, voice, engine glue
```
**Bootstrap prompt (first message to any agent working for you):**
> Read `AGENTS.md`, `docs/PRD.md` (§9–§13, §18) and `docs/builders/SALIHA_BUILDER.md` fully. I'm Saliha. You work only in `backend/app/**`, `backend/tests/app/**`, `scripts/**`, `.env.example`, `README.md`, and `frontend/src/pages/Insights.tsx` + `frontend/src/components/insights/**`. Never edit `backend/engine/**`, `backend/app/db.py` or `backend/app/ingest.py` (Yehor) or other `frontend/**` (Maxym). Match PRD §11 field-for-field. Default `LLM_MODE=cache`. Reply in ≤5 lines: scope, interfaces, first task. Then start; commit after each task.

**Failover:** when an agent says it's near a limit → say "handoff" → it appends to `docs/handoff/SALIHA.md` → open the next tool with the bootstrap prompt. Don't wait for the limit to fully hit.

**Before 14:15:** check quota on Enterprise, Pro, and Codex. Keys are already in your local `.env`; send Yehor and Maxym the `.env` directly (never via git or chat).

## Ownership
`backend/app/**` (except Yehor's `backend/app/db.py` and `backend/app/ingest.py`), `backend/tests/app/**` (except his `test_db.py`, `test_ingest.py`), `scripts/**`, `.env.example`, `README.md`, plus the Insights page files in the frontend. **Don't touch** `backend/engine/**`, Yehor's two `app/` files, or the rest of `frontend/**`.

## ▶ Current tasks (in order)

**▶ Updated 2026-11-07 15:30: final design after the design review (all recommendations accepted by Saliha)**
Build in demo-beat order; fixtures/templates stay the safe default; live LLM only for short-answer grading, Feynman grading and reflection narration. Detail: `Research-Context/design-review/04-final.md` (local).
1. **S0 harden:** catch-all JSON 500 inside CORS, localhost origin regex, run with `--env-file ../.env`; `/voice/signed-url` real (8 s timeout, `502 voice_unavailable`, minted on Start, key never in the browser).
2. **S2a `app/llm.py`:** live/cache/fixtures, file cache outside the DB, usage counters, hard cap of 60 live calls, `max_retries=0` + one counted retry, strict JSON schema, empty or `incomplete` output = error, no "temp 0" claim. `for_engine()` returns `{}` on failure (engine falls back to its template). New dep: `openai` (pinned).
3. **S1 + S3 thin slice:** paste-only material (PDF/Firecrawl/Lovable cut), reject under 50 words. Demo subject reads the committed `app/demo_bank.json` (no spend). Probe = 3 MCQ + 2 short; MCQ exact; short answers 0/0.5/1 in one batched call with a heuristic fallback; probe idempotent (`UPDATE ... WHERE probe_score IS NULL`); reflection inside probe is template-only. Naive UTC everywhere.
4. **S2c/S2d Feynman:** score = covered key points / total, computed in code, quoting the student's sentence; client transcript trusted and disclosed; finish never 409s; typed fallback = one explanation turn.
5. **S3 events:** all session events to `score_attention`; engine exception → FOCUSED/NONE. Attention-burst script for the 0:55 beat.
6. **S4:** insights computed on read; clock = fixed demo epoch + offset (pinned on reset); seed Ada; advance-days runs one WEEKLY reflect + trial check; seeded labels prefixed `[Demo data]`.
7. **S5 Insights page:** waits on Maxym's frontend scaffold; Demo-data banner + early-read badge first.
8. **S6 README:** ≤5 run commands + honest limits (seeded data, LLM grading, privacy, non-medical).

**── Original plan (kept for reference; the block above wins where they differ) ──**

**S0 · 14:15–14:40 · Repo + stub API** *(Codex does most of this)*
- ~~Create the repo~~ *(done 14:25: `saliha006/Great-Uni-Hack-2026`; `main`, `context` (docs) and role branches `sali-backend`, `maxym-frontend`, `yehor-ml-data` exist; `.gitignore` covers `.env`, `*.db` and every `.md` except `progress.md`/`README.md`)*. Make sure **Maxym and every teammate are collaborators now** (don't leave it for 17:45). Code layout per PRD §9 on `sali-backend`; `.env.example` per PRD §12 (names only, no values). Docs are not committed to code branches: they live on `context` (CLAUDE.md 📤).
- `backend/app`: FastAPI + SQLModel + SQLite, CORS for `http://localhost:5173`, Pydantic schemas **identical to PRD §11**, **all 16 endpoint groups returning hard-coded fixtures** (`app/fixtures.py`). `/openapi.json` live.
- `make dev` (or README one-liner) starts the API on :8000; `GET /api/dev/usage` placeholder.
- ✅ Accept: `curl` each endpoint returns schema-valid JSON; **Maxym can generate TS types from `/openapi.json` at 14:40.**
- Also now: `GET /api/voice/signed-url` (real: `GET https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=…` with `xi-api-key`; returns `{signed_url, context}`; the `context` can be fixture until Y2). Maxym needs it for M3.
- **🔔 14:45 Sync 1:** contract frozen.

**S-L · 14:20 (5 min, async) · Lovable screens**
- Paste Prompt 1 and Prompt 2 below into Lovable. Let it generate while you work. At ~14:50 send Maxym the preview/repo link. He copies the components, so no two-way sync.
- Spend: aim ≤ ~40 credits; keep the rest for fixes. If output is poor at 14:50, drop it. Maxym builds by hand.

**S1 · 14:40–15:05 · Subject + material endpoints** *(DB tables + ingestion moved to Yehor 14:50; you wire them)*
- `POST /subjects`, `GET /subjects`, `POST /subjects/{id}/material` (paste text, PDF upload, P1 `{url}`): validate the request, call Yehor's `ingest` functions and `db` session helpers, return PRD §11 shapes. Until his land (~15:20), keep serving fixtures.
- `key_points_json` filled by the LLM in S2 (fast tier).
- ✅ Accept: pasting ~1,500 words yields ≥3 chunks via Yehor's `ingest`; `GET /subjects` returns real data.

**S2 · 15:05–15:35 · LLM service (the spend-critical piece)** *(Claude, main)*
- `app/llm.py` implementing the engine's `LLM` protocol: `complete_json(system, user, schema, tier)`. Models from `OPENAI_MODEL_FAST` / `OPENAI_MODEL_SMART` (pick current ones from the OpenAI dashboard; **don't hardcode**). Structured/JSON-schema output, `max_tokens` on every call, retries with backoff, timeouts.
- **Modes:** `LLM_MODE=live|cache|fixtures`. `cache` = disk cache keyed by `sha256(model+system+user+schema)`. `fixtures` = canned JSON. Log every call to `llm_usage` (purpose, model, tokens, cache_hit) + `GET /dev/usage`. Enforce `LLM_MAX_CALLS_PER_SESSION`.
- Functions: `generate_items(chunk, method, kind, n=8)` (**one call**, cached per chunk+method; items include `answer_key`, `rubric`, `expected_seconds`, `difficulty`); `generate_probe(chunk, kind)` (5 items: 3 MCQ + 2 short for KNOWLEDGE; problems for PERFORMANCE); `grade_batch(items, answers)` (**one call**, temp 0, rubric-based); `extract_key_points(chunk)`; `grade_feynman(chunk.key_points, turns)` → `{score, covered, gaps, feedback}`.
- `POST /sessions/{id}/feynman-transcript` wired to `grade_feynman`.
- **Pre-generate** items/probes/key points for the demo subject once and keep the cache (`scripts/warm_cache.py`).
- ✅ Accept: second identical run makes **0 live calls**; probe generation returns schema-valid items; `GET /dev/usage` shows totals.

**S3 · 15:35–16:05 · Session flow + engine glue** *(Claude, main)*
- `POST /sessions`: load subject state → call `engine.choose_plan` (use Yehor's stubs until real ones land) → pick chunk → create session. `GET next-item`: serve from generated items (`phase=MAIN`), adjust difficulty from the last intervention. `POST answer`: MCQ deterministic; `ACTIVE_RECALL` uses `self_grade`; short answers get provisional score, graded in batch at `probe`.
- `POST events`: persist events → `engine.score_attention` + `recommend_intervention` → return `EventsResult`.
- `POST finish` → probe items; `POST probe`: `grade_batch` once → `probe_score`, `active_minutes`, `engine.session_reward` → `update_stats` → `update_baseline` → recompute `plan` and flip `phase` to `ADAPTIVE` after 3 sampler rounds → `engine.diagnose` (if plateau → `engine.reflect`) → return `SessionResult` (+ `reflection`).
- **🔔 15:50 Sync 2:** vertical slice (create subject → session → probe → state update) must work, even on stubs.
- ✅ Accept: three sampler rounds flip a subject to `ADAPTIVE`; events return a reading + intervention; `llm_usage` ≈ 2–3 calls per session.

**S4 · 16:05–16:25 · Insights + reflections + dev endpoints**
- `GET /subjects/{id}/insights`, `GET /subjects/{id}/reflections`, `POST /agent/reflect`.
- `POST /dev/seed`: call `engine.simulate.make_persona("Ada", seed)` → insert as sessions/events with `is_seeded=true`. `POST /dev/advance-days {days}`: shift the "now" clock used by the app, trigger weekly reflection if ≥7 days crossed, and evaluate any trial. `POST /dev/reset`: wipe DB, re-seed subjects.
- ✅ Accept: seed → advance 14 days → a `PLATEAU`/`FATIGUE` reflection exists; reset restores a clean state in seconds.

**S5 · 16:25–16:50 · Insights page + hardening**
- Build `frontend/src/pages/Insights.tsx` + `components/insights/*` against `GET /insights` + `/reflections` (Recharts: method comparison with CI bars, probe-over-time, attention stacked bars, timeline, readiness gauges, reflection cards). Start from your Lovable output if Maxym has copied it in; otherwise build directly. Use Maxym's layout components.
- Hardening: friendly error JSON, request logging, idempotent probe submit, DB init on start.
- ✅ Accept: Insights renders from seeded + live data without errors.

**S6 · 16:50–17:00 · Repo hygiene**
- README: run in ≤5 commands, `.env.example`, architecture sketch, honest limits (seeded data, unvalidated readiness, non-medical). Scan git history for secrets. Confirm all teammates are collaborators.

**17:40–17:55 · Devpost** (with Yehor): project name, short write-up, demo video link, repo link, **every teammate added to the Devpost project**. Checklist: PRD §18.

## Lovable prompts (paste as-is)

**Prompt 1 — Onboarding + Home**
> Build a clean, calm study app UI in React + TypeScript + Tailwind + shadcn/ui, mobile-first, light and dark mode, using mocked data in `src/mock.ts` (no backend). Screens: (1) **Onboarding** wizard: step 1 "What are you studying?" — add subjects (name text input, a two-option toggle "Problem-solving / Knowledge", optional exam date); step 2 per-subject "Add your material" (textarea + file drop, show word count, warn under 900 words); step 3 "Quick calibration: 3 short rounds per subject (~6 min each) so I can learn what works for you" with a Start button. (2) **Home**: a card per subject showing name, a phase chip (Calibrating 1/3 · Adaptive), a one-line "Next: Active Recall · 15 min — why: Calibration round 1 of 3", a large primary "Start session" button, and a small readiness bar. Keep it uncluttered: the primary action must be obvious. Export each screen as its own component in `src/pages/`.

**Prompt 2 — Insights + Dev panel**
> Using the same stack and mocked data, add (1) an **Insights** page for one subject: a bar chart comparing three study methods (Active Recall, Practice Test, Feynman) with credible-interval error bars and an "Early read / Moderate / High" confidence badge; a line chart of probe score over time per method; a stacked bar per session showing focused/drifting/lapsed share; a timeline of events (Sampler done, Break, Recalibration, Trial start/end); a readiness card with two gauges (Performance, Understanding) and a confidence label; and a "Reflections" list of cards (diagnosis chip, plain-language explanation, decision). Use Recharts. (2) A hidden **/dev** page with buttons: Seed demo persona, Advance 7 days, Force reflection, Reset — plus a visible "Demo data" badge. Types for all mock data are in the block I paste next: *(paste the TypeScript block from PRD §11)*.

## Interfaces
- **You provide:** PRD §11 API. **You consume:** `backend/engine/*`, `backend/app/db.py` (SQLModel tables + `get_session`), `backend/app/ingest.py` (chunking) (all Yehor), ElevenLabs, OpenAI, optional Firecrawl.
- Match field names exactly. If you must deviate, append to "Contract changes" in the PRD and tell Maxym + Yehor.

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
- ✅ S0 · JSON 500s inside CORS, any localhost port, tables on startup · 15:40
- ✅ S1–S4 · real API on SQLite + engine, `app/llm.py`, demo bank, idempotent probe, Feynman coverage, dev story · 16:15
- ✂️ S-L · Lovable cut (past cutoff) · 15:30
