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
| 2026-11-07 14:40 | @saliha | @yehor @maxime | ⚠️ conflict | **Roles swapped:** Saliha = backend (`sali-backend`), Yehor = AI/ML + data (`yehor-ml-data`), Maxime = frontend (`maxime-frontend`). Briefs and PRD updated on `context`; re-sync. @yehor: start Y0 `engine/types.py` (Saliha's stub API waits on it). Both: send @saliha your GitHub handle | 2026-11-07 14:40 |
| 2026-11-07 14:25 | @saliha | @all | ⚠️ conflict | **How docs work now:** every `.md` except `progress.md` and `README.md` lives on the `context` branch, never `main`. Clone, then `git fetch origin context && git archive origin/context \| tar -x && git rev-parse origin/context > .git/context-synced`. Your agent re-syncs per CLAUDE.md 🔄. Work on your role branch: `sali-backend` / `maxime-frontend` / `yehor-ml-data`. Keys: get the `.env` from @saliha directly, never via git or chat | 2026-11-07 14:25 |
| 2026-11-07 14:10 | @saliha | @all | ❓ question | PRD §19 open questions: hackathon tracks/sponsor rules, ElevenLabs quota, demo material, and who is doc owner (assumed @saliha) | 2026-11-07 14:10 |

**Kinds:** ⚠️ conflict (my change touches your work) · 📨 waiting on (I'm blocked until you do X) · 🔀 scope proposal (needs
the whole team's yes, CLAUDE.md §2c) · ❓ question for a teammate (project-wide unknowns go in PRD §19).

## 👥 Team
Full ownership and tasks live in each builder's brief (`docs/builders/<NAME>_BUILDER.md`). Update your own **Now** cell
whenever you log an entry.

| Who | GitHub | Role | Branch | Owns (paths) | Now |
|---|---|---|---|---|---|
| Saliha | `saliha006` | Backend + DB + LLM/voice services; repo, README, Devpost; doc owner (assumed) | `sali-backend` | `backend/app/**`, `backend/tests/app/**`, `scripts/**`, `.env.example`, `README.md`, `frontend/src/pages/Insights.tsx`, `frontend/src/components/insights/**` | S0: stub API by 14:40 + collaborators |
| Yehor | `{{github}}` | AI/ML engine + data (personas) + reflection agent | `yehor-ml-data` | `backend/engine/**`, `backend/tests/engine/**` | Y0: `engine/types.py` (unblocks Saliha) |
| Maxime | `{{github}}` | Frontend + voice UI | `maxime-frontend` | `frontend/**` (except Yehor's Insights files) | M0: Vite app + ElevenLabs agent |

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
- **`main` (2026-11-07 14:40):** `.gitignore`, `progress.md`, `README.md` only; `context` holds the docs; role branches `sali-backend`, `maxime-frontend`, `yehor-ml-data` cut from `main` · tests: n/a · stub API: not up · ElevenLabs key verified by the CLI, agent not created · deploy: local only (PRD §12)

---

## Log (newest first)

### 2026-11-07 14:40 — decision — Roles swapped: Saliha backend, Yehor AI/ML + data; front-end skills shared — @saliha
- **Where:** `context` + `main` · merged to `main`: yes (`progress.md`)
- **Did:** Saliha and Yehor swapped briefs (each keeps their own tool setup; Lovable stays with Saliha). Task IDs now
  follow the person: backend = S0–S6 + S-L, engine = Y0–Y5. Role branches renamed to `sali-backend`, `yehor-ml-data`.
  Front-end skills checked (no prompt injection, no network calls beyond localhost) and shared in `docs/skills-frontend/`.
- **Touched:** `docs/builders/*`, PRD §0/§9/§11/§13/§17/§19, `CLAUDE.md`/`AGENTS.md`, branches
- **Brief task:** none
- **⚠️ Conflicts:** @yehor @maxime: your brief changed; branch names changed (old `sali-engine`/`yehor-backend` deleted)
- **📨 Needs:** @yehor: does "data" mean you also take DB tables + ingestion (S1)? Today S1 is Saliha's
- **Agreed by:** @saliha (on behalf of the team, per chat)
- **Status:** open

### 2026-11-07 14:25 — docs — Repo wired up: docs on `context`, role branches, keys in `.env` — @saliha
- **Where:** `main` + `context` · merged to `main`: yes (`.gitignore`, `progress.md`)
- **Did:** Context docs moved to a `context` branch that never merges to `main`; `.gitignore` blocks every `.md` except
  `progress.md`/`README.md`, plus `.env*` and `*.db`. Role branches `sali-engine`, `maxime-frontend`, `yehor-backend` cut from
  `main`. OpenAI and ElevenLabs keys sit only in Saliha's local `.env`; ElevenLabs CLI confirmed the key works.
- **Touched:** `.gitignore`, `progress.md`, `context` branch, `CLAUDE.md`/`AGENTS.md` (sync + publish rules), PRD §0, all briefs
- **Brief task:** Y0 (repo) → 🟡 part (collaborators + stub API still @yehor)
- **⚠️ Conflicts:** @maxime @yehor: work on your role branch; your worktree branch names in the briefs changed to `<role-branch>-<task>`
- **📨 Needs:** @yehor: collaborators, `.env.example`, GitHub handle · @maxime: GitHub handle
- **Status:** open

### 2026-11-07 14:10 — docs — Charter, board and briefs set up for Great Uni Hack — @saliha
- **Where:** local, then `context` (14:25) · merged to `main`: n/a (docs)
- **Did:** `CLAUDE.md` and `progress.md` reset from the OxHack templates and filled from the PRD; `AGENTS.md` is now an
  identical copy of `CLAUDE.md` (keeps its ownership, spend, honesty and handoff rules). PRD gained a §0 NOW block; PRD and
  briefs moved to `docs/` per PRD §9; briefs now route cross-area requests to this board.
- **Touched:** `CLAUDE.md`, `AGENTS.md`, `progress.md`, `docs/PRD.md`, `docs/builders/*`
- **Brief task:** none
- **⚠️ Conflicts:** @yehor @maxime: requests to another person now go on this Open board (📨 row), not `docs/handoff/REQUESTS.md`
- **📨 Needs:** @yehor: repo + collaborators (Y0)
- **Status:** open
