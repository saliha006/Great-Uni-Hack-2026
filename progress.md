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
| 2026-11-07 14:52 | @yehor | @saliha | ⚠️ conflict | `SubjectCtx` has a new optional field `profiles: tuple[ProfileName, ...] = ()` (`3da2acd`); existing calls still work. Pass the user's profiles (e.g. `("short_blocks",)`) and `choose_plan` uses 10-min fixed blocks. Profiles are need-based, never diagnoses. Codex is adding `users.profiles_json` in Y-D | 2026-11-07 14:52 |
| 2026-11-07 14:50 | @yehor | @saliha | 📨 handoff request | Yehor will create/configure the Supabase project; he requests Saliha own all backend work, including Y-D DB tables + ingestion. Please acknowledge and update the briefs/PRD on context: they still assign Y-D to Yehor and specify SQLite. Supabase provisioning does not migrate the app; coordinate the database switch with the team before integration. | 2026-11-07 14:50 |
| 2026-11-07 14:47 | @yehor | @saliha | ⚠️ conflict | `methodfit` is real on `main` (`aa8e93f`). When you create a subject's `method_stats` rows, seed each with `engine.methodfit.prior_stats(method)` (literature priors, strength 4), not alpha=beta=1. Pass `random.Random()` as `rng`; pass `SubjectCtx.sampler_round` = sampler sessions done | 2026-11-07 14:47 |
| 2026-11-07 14:50 | @saliha | @yehor | 📨 waiting on | **New task Y-D (top of your brief):** DB tables (`backend/app/db.py`, PRD §10) + ingestion (`backend/app/ingest.py`) on your Codex stream, by ~15:20. Saliha's routes call them and keep serving fixtures until then. Say no if it slows Y1–Y2 and it goes back to her | 2026-11-07 14:50 |
| 2026-11-07 14:40 | @yehor | @saliha | ⚠️ conflict | Engine Y0 + Y0b on `main` (`5f85968`): `from engine.types import ...` and every §11 engine function is callable. Real so far: `session_reward`, `update_stats`, `confidence`. Placeholders: attention → FOCUSED/NONE, diagnose → ON_TRACK, reflect → templated, `choose_plan` → round-robin. Added `Event.score` (fill from the graded response; §8.3 error streak needs it) and `SubjectCtx.now` (engine never reads the clock; pass the dev-shifted now) | 2026-11-07 14:40 |
| 2026-11-07 14:38 | @yehor | @saliha | ⚠️ conflict | I pushed a fixture stub API to `main` at 14:35 (`backend/app/**`: all 16 §11 groups + `/api/health`, 25 tests) before I saw the role swap. It's your path now: keep it as your S0 or replace it. Run: `cd backend && uv venv --python 3.11 .venv && uv pip install -r requirements.txt && .venv/bin/uvicorn app.main:app --port 8000`. I also re-created branch `yehor-backend` by pushing; safe to delete | 2026-11-07 14:38 |
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
| Yehor | `yehorm14` | AI/ML engine + data (personas, DB tables, ingestion) + reflection agent | `yehor-ml-data` | `backend/engine/**`, `backend/tests/engine/**`, `backend/app/db.py`, `backend/app/ingest.py`, `backend/tests/app/test_db.py`, `backend/tests/app/test_ingest.py` | Supabase project setup; Y-D backend handoff requested to Saliha; Y1 done 14:46 |
| Maxym | `{{github}}` | Frontend + voice UI | `maxym-frontend` | `frontend/**` (except Yehor's Insights files) | M0: Vite app + ElevenLabs agent |

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
- **`main` (2026-11-07 14:40):** `.gitignore`, `progress.md`, `README.md` only; `context` holds the docs; role branches `sali-backend`, `maxym-frontend`, `yehor-ml-data` cut from `main` · **14:35: fixture stub API on `main`** (`backend/app`, 25 tests pass) · stub API: up (fixtures) · **14:39: engine types + stubs on `main`** (38 tests pass) · ElevenLabs key verified by the CLI, agent not created · deploy: local only (PRD §12)

---

## Log (newest first)

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
