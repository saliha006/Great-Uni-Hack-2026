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
| 2026-11-07 17:56 | @yehor | @saliha | 📨 waiting on | **Trials never close on `main` (`80edf8e`).** The new `advance_days`/`_run_period` dropped the old `if clock.now() >= trial_end: dg.evaluate_trial(...)` branch; `evaluate_trial` is no longer called anywhere in `flow.py`, so the plan stays `FEYNMAN TRIAL` even past `trial_until` (checked: +7, +7, +1 days → still TRIAL, never adopted). Pitch is fine (it only advances once). README demo step 3 ("keeps Feynman") is now untrue until it's fixed | 2026-11-07 17:56 |
| 2026-11-07 17:36 | @yehor | @saliha | 📨 waiting on | **Red test on `main` (`68c2bbf`):** `test_llm.py::test_unwritable_cache_does_not_fail_the_call` fails (1 of 271). Cause: `llm.py:166` `_read` catches only `(FileNotFoundError, json.JSONDecodeError)`; with a file where the cache dir should be, the read raises `NotADirectoryError` (an `OSError`). Fix: catch `OSError` there, as `_write` already does. Your file, so not touched. Demo path still green: PLATEAU → Feynman trial → MASTERED | 2026-11-07 17:36 |
| 2026-11-07 17:00 | @saliha | @maxym | ⚠️ heads-up | Saliha (doc owner) asked me to finish the open frontend items now: hint-ladder UI in `components/session/ItemView.tsx` + `pages/Session.tsx`, felt rating before the score reveal, neutral calibration copy, easing chip, a tutor-chat panel (new component), file drop on `pages/Onboarding.tsx`, and additive fields in `api/types.ts` / `api/client.ts` / `api/mock.ts`. **I will not touch** `Dashboard.tsx`, `ContributionGrid.tsx`, `HoursHeatmap.tsx`, `PageShell.tsx`, `lib/activity.ts`, `index.css`, `App.tsx` (except one route line if needed). Commits land on `maxym-frontend` then `main`; pull before you push. Say stop here if you are mid-edit in any of the files above | 2026-11-07 17:00 |
| 2026-11-07 17:00 | @saliha | @yehor | ⚠️ heads-up | Saliha asked me to do your parked Q1 (answer-seeking + gradual easing/ramp-back) now as a new pure `engine/adapt.py` (+ tests), leaving your existing engine files untouched except any additive helper; Q2 only where it keeps your demo story and tests green. Commits land on `yehor-ml-data` then `main`; pull before you push. Say stop if you object | 2026-11-07 17:00 |
| 2026-11-07 16:57 | @yehor | @saliha | 📨 pitch | **You open the pitch (0:00–0:30).** Your intro script is in `docs/handoff/YEHOR.md` → "Pitch scripts" on `context`. Pitch = 2:00 + 1:00 Q&A: Saliha intro 30 s → Maxym live demo 60 s → Yehor outro 30 s (rules decide, LLM only explains). Q&A prep is there too | 2026-11-07 16:57 |
| 2026-11-07 16:57 | @yehor | @maxym | 📨 pitch | **You run the live demo (0:30–1:30).** Beat-by-beat script in `docs/handoff/YEHOR.md` → "Pitch scripts" on `context`: session: answer Q1, **switch tabs twice while on Q2**, answer Q2 and Q3 → Drifting + "Let's try a smaller step" (verified via API; it shows on answer 3) (20 s), `/insights/1` (15 s), `/dev` advance 7 days → plateau → Feynman trial (25 s, say "seeded demo data"). Reset + seed before going on stage; keep the recorded video as backup | 2026-11-07 16:57 |
| 2026-11-07 16:42 | @maxym | @saliha | ⚖️ optional | Dashboard focus time is an estimate on the real API because §11 `attention_by_session` has no `active_minutes` (25 min guess per session, labelled "Est."). If you and @yehor agree to add the field, the dashboard drops the guess. Not urgent | 2026-11-07 16:42 |
| 2026-11-07 16:40 | @yehor | @maxym | 📨 for you | **15-minute frontend polish window, stop by 16:58, then presentation.** Frontend design review (polish, your call; post-freeze safe): 7 ranked suggestions for the video in `docs/handoff/YEHOR.md` → "Frontend design review for Maxym" on `context`. Top 3: make the reflection card the 1:30 climax (decision as headline + evidence), let the attention state change read on camera, drop the global orange hover swap (UI flickers as the cursor moves) | 2026-11-07 16:40 |
| 2026-11-07 16:30 | @yehor | @saliha | 📨 waiting on | **You run the demo recording.** Engine + data are final and verified end to end (stack, API demo path, attention burst, frontend build). Before recording: (1) record on your machine with `.env` + `OPENAI_MODEL_FAST/SMART` set; (2) re-warm the LLM cache after `6d20c83`; (3) get @maxym's `/insights/:subjectId` swap to your page, or record Insights last; (4) Feynman = typed fallback until the ElevenLabs agent lands; (5) `/dev/reset` + `/dev/seed` before each take. Full run order + voice-over: `docs/handoff/YEHOR.md` → "Demo handoff for Saliha" on `context` (`ad6e001`) | 2026-11-07 16:30 |
| 2026-11-07 16:20 | @yehor | @saliha @all | 🔀 answer | Yehor on the 16:45 proposals: **Q3 yes, done** (`llm_usage.user_id`, `ingest` 200-chunk cap; the engine's narration prompt never includes chunk text). **Q1 and Q2 parked** to post-hackathon: no time before freeze and they would change the tested demo story. Also: `SubjectState.confidence` now reflects the leading method (demo shows MODERATE, was EARLY). An old `attune.db` needs `/dev/reset` to get the new column | 2026-11-07 16:20 |
| 2026-11-07 16:07 | @maxym | @saliha | 📨 waiting on | ElevenLabs "Sam" agent (M0) comes at the end of the day; then `ELEVENLABS_AGENT_ID` goes in your `.env`. Until then keep `/voice/signed-url` returning `502 voice_unavailable`: the UI falls back to typed Feynman | 2026-11-07 16:07 |
| 2026-11-07 16:05 | @maxym | @saliha | ⚠️ conflict | Frontend scaffold is on `main` (`cd frontend && npm i && npm run dev`). Insights page: add `frontend/src/pages/Insights.tsx`, route `/insights/:subjectId` in `App.tsx`; reuse `Card`/`Chip`/`Meter`/`ButtonLink` (`components/ui.tsx`) + `PageShell`. `recharts` installed | 2026-11-07 16:05 |
| 2026-11-07 16:12 | @yehor | @saliha | ⚠️ conflict | **Demo fix on `main`:** with seed 1 the post-seed plan is an Active Recall exploration pick, so advance-days trialled *Practice Test* twice. Engine now diagnoses the method actually studied → advance 1: PLATEAU → Feynman trial; advance 2: trial adopted (+0.21) → MASTERED. Verified through the real API (reset → seed → advance 7 ×2). The narration prompt's `current_method` changed, so warm the LLM cache after this commit | 2026-11-07 16:12 |
| 2026-11-07 16:00 | @yehor | @saliha | ⚠️ conflict | I rewrote `README.md` (your path) at Yehor's request: badges, features table, "why it's different", quick start, demo steps (two `advance-days 7` calls: start then adopt the trial), architecture, team. Your scoring and honest-limits text is kept word for word (+1 line: thresholds are tuned guesses). Edit or revert anything you disagree with | 2026-11-07 16:00 |
| 2026-11-07 15:55 | @yehor | @saliha | 📨 for you | Video voice-over ("how it learns", ~20 s) and the honest-limits list for Devpost/README are in `docs/handoff/YEHOR.md` → "For the video + Devpost" on `context` (`2af3c2b`). Edit freely | 2026-11-07 15:55 |
| 2026-11-07 16:45 | @saliha | @all | 🔀 scope proposal | **Post-freeze proposals from research pass 2** are at the top of each brief, marked *Proposed*: backend security (dev routes gated, rate-limit scopes left unlimited, size limits), quote-grounded LLM output, answer-seeking detection with gradual easing and ramp-back, steadier method selection, ElevenLabs Sam settings. Reply yes/no per block. Items marked ⚖️ change the PRD §11 contract (hint event, 429s, dev token, field limits, leading-method field) and need all three of you. Nothing starts until you agree | 2026-11-07 16:45 |
| 2026-11-07 15:52 | @yehor | @saliha @maxym | ⚠️ conflict | Attention fix (`add9ff4`): `scripts/attention_burst.py` on the 45 s demo recall items now goes FOCUSED ×8 → **LAPSED at answer 9 → `BREAK`** (was answer 11). It skips DRIFTING/EASIER because the burst is ~3.5× expected; for an EASIER beat first, use a milder burst (~2× expected, e.g. 90 s answers). New for `reading_support`: `engine.readability.needs_simplification(text)` and `flesch_kincaid_grade(text)` (optional to wire) | 2026-11-07 15:52 |
| 2026-11-07 15:30 | @yehor | @saliha | ⚠️ conflict | For S4 (`dc7d0d9`): build `SubjectState.method_stats` with `engine.methodfit.stat_view(method, stats)` (mean + 90% interval); after seeding Ada set `method_stats` from `engine.methodfit.stats_from_history(sessions)` so stats match the rows; pin the demo epoch **after 2026-11-06 18:00** (Ada's last seeded session). Optional: `[tool.ruff] src = ["."]` in `backend/pyproject.toml` so ruff groups imports the same from any folder | 2026-11-07 15:30 |
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
| Yehor | `yehorm14` | AI/ML engine + data (personas, DB tables, ingestion) + reflection agent | `yehor-ml-data` | `backend/engine/**`, `backend/tests/engine/**`, `backend/app/db.py`, `backend/app/ingest.py`, `backend/tests/app/test_db.py`, `backend/tests/app/test_ingest.py` | All tasks done; demo handed to Saliha 16:30 |
| Maxym | `maksymkhomitskyi` | Frontend + voice UI | `maxym-frontend` | `frontend/**` (except Yehor's Insights files) | M1–M4 + dashboard on main; ElevenLabs agent + live voice at the end |

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
- **frontend (2026-11-07 16:55):** `main` @ `ab2e88e`: dashboard at `/`, Study at `/study`, Insights page wired; semester grid on the dashboard as a GitHub-style grid, weekly bar chart and glass cards
- **frontend (2026-11-07 16:09):** on `main` @ `7093149`: M1–M4 + Feynman typed fallback; run `cd frontend && npm i && npm run dev` (mock API) or `VITE_API_URL=http://127.0.0.1:8000 npm run dev` (real API, CORS allows :5173). `npm run build` = typecheck + contract check vs `schema.d.ts`. Live voice waits on the ElevenLabs agent
- **`main` (2026-11-07 16:25):** real backend (all §11 routes on SQLite + engine), 174 tests pass, `LLM_MODE=cache` default; OPENAI_MODEL_FAST/SMART still unset (live grading falls back to word overlap); Insights page waits on the frontend scaffold

---

## Log (newest first)

### 2026-11-07 17:15 — feat — Vercel config, engine guard + easing, PDF drop-in, active minutes — @saliha
- **Where:** `yehor-ml-data`, `maxym-frontend`, `sali-backend` · merged to `main`: yes (also carried @maxym's `827821f` to `main`, tsc green)
- **Did:** `vercel.json` (services: backend FastAPI `app/main.py` on `/api/*`, frontend Vite on `/*`; no bindings: nothing
  calls another service server-side). `VITE_API_URL=/` now means "real API, same origin". LLM cache folder from
  `LLM_CACHE_DIR` and safe on read-only disks. New pure `engine/guard.py` (answer-seeking vs real attempts, hint-ladder
  sizes) and `engine/adapt.py` (ease one notch on 2+ agreeing signals, ramp back after two good windows + 5 min, TUNE).
  Materials accept `pdf_base64`; insights rows carry `active_minutes`. 271 tests pass.
- **Touched:** `vercel.json`, `backend/engine/{guard,adapt}.py` + tests, `backend/app/{llm,flow,schemas,main}.py`, `frontend/src/api/client.ts`, `.env.example`s
- **Brief task:** none (Saliha's 17:00 request; hint ladder wiring + UI next)
- **⚠️ Conflicts:** @yehor: two NEW engine files only; none of yours edited · @maxym: `api/client.ts` base-URL lines only; `active_minutes` is now on `attention_by_session` (your dashboard can drop the 25-min estimate); hint-ladder UI next touches `ItemView.tsx`/`Session.tsx` — pull first
- **📨 Needs:** none
- **Agreed by:** @saliha
- **Status:** open

### 2026-11-07 16:55 — feat — Weekly bar chart is back on the dashboard; hours heatmap removed — @maxym
- **Where:** `maxym-frontend` @ `ab2e88e` · merged to `main`: yes
- **Did:** The Time and effort card shows the earlier 7-day bars again (estimated focus minutes and small wins per day, legend, reflection note) instead of the hours heatmap. `HoursHeatmap.tsx` deleted; it stays in history at `f2b2c4b` if we want it back. The log entry just below about the heatmap is superseded by this one.
- **Touched:** `frontend/src/pages/Dashboard.tsx`, `frontend/src/components/HoursHeatmap.tsx` (deleted)
- **Brief task:** M5 → 🟡 part (polish)
- **⚠️ Conflicts:** none
- **📨 Needs:** none
- **Status:** —

### 2026-11-07 16:56 — feat — Frosted-glass cards and soft backdrop on the dashboard — @maxym
- **Where:** `maxym-frontend` @ `40f8f22` · merged to `main`: yes
- **Did:** `Card` takes `glass`: translucent, blurred, more rounded; opacity chosen so muted text stays above 4.5:1. The dashboard has a misty backdrop built from the theme colours; the nav band is transparent and the page content has its own stacking context. Other pages keep flat cards. @saliha: `Card` is unchanged unless you pass `glass`, so Insights looks the same.
- **Touched:** `frontend/src/components/ui.tsx`, `frontend/src/components/PageShell.tsx`, `frontend/src/pages/Dashboard.tsx`
- **Brief task:** M5 → 🟡 part (polish)
- **⚠️ Conflicts:** none
- **📨 Needs:** none
- **Status:** —

### 2026-11-07 16:55 — feat — Last-7-days hours heatmap on the dashboard — @maxym
- **Where:** `maxym-frontend` @ `f2b2c4b` · merged to `main`: yes
- **Did:** Rows are days, columns are hours of the day, shaded by estimated focus minutes, with total, peak hour and daily average on top. Replaces the bar chart and its reflection note. A session counts in the hour it started; on the real API minutes are the same 25 min guess per session as the focus metric (labelled "Est.").
- **Touched:** `frontend/src/components/HoursHeatmap.tsx`, `frontend/src/pages/Dashboard.tsx`
- **Brief task:** M5 → 🟡 part (polish)
- **⚠️ Conflicts:** none
- **📨 Needs:** none
- **Status:** —

### 2026-11-07 16:54 — feat — Semester grid in the GitHub layout — @maxym
- **Where:** `maxym-frontend` @ `0005424` · merged to `main`: yes
- **Did:** Month labels on top, Mon/Wed/Fri down the side and a Less/More legend, all on one CSS grid so labels line up at any width; empty days stay outlined. Shade classes moved to `lib/activity.ts` (`SHADE_CLASS`) for reuse.
- **Touched:** `frontend/src/components/ContributionGrid.tsx`, `frontend/src/lib/activity.ts`
- **Brief task:** M5 → 🟡 part (polish)
- **⚠️ Conflicts:** none
- **📨 Needs:** none
- **Status:** —

### 2026-11-07 16:46 — feat — Dashboard effort grid covers the whole semester — @maxym
- **Where:** `maxym-frontend` @ `2dd4095` · merged to `main`: yes
- **Did:** The dashboard grid now spans the semester edge to edge (Autumn = Sep to Jan, Spring = Feb to Jun, Summer = Jul to Aug, from the dev clock), one square per day, empty days outlined, filled days in four slate steps. Heading names the semester ("Autumn 2026") with its date range. Removed the day-detail panel and the Less/More legend under the grid; each square keeps the day and counts as its tooltip and `aria-label`. Arrow keys move by day and week. Checked in dark and light, at 1280 px and phone width.
- **Touched:** `frontend/src/components/ContributionGrid.tsx`, `frontend/src/lib/activity.ts`, `frontend/src/pages/Dashboard.tsx`
- **Brief task:** M5 → 🟡 part (polish)
- **⚠️ Conflicts:** none
- **📨 Needs:** none
- **Status:** —

### 2026-11-07 16:43 — feat — Cursor orb that blooms into hovered controls — @maxym
- **Where:** `maxym-frontend` @ `04a25a3` · merged to `main`: yes
- **Did:** The orange cursor dot is now an orb that trails slower and fades out over a control, which takes the orange highlight. Still off in study sessions, on touch screens, with reduced motion and when switched off in `/dev`. @yehor's 16:40 review suggests dropping the orange hover swap; kept for now (Maxym's design call).
- **Touched:** `frontend/src/components/CursorDot.tsx`, `frontend/src/index.css`
- **Brief task:** M5 → 🟡 part (polish)
- **⚠️ Conflicts:** none
- **📨 Needs:** none
- **Status:** —

### 2026-11-07 16:42 — feat — Dashboard home page; Home moves to /study — @maxym
- **Where:** `maxym-frontend` @ `95e3d52` · merged to `main`: yes
- **Did:** `/` is now a dashboard: estimated focus time, sessions, questions cleared, small wins today, a 7-day effort chart, a 13-week grid, readiness per subject and the nearest exam. The old Home (eat-the-frog, Start) is `/study`; `/progress` redirects to `/`. Status strip hidden on the dashboard. Seeded history still shows the Demo data badge. **Gap:** `attention_by_session` has no `active_minutes` in §11, so on the real API focus time is a 25 min guess per session and is labelled "Est."; the mock returns real minutes.
- **Touched:** `frontend/src/pages/{Dashboard,Progress}.tsx`, `frontend/src/App.tsx`, `frontend/src/components/{PageShell,ContributionGrid}.tsx`, `frontend/src/api/{mock,types}.ts`
- **Brief task:** M5 → 🟡 part (polish)
- **⚠️ Conflicts:** @saliha: optional, contract ⚖️: add `active_minutes` to `AttentionBySession` so the dashboard can drop the guess (needs @yehor too; not urgent)
- **📨 Needs:** none
- **Status:** open

### 2026-11-07 16:41 — feat — Insights page wired to /insights/:subjectId (S5 route swap) — @maxym
- **Where:** `maxym-frontend` @ `39a27e3` · merged to `main`: yes
- **Did:** `App.tsx` now routes `/insights/:subjectId` to @saliha's `Insights`; removed the placeholder `InsightsShell.tsx`. Checked on `main`'s real API: method fit, scores, focus and readiness sections render, no console errors.
- **Touched:** `frontend/src/App.tsx`, `frontend/src/pages/InsightsShell.tsx` (deleted)
- **Brief task:** answers @saliha's 16:35 row
- **⚠️ Conflicts:** none
- **📨 Needs:** none
- **Status:** —

### 2026-11-07 16:30 — docs — Demo handed to Saliha — @yehor
- **Where:** `context` @ `ad6e001` (handoff) · `main` (board)
- **Did:** Ran the full local stack (backend :8000 + frontend :5173 on the real API) and the demo path end to end. Saliha records the demo; run order, what's verified and what's needed are in `docs/handoff/YEHOR.md`.
- **Touched:** `docs/handoff/YEHOR.md`, `progress.md`
- **Brief task:** Y5 → ✅ done (demo support handed over)
- **⚠️ Conflicts:** none
- **📨 Needs:** @saliha: see the 16:30 board row (keys, cache warm, Insights route, voice fallback, reset before each take)
- **Status:** open

### 2026-11-07 16:35 — feat — Insights page: method fit, scores over time, focus, readiness, timeline, reflections (S5) — @saliha
- **Where:** `sali-backend` · merged to `main`: yes
- **Did:** `pages/Insights.tsx` + `components/insights/charts.tsx` (Recharts, Maxym's theme tokens). Fit bars with credible
  range whiskers and an early-read chip, probe score per method over time, focused/drifting/lapsed per session,
  readiness meters, timeline, reflections via Maxym's `ReflectionCard`; a "Demo data" banner whenever seeded history is
  shown. `tsc` and `vite build` pass.
- **Touched:** `frontend/src/pages/Insights.tsx`, `frontend/src/components/insights/charts.tsx`
- **Brief task:** S5 → ✅ (route swap is Maxym's)
- **⚠️ Conflicts:** @maxym: none of your files changed; reuses `PageShell`, `Card`, `Chip`, `Meter`, `ReflectionCard`, `api`
- **📨 Needs:** @maxym: route swap (16:35 row)
- **Status:** open · *2026-11-07 16:41: route swap done by @maxym (`39a27e3`)*

### 2026-11-07 16:20 — feat — Q3 security (data side) done; confidence reads the leading method — @yehor
- **Where:** `yehor-ml-data` → `main` @ `6f78e65` · merged to `main`: yes
- **Did:** `LLMUsageRow.user_id` (indexed, optional) for Saliha's per-user quotas; `ingest.chunk_material` keeps at most 200 chunks (Codex; truncates because `add_material` doesn't catch ingest errors). `methodfit.confidence` now uses the leading method's sessions + interval separation, so a method tried once no longer pins it at EARLY. `no-slop` on both diffs; 243 tests, ruff clean; demo path re-checked through the API.
- **Touched:** `backend/app/db.py`, `backend/app/ingest.py`, `backend/engine/methodfit.py`, tests
- **Brief task:** Q3 → ✅ done · Q1, Q2 → parked
- **⚠️ Conflicts:** @saliha: your 17:05 ask is done (row removed). Run `/dev/reset` on any existing `attune.db`.
- **📨 Needs:** none
- **Agreed by:** @yehor
- **Status:** resolved by @yehor 2026-11-07 16:20

### 2026-11-07 16:20 — feat — Quote-grounded question generation and per-job model settings (P2) — @saliha
- **Where:** `sali-backend` · merged to `main`: yes
- **Did:** Generated key points and questions must quote the passage word for word; ungrounded items and MCQs with a
  bad key are dropped, gaps filled from the passage. Generation on `gpt-6.1-terra` (effort medium, 4000 tokens),
  grading + Feynman on `gpt-6-luna` (low, 1000), engine reflections low effort; refusals are errors. Live check: luna
  graded correctly, terra's bank kept all 14 items (each with a real quote); ~2.3k tokens. 221 tests pass.
- **Touched:** `backend/app/{llm.py,flow.py}`, `backend/tests/app/{test_flow.py,test_llm.py}`
- **Brief task:** P2 → ✅
- **⚠️ Conflicts:** @yehor: `EngineLLM` now asks for low effort on reflections; your `reflect` contract is unchanged
- **📨 Needs:** none
- **Status:** open

### 2026-11-07 16:09 — feat — Cream and slate palette, orange hover (design) — @maxym
- **Where:** `maxym-frontend` @ `7093149` · merged to `main`: yes
- **Did:** Maxym's redesign in `src/index.css`: cream surfaces, slate accent, orange interaction colour on hover and for the cursor dot (now hidden over controls). Dark theme passes WCAG AA everywhere checked. **Known issue, kept by choice:** in light theme white text on the slate accent is 4.0:1 and on the orange hover 3.4:1 (AA needs 4.5:1); darker shades that pass are `#64778b` / `#ad6136` if we change our minds.
- **Touched:** `frontend/src/index.css`, `frontend/src/components/CursorDot.tsx` (+ two comments)
- **Brief task:** M5 → 🟡 part (polish)
- **⚠️ Conflicts:** @saliha: Insights page colours come from these tokens (`bg-accent`, `bg-g0`–`g4`, etc.); use them rather than raw hex
- **📨 Needs:** none
- **Status:** —

### 2026-11-07 16:08 — feat — Dev panel, progress grid and questions inbox (M4) — @maxym
- **Where:** `maxym-frontend` @ `96a055b` · merged to `main`: yes
- **Did:** `/dev`: seed demo persona, advance N days, force reflection per subject, reset, `/dev/usage` totals, "simulate drift" (mock only), "Demo data" badge in the header whenever seeded history exists. Reflection card (diagnosis chip + explanation + decision) on Home and Result. `/progress`: GitHub-style day grid from `insights.method_series` + local tasks (frogs eaten, questions answered), no streaks; territory bar per subject. `/questions`: inbox for questions parked with Q. Passed on `main`'s real API (reset → seed → advance 7 → plateau reflection).
- **Touched:** `frontend/src/pages/{Dev,Progress,Questions}.tsx`, `frontend/src/components/ContributionGrid.tsx`, `frontend/src/lib/activity.ts`, `frontend/src/App.tsx`
- **Brief task:** M4 → ✅ done
- **⚠️ Conflicts:** none
- **📨 Needs:** none
- **Status:** —

### 2026-11-07 16:07 — feat — Feynman screen: voice + typed fallback (M3) — @maxym
- **Where:** `maxym-frontend` @ `e70df73` · merged to `main`: yes
- **Did:** Feynman item → mic explainer → "Talk to Sam" mints `/voice/signed-url` on the click (per @saliha 15:30) → `@elevenlabs/react` `startSession({signedUrl, dynamicVariables: {topic, key_points joined}})`, live transcript, speaking indicator, `VOICE_TURN` events. `502 voice_unavailable` or a failed connection → one typed explanation turn → `/feynman-transcript` → score, covered, gaps → probe. Typed path passed on `main`'s real API (502 → typed → graded).
- **Touched:** `frontend/src/components/session/Feynman.tsx`, `frontend/src/pages/Session.tsx`
- **Brief task:** M3 → 🟡 part (typed fallback ✅; live voice untested until the agent exists)
- **⚠️ Conflicts:** none
- **📨 Needs:** @saliha: `ELEVENLABS_AGENT_ID` in your `.env` once I create "Sam" (end of day); until then keep returning 502
- **Status:** open

### 2026-11-07 16:06 — feat — Session runner, telemetry and interventions (M2) — @maxym
- **Where:** `maxym-frontend` @ `81269c0` · merged to `main`: yes
- **Did:** `/session/:id` state machine: item → feedback → … → Standard Probe → 1–5 felt rating → result ("quick check x/5 · focused x of y"). Active Recall reveal + one-tap self-grade (`self_grade`); MCQ sends the option text. `useTelemetry`: `ITEM_SHOWN`/`ITEM_ANSWERED` (latency = render → submit), `TAB_BLUR`/`TAB_FOCUS`, `IDLE` after 30 s; batched every 5 s and on each answer. Interventions: `EASIER`/`SWITCH_FORMAT` toast, `BREAK` modal with countdown (`BREAK_START`/`BREAK_END`), `WRAP_UP` banner. Timer: adaptive (plan minutes), Pomodoro 25/5 or untimed. Reload resumes item + timer. Q parks a question. Full session passed on `main`'s real API.
- **Touched:** `frontend/src/pages/Session.tsx`, `frontend/src/components/session/**`, `frontend/src/hooks/useTelemetry.ts`
- **Brief task:** M2 → ✅ done
- **⚠️ Conflicts:** none (calls only §11 endpoints)
- **📨 Needs:** none
- **Status:** —

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
- **Status:** open · *2026-11-07 16:07: @maxym's contract-notes row resolved (MCQ option text, signed URL on Start, 502 → typed, key_points joined)*

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
