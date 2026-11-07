# Attune (Great Uni Hack 2026): progress log and conflict board

The team's shared history: who shipped what, when, on which branch, whose work it touches, and who is waiting on whom.
The plan itself is `CLAUDE.md`/`AGENTS.md`, `docs/PRD.md` and `docs/builders/`; this file is the history.

> **Template.** Fill `{{…}}` as the project's details arrive (self-filling rule, `CLAUDE.md`).

## How this file works (read once)
- **Newest first.** A new entry goes at the top of the Log. Stamps are `YYYY-MM-DD HH:MM` in event local time (the clock
  in PRD §17), so top to bottom is newest to oldest.
- **One entry per finished thing:** a feature, a fix, a deploy or infra change, a decision that changes someone's work, or
  a scope change. Not one per work-in-progress commit.
- **Write it in the same turn you push**, then commit and push `progress.md` to `main` straight away. The board is never behind.
- **Every ⚠️ conflict and 📨 need also gets a row on the Open board.** The row is removed once it's resolved, and the entry's
  Status line records who resolved it. Entries are history: never delete or reword someone else's, only annotate.
- **Merge conflict in this file?** Keep both sides, sorted newest first. Never drop an entry.
- **Volatile facts** (current commit, test counts, deploy status) live only in 📊 Latest.
- Agents: when to read and write this file is CLAUDE.md §2b; scope changes are §2c. Per-agent failover notes go in
  `docs/handoff/<NAME>.md`, not here.

**Entry format** (copy it to the top of the Log):
```
### <YYYY-MM-DD HH:MM> — <feat | fix | deploy | decision | scope | docs> — <what, in plain words> — @<builder>
- **Where:** `<branch>` @ `<short sha>` · merged to `main`: yes | not yet
- **Did:** <what changed and why, 1–3 lines; numbers if you measured something>
- **Touched:** <files / modules / endpoints / contracts / infra>
- **Brief task:** <task id in <NAME>_BUILDER.md> → ✅ done | 🟡 part | none
- **⚠️ Conflicts:** @<Name>: <what of theirs this changes or could break, and what they should do> | none
- **📨 Needs:** @<Name>: <what you need from them, and which of your tasks it blocks> | none
- **Agreed by:** @<Name>, @<Name> (decision and scope entries only)
- **Status:** open | resolved by @<Name> <YYYY-MM-DD HH:MM> (only when Conflicts or Needs isn't none)
```

---

## 📌 Open board (read on every prompt)
Everything still waiting on someone. Look for your name, or `@all`, under **To**.

| Since | From | To | Kind | What, and what to do | Entry |
|---|---|---|---|---|---|
| 2026-11-07 16:05 | @maxym | @saliha | ⚠️ conflict | Frontend scaffold is on `main` (`cd frontend && npm i && npm run dev`). Insights page: add `frontend/src/pages/Insights.tsx`, route `/insights/:subjectId` in `App.tsx`; reuse `Card`/`Chip`/`Meter`/`ButtonLink` (`components/ui.tsx`) + `PageShell`. `recharts` installed | 2026-11-07 16:05 |
| 2026-11-07 16:12 | @yehor | @saliha | ⚠️ conflict | **Demo fix on `main`:** with seed 1 the post-seed plan is an Active Recall exploration pick, so advance-days trialled *Practice Test* twice. Engine now diagnoses the method actually studied → advance 1: PLATEAU → Feynman trial; advance 2: trial adopted (+0.21) → MASTERED. Verified through the real API (reset → seed → advance 7 ×2). The narration prompt's `current_method` changed, so warm the LLM cache after this commit | 2026-11-07 16:12 |
| 2026-11-07 17:05 | @saliha | @yehor | 📨 waiting on | Please add `user_id: str | None = None` to `LLMUsageRow` in `db.py` (your Q3 task): the backend now writes a usage row per LLM call and per-user quotas need the column. No rush before the demo | 2026-11-07 17:05 |
| 2026-11-07 16:00 | @yehor | @saliha | ⚠️ conflict | I rewrote `README.md` (your path) at Yehor's request: badges, features table, "why it's different", quick start, demo steps (two `advance-days 7` calls: start then adopt the trial), architecture, team. Your scoring and honest-limits text is kept word for word (+1 line: thresholds are tuned guesses). Edit or revert anything you disagree with | 2026-11-07 16:00 |
| 2026-11-07 15:55 | @yehor | @saliha | 📨 for you | Video voice-over ("how it learns", ~20 s) and the honest-limits list for Devpost/README are in `docs/handoff/YEHOR.md` → "For the video + Devpost" on `context` (`2af3c2b`). Edit freely | 2026-11-07 15:55 |
| 2026-11-07 16:45 | @saliha | @all | 🔀 scope proposal | **Post-freeze proposals from research pass 2** are at the top of each brief, marked *Proposed*: backend security (dev routes gated, rate-limit scopes left unlimited, size limits), quote-grounded LLM output, answer-seeking detection with gradual easing and ramp-back, steadier method selection, ElevenLabs Sam settings. Reply yes/no per block. Items marked ⚖️ change the PRD §11 contract (hint event, 429s, dev token, field limits, leading-method field) and need all three of you. Nothing starts until you agree | 2026-11-07 16:45 |
| 2026-11-07 15:52 | @yehor | @saliha @maxym | ⚠️ conflict | Attention fix (`add9ff4`): `scripts/attention_burst.py` on the 45 s demo recall items now goes FOCUSED ×8 → **LAPSED at answer 9 → `BREAK`** (was answer 11). It skips DRIFTING/EASIER because the burst is ~3.5× expected; for an EASIER beat first, use a milder burst (~2× expected, e.g. 90 s answers). New for `reading_support`: `engine.readability.needs_simplification(text)` and `flesch_kincaid_grade(text)` (optional to wire) | 2026-11-07 15:52 |
| 2026-11-07 15:30 | @yehor | @saliha | ⚠️ conflict | For S4 (`dc7d0d9`): build `SubjectState.method_stats` with `engine.methodfit.stat_view(method, stats)` (mean + 90% interval); after seeding Ada set `method_stats` from `engine.methodfit.stats_from_history(sessions)` so stats match the rows; pin the demo epoch **after 2026-11-06 18:00** (Ada's last seeded session). Optional: `[tool.ruff] src = ["."]` in `backend/pyproject.toml` so ruff groups imports the same from any folder | 2026-11-07 15:30 |
| 2026-11-07 15:30 | @saliha | @maxym | 📨 waiting on | Contract notes for the frontend: MCQ `answer` = the option text; `finish` never fails (no transcript = 0 coverage); `/voice/signed-url` is minted on the Start click and returns `502 {detail:"voice_unavailable"}` → switch to typed Feynman (one explanation turn); `context.key_points` is a string list, join it for `dynamicVariables`. Also: push your Vite scaffold so the Insights page (my path) can go in, and say who installs `recharts` | 2026-11-07 15:30 |
| 2026-11-07 15:10 | @yehor | @all | ⚠️ conflict | **Supersedes the 14:50 Supabase/handoff row:** DB stays **SQLite** for the demo (PRD §12; Supabase is P2, later just a `DATABASE_URL`). **Y-D stays with Yehor** (Codex finishing `db.py`; `ingest.py` done). @saliha: no backend handoff needed; you consume `app/db.py` + `app/ingest.py` | 2026-11-07 15:10 |
| 2026-11-07 14:40 | @saliha | @yehor @maxym | ⚠️ conflict | **Roles swapped:** Saliha = backend (`sali-backend`), Yehor = AI/ML + data (`yehor-ml-data`), Maxym = frontend (`maxym-frontend`). Briefs and PRD updated on `context`; re-sync. @yehor: start Y0 `engine/types.py` (Saliha's stub API waits on it). Both: send @saliha your GitHub handle | 2026-11-07 14:40 |
| 2026-11-07 14:25 | @saliha | @all | ⚠️ conflict | **How docs work now:** every `.md` except `progress.md` and `README.md` lives on the `context` branch, never `main`. Clone, then `git fetch origin context && git archive origin/context \| tar -x && git rev-parse origin/context > .git/context-synced`. Your agent re-syncs per CLAUDE.md 🔄. Work on your role branch: `sali-backend` / `maxym-frontend` / `yehor-ml-data`. Keys: get the `.env` from @saliha directly, never via git or chat | 2026-11-07 14:25 |
| 2026-11-07 14:10 | @saliha | @all | ❓ question | PRD §19 open questions: hackathon tracks/sponsor rules, ElevenLabs quota, demo material, and who is doc owner (assumed @saliha) | 2026-11-07 14:10 |

**Kinds:** ⚠️ conflict (my change touches your work) · 📨 waiting on (I'm blocked until you do X) · 🔀 scope proposal (needs
the whole team's yes, CLAUDE.md §2c) · ❓ question for a teammate (project-wide unknowns go in PRD §19).

## 👥 Team
Full ownership and tasks live in each builder's brief (`docs/builders/<NAME>_BUILDER.md`). Update your own **Now** cell
whenever you log an entry.

| Who | GitHub | Role | Branch | Owns (paths) | Now |
|---|---|---|---|---|---|
| Saliha | `saliha006` | Backend API + LLM/voice services; repo, README, Devpost; doc owner (assumed) | `sali-backend` | `backend/app/**` (except Yehor's `db.py`, `ingest.py`), `backend/tests/app/**` (except his tests), `scripts/**`, `.env.example`, `README.md`, `frontend/src/pages/Insights.tsx`, `frontend/src/components/insights/**` | S0: stub API by 14:40 + collaborators |
| Yehor | `yehorm14` | AI/ML engine + data (personas, DB tables, ingestion) + reflection agent | `yehor-ml-data` | `backend/engine/**`, `backend/tests/engine/**`, `backend/app/db.py`, `backend/app/ingest.py`, `backend/tests/app/test_db.py`, `backend/tests/app/test_ingest.py` | Y5 tune + demo support; Y0–Y4 + Y-D done 15:15 |
| Maxym | `maksymkhomitskyi` | Frontend + voice UI | `maxym-frontend` | `frontend/**` (except Yehor's Insights files) | M1 done; M2 session runner next |

**Shared** (anyone may edit; flag it in ⚠️ Conflicts): `progress.md` (on `main`). Plan docs on the `context` branch
(`CLAUDE.md`/`AGENTS.md`, `docs/PRD.md`, `docs/builders/`): doc owner publishes (CLAUDE.md 📤); your own `docs/handoff/<NAME>.md`: you.

## 🚀 Start here (new teammate, first 15 minutes)
1. Clone `https://github.com/saliha006/Great-Uni-Hack-2026`. Set `git config user.email` to your GitHub email (commits are
   credited by author) and `git config team.builder <your-name>` (the agents and the Open board use it).
2. Pull the docs from `context` (they never live on `main`): `git fetch origin context && git archive origin/context | tar -x
   && git rev-parse origin/context > .git/context-synced`. Then `git switch <your role branch>`.
3. Put the `.env` @saliha sends you (directly, not via git or chat) at the repo root. Never commit it; never paste a key.
4. Paste your brief's **Bootstrap prompt** into your agent. It reads `AGENTS.md`/`CLAUDE.md`, the PRD sections it needs and
   your brief.
5. Read your brief's `▶ Current tasks`, then the 📌 Open board above.

## 📊 Latest (volatile facts live only here)
- **`main` (2026-11-07 16:25):** real backend (all §11 routes on SQLite + engine), 174 tests pass, `LLM_MODE=cache` default; OPENAI_MODEL_FAST/SMART still unset (live grading falls back to word overlap); Insights page waits on the frontend scaffold

---

## Log (newest first)

### 2026-11-07 16:05 — feat — Frontend scaffold, typed API client, Home and onboarding (M0, M1) — @maxym
- **Where:** `maxym-frontend` @ `a2c973a` · merged to `main`: yes (`fd8b913`)
- **Did:** Vite + React + TS + Tailwind v4 + TanStack Query + Recharts in `frontend/`. One typed client for PRD §11; `VITE_API_URL` empty → in-browser mock (demo content, sampler, attention heuristic), set → FastAPI. `npm run build` type-checks `types.ts` against `schema.d.ts` (generated from `/openapi.json`; caught two nullable fields). Home: subject cards, one-tap Start, "eat the frog first" card, status strip, resume card. Onboarding per PRD §7.1. `/insights/:subjectId` route shell. Tested against `main`'s real API (seed, subjects, start) and on the mock.
- **Touched:** `frontend/**`
- **Brief task:** M0 → 🟡 part (ElevenLabs agent not created) · M1 → ✅ done
- **⚠️ Conflicts:** @saliha: scaffold is on `main` for your Insights page: add `frontend/src/pages/Insights.tsx` and point the `/insights/:subjectId` route in `App.tsx` at it. Shared: `Card`, `Chip`, `Meter`, `Button`, `ButtonLink` (`components/ui.tsx`), `PageShell`. `recharts` is installed (me). No shadcn/ui: plain Tailwind tokens in `src/index.css`
- **📨 Needs:** none
- **Status:** open

### 2026-11-07 16:12 — fix — Demo reflection trialled the wrong method — @yehor
- **Where:** `yehor-ml-data` · merged to `main`: yes
- **Did:** Codex's threshold review found it; `debug` skill reproduced it through the API. Root cause: `diagnose`/`agent` used `plan.method`, which was a one-off exploration pick. Now the method with ≥3 sessions in the window. Ada's Feynman trial now rises clearly and caps at 0.9. 3 regression tests (×6 seeds) failed before, pass after; `no-slop` clean. 219 tests pass. Codex's other 12 findings: leave as is (edge cases off the demo path).
- **Touched:** `backend/engine/diagnose.py`, `agent.py`, `simulate.py`, `backend/tests/engine/test_simulate.py`
- **Brief task:** Y5 → 🟡 part
- **⚠️ Conflicts:** @saliha: narration prompt changed (re-warm cache); see the 16:12 row.
- **📨 Needs:** none
- **Status:** open

### 2026-11-07 17:05 — feat — API security: dev route gating, rate limits, size limits, headers, LLM usage log (P1) — @saliha
- **Where:** `sali-backend` @ `a51528f` · merged to `main`: yes
- **Did:** Hand-written limiter (`app/limits.py`, no dependency), per IP + per user, scopes for every costly route, all
  unlimited until `RL_<SCOPE>=count/seconds` is set. `ATTUNE_ENV=prod` drops `/api/dev/*` and `/openapi.json`;
  `DEV_TOKEN` gates dev routes; `ALLOWED_HOSTS` turns on host checks. 1 MB body cap, field size caps, `nosniff`/`no-store`
  headers, keys scrubbed from logs. Feynman credit needs a real quote from the student. Every LLM call logs a
  `llm_usage` row. Models set to `gpt-6-luna` / `gpt-6.1-terra`. 217 tests pass. README merge kept Yehor's new layout.
- **Touched:** `backend/app/{limits.py,main.py,schemas.py,llm.py,flow.py}`, `backend/tests/app/{test_security.py,test_llm.py}`, `.env.example`, `README.md`
- **Brief task:** P1 → ✅
- **⚠️ Conflicts:** @maxym: defaults change nothing, but if `DEV_TOKEN` is set send `X-Dev-Token`; handle 413/422 (oversized input), 429 (`Retry-After`) and 403 on dev routes when limits are switched on · @yehor: none of your files touched; your README rewrite is kept, security settings added as a collapsible block
- **📨 Needs:** @yehor: `user_id` column on `llm_usage` (17:05 row)
- **Status:** open

### 2026-11-07 16:00 — docs — README rewritten as a project overview — @yehor
- **Where:** `yehor-ml-data` · merged to `main`: yes
- **Did:** Features, comparison with typical study apps, quick start (verified: server starts, `/api/health` ok, `/docs` 200), 4-step demo (checked against `flow.advance_days`), mermaid flow, architecture, team. Saliha's scoring + limits sections kept.
- **Touched:** `README.md`
- **Brief task:** none (user request)
- **⚠️ Conflicts:** @saliha: README is your path; see the 16:00 board row.
- **📨 Needs:** none
- **Status:** open

### 2026-11-07 16:45 — scope — Post-freeze proposals from a second research pass — @saliha
- **Where:** `context` (all three briefs, *Proposed* blocks) · merged to `main`: yes (`progress.md`)
- **Did:** Four research passes (LLM models + voice, method selection, adaptive attention, backend security), ledgers in
  Saliha's local research doc. Proposals per owner, pre-demo vs post-hackathon. New rule from Saliha: the LLM only
  summarises/explains/generates/grades from given text and quotes its source for every claim.
- **Touched:** `docs/builders/{SALIHA,YEHOR,MAXYM}_BUILDER.md`
- **Brief task:** none (proposals)
- **⚠️ Conflicts:** @yehor @maxym: new *Proposed* block at the top of your brief; your current tasks are untouched
- **📨 Needs:** @yehor @maxym: yes/no on the 16:45 row
- **Agreed by:** @saliha (team pending)
- **Status:** open

### 2026-11-07 15:53 — feat — Sudden-drop (CUSUM) check in diagnosis — @yehor
- **Where:** `yehor-ml-data-yd` (Codex) → `yehor-ml-data` @ `13e5fe3` · merged to `main`: yes
- **Did:** PRD §8.4 CUSUM: a collapse over the last 3 sessions vs the earlier mean reads PLATEAU before the slope turns (slack 0.025, threshold 0.15, TUNE). Evidence gains `sudden_drop`; the templated reflection says "dropped suddenly" instead of "stayed flat". Codex wrote it (ran `no-slop`, `debug`); Claude's `no-slop` review fixed the reflection wording. Ada/Ben stories unchanged. 201 tests pass.
- **Touched:** `backend/engine/diagnose.py`, `backend/engine/agent.py`, `backend/tests/engine/**`
- **Brief task:** Y5 → 🟡 part
- **⚠️ Conflicts:** @saliha: reflection `evidence` has one new key, `sudden_drop` (bool); nothing to change unless you render evidence keys.
- **📨 Needs:** none

### 2026-11-07 15:52 — fix — Demo attention burst detected 2 answers sooner; readability helpers — @yehor
- **Where:** `yehor-ml-data` @ `2b3e5f6` · merged to `main`: yes
- **Did:** `debug` skill on Saliha's burst script replayed through the engine: MAD spread stayed 0 until 4 of 8 answers were erratic, so the burst only flipped at answer 11. Spread is now a trimmed CV (drop fastest + slowest): one slow answer still ignored, two noticed; burst → LAPSED/BREAK at answer 9. Two regression tests failed before, pass after. Added `engine/readability.py` (Flesch–Kincaid grade, `needs_simplification`); CEFR pre-teach not done (needs a licensed word list). `no-slop` on both. 192 tests pass.
- **Touched:** `backend/engine/attention.py`, `backend/engine/readability.py`, `backend/tests/engine/**`
- **Brief task:** Y5 → 🟡 part (CUSUM in progress with Codex)
- **⚠️ Conflicts:** @saliha @maxym: see the 15:52 board row (burst now ends in BREAK at answer 9).
- **📨 Needs:** none
- **Status:** open

### 2026-11-07 15:30 — fix — Engine quality pass, credible intervals, answers to Saliha's 15:30 asks — @yehor
- **Where:** `yehor-ml-data` · merged to `main`: yes
- **Did:** `no-slop` skill over all engine code (one posterior-mean/prior helper instead of 3 copies, one retention rule, no shallow wrappers, precise types, superseded stub tests dropped). `HIGH` confidence now needs non-overlapping 90% intervals (PRD §8.2); new `stat_view`, `stats_from_history`. Answers to @saliha 15:30: (1) narration prompt carries only diagnosis, decision, method and evidence numbers, no dates/ids; (2) `{}` from `complete_json` → template, covered by a test; (3) seeds 0–4 **and 7** all pass the Ada story, so `flow.py`'s seed 1 is fine; (4) prompts frozen from 16:30. Installed the new `openai` dep. 178 tests pass.
- **Touched:** `backend/engine/**`, `backend/tests/engine/**`
- **Brief task:** Y5 → 🟡 part
- **⚠️ Conflicts:** @saliha: see the 15:30 board row (stat_view, stats_from_history, demo epoch).
- **📨 Needs:** none
- **Status:** open (Saliha's 15:30 ask to @yehor resolved by @yehor 2026-11-07 15:30; row removed)

### 2026-11-07 16:25 — feat — README for the real API and an attention burst script (S6) — @saliha
- **Where:** `sali-backend` @ `18d914d` · merged to `main`: yes
- **Did:** README: run with `--env-file ../.env`, demo reset → seed → advance-days, how scoring works, honest limits
  (seeded data, early-read rankings, LLM marking, non-medical, privacy). `scripts/attention_burst.py` plays steady then
  erratic answers against a running server; smoke run: BREAK on answer 11; seed + advance 7 → PLATEAU → Feynman trial.
- **Touched:** `README.md`, `scripts/attention_burst.py`
- **Brief task:** S6 → ✅ (Devpost text after the freeze)
- **⚠️ Conflicts:** @maxym: demo steps for the frontend are in the README · @yehor: thresholds can be tuned with the burst script
- **📨 Needs:** @maxym: frontend scaffold on `main` so the Insights page (S5) can go in
- **Status:** open

### 2026-11-07 16:15 — feat — Real backend: sessions, grading, probe, attention, Feynman, insights and dev story (S1–S4) — @saliha
- **Where:** `sali-backend` @ `e52d3c8` · merged to `main`: yes
- **Did:** Every §11 route now runs on SQLite + Yehor's engine. `app/llm.py`: cache/fixtures/live, 60-call cap, one counted
  retry, truncated output = error. Demo subject "Data Structures: hash tables" reads the committed `app/demo_bank.json`
  (no LLM spend). Probe 3 MCQ + 2 short, idempotent; Feynman score = covered key points / total, quoting the student.
  `/dev/seed` → Ada (seed 1); `advance-days` 7 → PLATEAU → Feynman trial; 7 more → trial evaluated. `API_MODE=fixtures`
  keeps the old canned API. 174 tests pass.
- **Touched:** `backend/app/{flow.py,llm.py,main.py,demo_bank.json}`, `backend/tests/app/*`, `backend/requirements.txt` (`openai`)
- **Brief task:** S0 → ✅ · S1 → ✅ (paste only) · S2 → ✅ · S3 → ✅ · S4 → ✅ · S-L → cut
- **⚠️ Conflicts:** @maxym: the API is real now (empty DB until you POST subjects or `/dev/seed`); run with `API_MODE=fixtures` for canned data · @yehor: all your 14:38–15:15 integration notes are wired (priors, profiles, all events to `score_attention`, `minutes_to_first_drift`, reflect id, Ada seed 1); rows cleared
- **📨 Needs:** @yehor: run `pip install -r backend/requirements.txt` (new `openai` dep)
- **Status:** open

### 2026-11-07 15:40 — feat — API errors come back as JSON with CORS headers; tables created on startup (S0) — @saliha
- **Where:** `sali-backend` · merged to `main`: yes
- **Did:** Unhandled errors return `500 {"detail":"internal_error"}` inside CORS (before, the browser showed them as CORS
  failures). CORS allows any localhost port. `init_db()` runs on startup. 154 tests pass.
- **Touched:** `backend/app/main.py`, `backend/tests/app/test_main.py`
- **Brief task:** S0 → 🟡 part (voice signed URL next)
- **⚠️ Conflicts:** @maxym: error bodies are `{detail}`; any localhost port works now
- **📨 Needs:** none
- **Status:** open

### 2026-11-07 15:30 — decision — Backend design locked after a design review — @saliha
- **Where:** `context` (brief, PRD §0) · merged to `main`: yes (`progress.md`)
- **Did:** Five-agent review (design, research, two critics, refine). Build in demo-beat order on a committed question bank
  for the demo subject; live LLM only for grading + reflection narration; fixtures/templates are the fallback; PDF, Firecrawl
  and Lovable cut. No §11 contract change. Adds the `openai` SDK (pinned) as a backend dependency.
- **Touched:** `docs/builders/SALIHA_BUILDER.md`, PRD §0
- **Brief task:** S-L → cut · S1 → paste only
- **⚠️ Conflicts:** @maxym: see the 15:30 contract-notes row · @yehor: see the 15:30 row (prompts, `{}` fallback, Ada seed)
- **📨 Needs:** @maxym: frontend scaffold on `main` for the Insights page
- **Agreed by:** @saliha
- **Status:** open

### 2026-11-07 15:15 — feat — Engine complete (Y3, Y4) and DB + ingestion on main (Y-D) — @yehor
- **Where:** `yehor-ml-data` (+ Codex `yehor-ml-data-yd` @ `6f8aa65`) · merged to `main`: yes
- **Did:** `agent.reflect`: PRD §8.4 table decides, LLM only narrates; any bad/off-policy/medical-sounding reply falls back to a template. `predict_readiness`: recency-weighted (7-day half-life), shrunk by n/(n+3). Personas: Ada (FATIGUE → PLATEAU → Feynman trial adopted, checked on 5 seeds), Ben (ON_TRACK → MASTERED). Y-D by Codex: SQLite tables + ingestion. 150 tests pass.
- **Touched:** `backend/engine/**`, `backend/app/db.py`, `backend/app/ingest.py`, `backend/tests/**`, `backend/requirements.txt` (`pypdf`)
- **Brief task:** Y3 → ✅ done · Y4 → ✅ done · Y-D → ✅ done
- **⚠️ Conflicts:** @saliha: see the 15:15 board row (what to call, two extra columns, `reflect` id). Gap: PRD's CUSUM sudden-drop check and the CI-overlap rule for `HIGH` confidence aren't in yet (Y5).
- **📨 Needs:** none
- **Status:** open

### 2026-11-07 15:10 — decision — SQLite for the demo; Y-D stays with Yehor — @yehor
- **Where:** board only
- **Did:** Corrects the 14:50 entry. Database stays SQLite (PRD §12 stack); Supabase/Postgres remains P2 and needs only a different `DATABASE_URL` later, so no `psycopg` now. Y-D (`app/db.py`, `app/ingest.py`) stays Yehor's, done by Codex. Also on `main` since 15:06: `diagnose.py` (PRD §8.4 table, Theil–Sen slope, trial evaluation), 88 tests.
- **Touched:** `progress.md`
- **Brief task:** Y3 (diagnose half) → ✅ done
- **⚠️ Conflicts:** @saliha: ignore the 14:50 handoff request.
- **📨 Needs:** none
- **Agreed by:** @yehor
- **Status:** open

### 2026-11-07 15:06 — feat — Attention reading and interventions are real (Y2) — @yehor
- **Where:** `yehor-ml-data` @ `1938d25` · merged to `main`: yes
- **Did:** Window of 8 answers (min 5): median latency ratio and MAD-based spread, z-scored against the user's own baseline, two-window hysteresis; intervention table with 4-min cooldown (TUNE). Median/MAD so a single slow answer doesn't flip state (mean/SD did). Baseline learns from sessions with ≥5 answers. 73 tests pass.
- **Touched:** `backend/engine/attention.py`, `backend/engine/types.py` (`SessionSummary.minutes_to_first_drift`, optional), `backend/tests/engine/**`
- **Brief task:** Y2 → ✅ done
- **⚠️ Conflicts:** @saliha: see the 15:06 board row (pass all session events, keep `drifting_windows`, store `minutes_to_first_drift`). @maxym: to induce drift in the demo, answer ~5 items at normal speed then 3+ slowly (≥2× expected time), or switch tabs twice.
- **📨 Needs:** none
- **Status:** open

### 2026-11-07 14:50 — decision — Supabase setup and backend handoff requested — @yehor
- **Where:** `main` · documentation only
- **Did:** Yehor requested to handle Supabase project setup himself and have Saliha handle all backend work. Located the app checkout and verified that the connected Supabase account currently has no Attune project. Setup checklist: create the hosted project, invite Saliha, and share its URL/ref and backend database connection details privately.
- **Touched:** `progress.md`; requested ownership and database-plan changes
- **Brief task:** Y-D → handoff requested; not implemented here
- **⚠️ Conflicts:** @saliha: PRD/briefs still specify SQLite and assign `app/db.py` + `app/ingest.py` to Yehor. This request needs your acknowledgement and the team's database-plan coordination; no backend code, dependencies, schema or API contracts changed.
- **📨 Needs:** @saliha: acknowledge backend ownership and publish the matching context docs. @yehor: create the Supabase project and provide its URL/ref; passwords and connection strings stay out of git/chat.
- **Agreed by:** @yehor (requested setup split); Saliha/team acknowledgement pending
- **Status:** open

### 2026-11-07 14:47 — feat — Method choice is real: Thompson sampling over literature priors (Y1) — @yehor
- **Where:** `yehor-ml-data` @ `aa8e93f` · merged to `main`: yes
- **Did:** `engine/priors.py` holds Dunlosky's ten techniques (utility tiers; effect sizes/sources null until verified) and the need-based support profiles as constants (engine stays I/O-free). `choose_plan`: Latin-square sampler rotated per subject, Thompson sampling with a 15% exploration floor (TUNE), running trial keeps its method. 53 tests pass.
- **Touched:** `backend/engine/priors.py`, `backend/engine/methodfit.py`, `backend/tests/engine/**`
- **Brief task:** Y1 → ✅ done
- **⚠️ Conflicts:** @saliha: seed `method_stats` rows from `methodfit.prior_stats(method)`.
- **📨 Needs:** none
- **Agreed by:** @yehor (priors as Python constants, not JSON; role = data + AI/ML incl. Y-D DB + ingestion, matching @saliha's 14:50 brief change)
- **Status:** open

### 2026-11-07 14:50 — decision — DB tables + ingestion move to Yehor; Maxym creates the ElevenLabs agent — @saliha
- **Where:** `context` (briefs, PRD) · merged to `main`: yes (`progress.md`)
- **Did:** Saliha's S1 split: Yehor owns `backend/app/db.py` + `backend/app/ingest.py` (task Y-D, his Codex stream); Saliha
  keeps the subject/material endpoints and wires them. The ElevenLabs "Sam" agent stays with Maxym (M0). Also: this file's
  Log had every line doubled after the 14:40 merges; duplicates collapsed, no entry removed.
- **Touched:** `docs/builders/SALIHA_BUILDER.md`, `docs/builders/YEHOR_BUILDER.md`, PRD §0/§13, `CLAUDE.md`/`AGENTS.md`, `progress.md`
- **Brief task:** S1 → split
- **⚠️ Conflicts:** @yehor: `backend/app/db.py` and `backend/app/ingest.py` are now yours; the rest of `backend/app/` (incl. your 14:35 stub) is Saliha's
- **📨 Needs:** @yehor: Y-D by ~15:20
- **Agreed by:** @saliha (Yehor to confirm on the board)
- **Status:** open

### 2026-11-07 14:40 — feat — Engine types and correctly shaped stubs (Y0, Y0b) — @yehor
- **Where:** `yehor-ml-data` @ `5f85968` · merged to `main`: yes
- **Did:** `engine/types.py` mirrors the §11 models plus internals and the `LLM` protocol. Every engine function in §11 exists and returns typed data. Reward (§8.2) and the Beta update are real already. 38 tests pass (app + engine).
- **Touched:** `backend/engine/**`, `backend/tests/engine/**`
- **Brief task:** Y0 → ✅ done · Y0b → ✅ done
- **⚠️ Conflicts:** @saliha: two engine-internal fields you fill: `Event.score` (graded response score) and `SubjectCtx.now` (dev-shifted clock). Your `app/schemas.py` duplicates the §11 models in `engine/types.py`; importing from the engine would make it one source (your call).
- **📨 Needs:** none
- **Status:** open

### 2026-11-07 14:38 — feat — Fixture stub API on `main` (built before the role swap) — @yehor
- **Where:** `yehor-backend` @ `7794f3b` · merged to `main`: yes (`928b8c4`)
- **Did:** All PRD §11 endpoint groups return schema-valid fixtures; Pydantic models match §11 field-for-field; CORS for :5173; `/openapi.json` live; `/api/health` → ok. `.env.example` (names only) and README run steps. Built as old-brief Y0 at 14:29–14:35, before the 14:40 swap reached me.
- **Touched:** `backend/app/**`, `backend/tests/app/**`, `backend/requirements.txt`, `backend/pyproject.toml`, `.env.example`, `README.md`
- **Brief task:** Saliha's S0 → 🟡 part (stub done; collaborators still open)
- **⚠️ Conflicts:** @saliha: this is your path now; adopt or replace it. @maxym: types can be generated from `/openapi.json` now.
- **📨 Needs:** none
- **Status:** open

### 2026-11-07 14:40 — decision — Roles swapped: Saliha backend, Yehor AI/ML + data; front-end skills shared — @saliha
- **Where:** `context` + `main` · merged to `main`: yes (`progress.md`)
- **Did:** Saliha and Yehor swapped briefs (each keeps their own tool setup; Lovable stays with Saliha). Task IDs now
  follow the person: backend = S0–S6 + S-L, engine = Y0–Y5. Role branches renamed to `sali-backend`, `yehor-ml-data`.
  Front-end skills checked (no prompt injection, no network calls beyond localhost) and shared in `docs/skills-frontend/`.
- **Touched:** `docs/builders/*`, PRD §0/§9/§11/§13/§17/§19, `CLAUDE.md`/`AGENTS.md`, branches
- **Brief task:** none
- **⚠️ Conflicts:** @yehor @maxym: your brief changed; branch names changed (old `sali-engine`/`yehor-backend` deleted)
- **📨 Needs:** @yehor: does "data" mean you also take DB tables + ingestion (S1)? Today S1 is Saliha's
- **Agreed by:** @saliha (on behalf of the team, per chat)
- **Status:** open · *14:50: data question answered, see the 14:50 entry*

### 2026-11-07 14:25 — docs — Repo wired up: docs on `context`, role branches, keys in `.env` — @saliha
- **Where:** `main` + `context` · merged to `main`: yes (`.gitignore`, `progress.md`)
- **Did:** Context docs moved to a `context` branch that never merges to `main`; `.gitignore` blocks every `.md` except
  `progress.md`/`README.md`, plus `.env*` and `*.db`. Role branches `sali-engine`, `maxym-frontend`, `yehor-backend` cut from
  `main`. OpenAI and ElevenLabs keys sit only in Saliha's local `.env`; ElevenLabs CLI confirmed the key works.
- **Touched:** `.gitignore`, `progress.md`, `context` branch, `CLAUDE.md`/`AGENTS.md` (sync + publish rules), PRD §0, all briefs
- **Brief task:** Y0 (repo) → 🟡 part (collaborators + stub API still @yehor)
- **⚠️ Conflicts:** @maxym @yehor: work on your role branch; your worktree branch names in the briefs changed to `<role-branch>-<task>`
- **📨 Needs:** @yehor: collaborators, `.env.example`, GitHub handle · @maxym: GitHub handle
- **Status:** open

### 2026-11-07 14:10 — docs — Charter, board and briefs set up for Great Uni Hack — @saliha
- **Where:** local, then `context` (14:25) · merged to `main`: n/a (docs)
- **Did:** `CLAUDE.md` and `progress.md` reset from the OxHack templates and filled from the PRD; `AGENTS.md` is now an
  identical copy of `CLAUDE.md` (keeps its ownership, spend, honesty and handoff rules). PRD gained a §0 NOW block; PRD and
  briefs moved to `docs/` per PRD §9; briefs now route cross-area requests to this board.
- **Touched:** `CLAUDE.md`, `AGENTS.md`, `progress.md`, `docs/PRD.md`, `docs/builders/*`
- **Brief task:** none
- **⚠️ Conflicts:** @yehor @maxym: requests to another person now go on this Open board (📨 row), not `docs/handoff/REQUESTS.md`
- **📨 Needs:** @yehor: repo + collaborators (Y0)
- **Status:** open
