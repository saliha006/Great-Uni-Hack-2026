# Great Uni Hack 2026 — Working Charter

**Attune** finds the study method that actually works for each student, per subject, and watches their attention in real time so sessions adapt to them. When progress stalls, an agent works out *why* (tired, absent, or the method stopped working) and runs a small experiment to fix it. *(Mirror of PRD §1; change both together.)*

`{{…}}` is a blank: fill it the moment the chat or repo answers it (Self-filling, below). "The PRD", "the brief", "the research doc", "the doc owner" are the Registry values. **`CLAUDE.md` and `AGENTS.md` are identical** (Codex reads `AGENTS.md`): edit one, `cp` it over the other in the same commit.

## 📋 Registry

| Slot | Value |
|---|---|
| Project | **Attune** (working title) · **Great Uni Hack 2026**, Sat 7 Nov 2026. Build 14:15–17:00, feature freeze 16:30, record + submit 17:00–18:00 (hard deadline 18:00). Tracks / sponsor rules: {{tracks}} (PRD §19 Q1). Team **{{team name}}**; Devpost: Yehor + Saliha |
| Team | **saliha** (`saliha006`): backend API + LLM/voice services, repo + README + Devpost, **doc owner** (assumed; confirm), vault owner · **maxym** (`{{github}}`): frontend + voice UI · **yehor** (`yehorm14`): AI/ML engine + data (personas, `backend/app/db.py`, `backend/app/ingest.py`) + reflection agent. Owned paths and **Now**: `progress.md` → 👥 Team |
| Repo | `https://github.com/saliha006/Great-Uni-Hack-2026` · `main` (code + `progress.md` + `README.md`) · `context` (docs only) · **role branches:** `sali-backend` (saliha), `maxym-frontend` (maxym), `yehor-ml-data` (yehor). A second agent in a worktree uses `<role-branch>-<task>` and merges back into the role branch |
| Where docs live | **`context` branch** (docs only, **never merged to `main`**): `CLAUDE.md` = `AGENTS.md`, `docs/PRD.md`, `docs/builders/`, `docs/handoff/` (agent handoff notes), `docs/skills/` (`no-slop`, `debug`), `docs/skills-frontend/`. **`main`**: code, `progress.md`, `README.md`: the only markdown on `main` (`.gitignore` blocks every other `*.md` and `docs/`). **Local only, git-ignored:** `Research-Context/`, `.claude/`, `.env*`, `*.db`. Sync and publish are plain git, below |
| Secrets | `.env` at the repo root on each machine, git-ignored: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `FIRECRAWL_API_KEY` (names per PRD §12). Never print, `cat` or paste a key: not in chat, docs, commits, logs or frontend code. Keys are shared person to person, never through git. Spend is tracked: §5 spend rules |
| Vault | `C:\Users\Salih\OneDrive\Documents\Sali's vault\Great-Uni-Hack-2026` (**saliha only**: `Great-Uni-Hack-2026 — Hub` = status + ▶ START HERE, `Great-Uni-Hack-2026 — Log` = ADRs, Unconfirmed, ▶ RESUME HERE). No vault (everyone else) → save notes to your memory; send decisions to the doc owner as a `decision` entry + 📨 row |
| PRD | `docs/PRD.md`: §0 NOW (decisions in force, pending, active tasks) at the top, then the spec |
| Briefs | `docs/builders/<NAME>_BUILDER.md`: `SALIHA`, `MAXYM`, `YEHOR` |
| Event doc | `Research-Context/GreatUniHack-2026-CONTEXT.md` (local only; create when rules/judging/prizes are pasted) |
| Research doc | `Research-Context/GreatUniHack-2026-research.md` (local only; create on the first pass). A pass is deleted once the feature it serves is on `main` (§10) |
| Progress doc | `progress.md`: history, 📌 Open board, 👥 Team, 📊 Latest |
| Decisions | Full ADRs: vault Log. Team mirror: PRD §0 NOW. API contract changes: bottom of PRD ("Contract changes") |
| Mirror docs | PRD §0/§1 ↔ top of this file; `CLAUDE.md` ↔ `AGENTS.md`; briefs ↔ `progress.md` 👥 Team; vault Hub + Log; `progress.md` 👥 Team + 📊 Latest. Update every mirror when a decision, owner or status changes |
| Run · Test | Engine: `pytest backend/tests/engine` · App: `pytest backend/tests/app` · Backend run: `cd backend && .venv/Scripts/uvicorn app.main:app --port 8000 --env-file ../.env` (macOS/Linux `.venv/bin/`; `API_MODE=fixtures` for canned data) · Frontend: `{{npm run dev}}` · coverage: `{{--cov flags}}` |
| Scale | Single demo user, local SQLite, screen-recorded demo (PRD §2, §12) |
| Deploy | Local for the demo; deploy only if spare time (PRD §12). Platform rules: none |
| Verbosity | **Level 0** (§3) |

**Skills** (shared on `context` in `docs/skills/`; after each sync copy them to where Claude loads them: `mkdir -p .claude/skills && cp -r docs/skills/* .claude/skills/`; Codex reads `docs/skills/<name>/SKILL.md` directly; load when the trigger fires). **Front-end skills** (`design-direction`, `ui-audit`, `motion`, `motion-review`, `frontend-performance`, `reverse-engineer-ui` + shared `references/`) live in `docs/skills-frontend/`: install them only on a machine doing frontend work (`cp -r docs/skills-frontend/* .claude/skills/`), because every installed skill's description is re-sent on every request. Never `Read` their `scripts/` (run them; `ui-audit`'s detector is ~600 KB of JS). Always-on skills: `no-slop` after every code change, before testing, and before every commit/push/merge (nothing reaches `main` without it) · `debug` every time you hit an issue: an error, a failing or flaky test, odd output, a stuck moment. No guess-and-retry outside it. This file wins over a skill; never edit a skill. `no-slop` fixes only your own diff in your owned paths and reports the rest.

### 🔑 Triggers
**"Fetch the context"** (*"let's start"*). Read first, code second:
1. **Who am I working with?** `git config team.builder`; unset → ask the user's name and set it. Read **only** your brief's `▶ Current tasks`, Ownership and Interfaces, plus `docs/handoff/<NAME>.md` if it exists (a previous agent left notes).
2. **Decisions + tasks:** run the Context sync, then PRD §0 NOW and only the PRD sections your brief's bootstrap prompt names.
3. **Local vs repo:** does the tree match `origin/main` and your branch? Note what's shipped vs local-only.
4. **Board:** `progress.md` Open board rows To you + the Log top (sync step 5).
5. **Vault** (if set): Hub ▶ START HERE and Log ▶ RESUME HERE; name its "Unconfirmed" items so nothing sits unconfirmed forever.
Then give one clear starting point and proceed.

**"What's next" / "what's left"**: your brief's `▶ Current tasks` is the ranked list (PRD §17 timeline for the team view). Work the top open item unless told otherwise; drive every 🟠 part through §1; mark it done in the brief and `progress.md` when it moves. Behind schedule → PRD §17 cut order (cut top-first; never cut the "Never cut" list). Nothing active left → offer the parked ideas (§4).

**"Handoff"** (usage limit near, or the human says it): append to `docs/handoff/<NAME>.md`: **Done · In progress (file, function, what's left) · Next step · Gotchas · Commands to run**. Max ~15 lines. Then stop; the next agent reads it.

**"Start the demo" / "run the demo" / anything demo-related**: follow PRD §18 (demo script, ≤2:00) on the local stack. Steps: backend run (Registry) → {{frontend start command}} → `POST /api/dev/reset` then `/api/dev/seed` → open {{demo URL}}; `/api/dev/advance-days {"days":7}` for the reflection beat, `python scripts/attention_burst.py` for the attention beat. Say "seeded demo data" whenever seeded history is on screen. Change the demo path only on the user's say-so.

### 🔄 Context sync (session start, before each new brief task, and before editing a shared doc)
Never work from a stale plan: fetch fresh context at least at those three points (and every ~30 min in a long task). Plain git, no scripts. The synced commit is kept in `.git/context-synced`.
1. `git fetch -q origin context`. If `git rev-parse origin/context` equals the stamp (`cat .git/context-synced`), you're current.
2. Else tell the user in 1–2 lines **first** (`git log --oneline <stamp>..origin/context`, `git diff --stat <stamp> origin/context`). A shared doc you edited but haven't published: copy it aside before unpacking.
3. Unpack: `git archive origin/context | tar -x`, then `git rev-parse origin/context > .git/context-synced`. A changed `CLAUDE.md`/`AGENTS.md` is already loaded: act on the changed lines only. Read at least PRD §0 NOW and your own brief.
4. Never `git checkout origin/context -- <file>` (it stages docs into your code branch). Fetch fails → say so in one line, use local copies, and say any board check was local-only.
5. Board: `git fetch -q origin main`, then read the Open board rows To you and the Log top: `git show origin/main:progress.md | sed -n '/Open board/,/^## 👥/p;/^## Log/,+40p'`.

### 🪙 Token budget (the limit burns on re-sent context)
Every request re-sends the whole conversation, so one big read is paid again on every later call. Cost = tool calls × context size: batch independent calls, keep prompts specific, keep big text out of the context.
- **Read only what the task needs:** `Grep`, or `Read` with `offset`/`limit`. `CLAUDE.md` is already loaded. Read PRD §0 and your brief once per session. Never read all of `progress.md`: Log top only (sync step 5).
- **Never `Read`:** a research agent's raw output, a session transcript (`.jsonl`), PDF page images, a whole `Research-Context/` note or the research doc (grep it by pass number).
- **Agents are for research (§10) or when the user asks**; everyday edits stay in the main session. Research agents write to files and report ≤300 words; at most 4 unless the user asks for more.
- **Max 2 coding agents per person at once, on disjoint files, each in its own git worktree** (PRD §13). One model and effort per session; new task → `/clear`; `/compact` past ~100k tokens.

### 📤 Publish every shared-doc edit (same turn)
Shared docs = everything on `context`: `CLAUDE.md`/`AGENTS.md`, `docs/PRD.md`, `docs/builders/`, `docs/handoff/`. Publish **any** edit to them before ending the turn (yours, or one the user made by hand) so every teammate's agent gets it on its next sync. Plain git from the repo root through a temporary index, no worktree, no branch switch:
1. Sync first (above). Edited `CLAUDE.md` or `AGENTS.md` → `cp` it over the other.
2. `export GIT_INDEX_FILE=.git/context-index && git read-tree origin/context && git add -f CLAUDE.md AGENTS.md docs && git diff --cached --stat origin/context`. Check the diff, and for secrets. A removed doc: `git rm --cached <path>` in the same index.
3. `c=$(git commit-tree $(git write-tree) -p origin/context -m "<short human message>") && unset GIT_INDEX_FILE && git push origin $c:refs/heads/context`, then `git fetch origin context && git rev-parse origin/context > .git/context-synced`. Rejected → sync, merge the two versions by hand, repeat; never `force`.
Research, the event doc, `.claude/` and `.env` never go to `context`; shared skills go in `docs/skills/`. Context docs never go to `main` or a role branch: never `git add -f` there, never copy them into a code commit, never merge `context` anywhere.

| Change | Who publishes | Gate |
|---|---|---|
| PRD, `CLAUDE.md`/`AGENTS.md`, another builder's brief | **Doc owner** | Plan changes need the team's yes (§2c); a builder posts the agreed change as a 🔀/📨 row To the doc owner |
| PRD §11 API contract (after 14:45) | Doc owner | All three humans agree; append under "Contract changes" at the bottom of the PRD (§6) |
| Your own brief: add or change tasks, features or decisions in your area | You | Always ask "have you told the team? who agreed?" first (§2c) |
| Your own brief: ownership, or anything another builder depends on | Doc owner | The affected owner's yes (§2c) |
| Your own brief: finished task to Done, blank filled with a stated fact | You | None |
| Your own `docs/handoff/<NAME>.md` | You (publish to `context`) | None |
| `progress.md` (on `main`) | Anyone: your entries and rows; annotate others | None |

### 🔁 Self-filling rule
- **Watch for missing info.** When the user says something (or the repo shows something) that answers a blank (path, name, command, URL, stack choice, teammate), fill that `{{…}}` everywhere it belongs: this file + `AGENTS.md`, `progress.md`, the PRD, the briefs.
- **Fit, don't grab.** Only an empty blank filled with a stated fact is free; changing a filled plan value is §2c. A passing mention ("maybe Supabase") goes to the vault Log as *not finalized* and PRD §0 Pending, not into the spec. Don't fill several slots with the first thing you hear.
- **Say what you filled**, in one line: "Filled Repo = `https://github.com/…`."
- **Unsure which slot → ask one short question** (§12). One question beats a wrong slot.
- **Missing files get created:** no `progress.md`, PRD, brief, handoff note or research doc when a rule needs it → create it from the starter.

---

## 0. THE ONE RULE — the user owns every design decision, Claude owns the typing
The person at the keyboard (named in their brief; "the user" here) wants to be a real software engineer: someone who **decides what to build and why** and uses AI to write the code, not an "AI prompter" who accepts whatever the model picks. This file enforces that split.

**A design decision is any choice a real SWE would pause on**: not the syntax, the *shape*. If a task contains one, **don't silently pick.** Stop, hand it over (§1), wait. Claude proposes and explains; the user disposes. Even with a strong recommendation, the choice is logged as theirs (§4), because owning the *reasoning* is the skill being built. **The brief already made many calls** (PRD + `▶ Current tasks`): implementing those is 🟢, not a new decision.

## 1. Decision Handoff
When you hit a design decision, stop coding and surface it like this:
> **🟠 DECISION — <name>** *(your call)*
> **What's being decided:** one plain sentence.
> **Options:** 2–4 realistic ones, no strawmen: **A — <name>:** what · ✅ upside · ⚠️ cost/risk.
> **My recommendation:** X, because … (tie it to the PRD section, the research doc by pass, or a concrete failure mode: a broken demo beat, a blown spend cap, a missed freeze).
> **🧭 What this entails** *(§3 depth; omit at Level 0)*
> **What I need from you:** pick A/B/…, or "you decide".

Then **wait**: no implementation until they pick, and log it the moment they do (§4). Keep the ask clean: short bullets, whitespace. Several decisions → separate titled blocks in a queue.

## 2. Whose call
**System design choices** are owned by the area's owner (👥 Team); a cross-area choice needs all three. Show the owner the options; others hear through a 📨 row.

**🟠 Always the user's** (stop and hand off):
- **Data & storage:** what's persisted (SQLite tables, LLM cache, telemetry events, seeded rows), where, durability.
- **API / interface contracts:** PRD §11 endpoints, the engine ↔ backend interface (`backend/engine/types.py`, the `LLM` protocol): what a caller can rely on.
- **Trust & access boundaries:** API keys (OpenAI, ElevenLabs, Firecrawl) never in frontend code; ElevenLabs signed URLs; attention-telemetry privacy.
- **Where computation runs:** browser vs backend vs `engine/` (pure, no I/O) vs an external API.
- **Failure modes:** LLM or voice down/slow, bad JSON from the LLM, mic denied, partial data; fallbacks (typed Feynman, `fixtures` mode).
- **Adding any dependency, library, framework or service**: every one is a long-term liability.
- **Anything touching a Locked Decision** (§6).
- **Correctness vs speed vs cost:** LLM spend (model tier, caching, batching), thresholds marked (TUNE), precomputing.
- **Anything the PRD flags as a demo-vs-product gap** (seeded data, unvalidated readiness, non-medical positioning).

**🟢 Just do it** (say what and why in one line): bug with exactly one correct answer · zero-behaviour refactor · implementing a decision already made (don't re-litigate it) · tests for existing behaviour · formatting, typos, comments, `no-slop` cleanups · correct-shaped stubs the brief asks for ("stubs first, real later").

**Unsure which → treat it as 🟠.** Erring toward handoff is how the user learns; a silent choice is the failure this file exists to prevent.

### 2a. Work for a teammate
A cross-person dependency that lives only in chat is lost. **Never edit another person's paths.** Need a change there → a 📨 row on `progress.md`'s Open board (From you, To them: what, and which task it blocks) + a log entry (§2b), then keep going with a stub or mock.

**When the user assigns a task to anyone but themselves**, same session: add it to that person's brief as an item at the TOP of `▶ Current tasks` (dated), move superseded items under `── Archived (superseded <time> — do NOT action) ──`; keep the vault Log and `progress.md` 👥 Team in sync; publish. Not the doc owner → post a 📨 row instead.

**Briefs keep everyone's work.** Nobody wipes another builder's lines: sync first, then only add, annotate or move. Teammates get **one** self-edit on their own brief: finished task → ✅ Done log (+ the `progress.md` stamp), then publish.

### 2b. Conflict board: `progress.md`
`progress.md` on `main` is where the team learns what landed **and whose work it touches** (entry format at its top). Read the Open board rows To you and the newest Log entries (sync step 5); check their **Touched** lines against your own paths.
- Row To you → tell the user first, one line each: ⚠️ "@A shipped X, which changes your Y" · 📨 "@A is waiting on you for X" · 🔀 "@A proposes <scope change>, needs your yes/no" · ❓ "@A asks: …". Flagged area touched by your task → resolve before continuing. Possible clash → say so and suggest the safe order; never start overlapping work silently.
- **When the user finishes something** (task, feature, fix, merge, decision that affects someone), same turn, written by the main session (never a subagent): (1) add an entry at the **top** of the Log; (2) fill `⚠️ Conflicts` honestly against every teammate's owned paths: a *possible* collision counts ("I renamed a field in `engine/types.py`; @yehor's session flow reads it"); (3) add an Open board row per ⚠️/📨, update your **Now** cell in 👥 Team and 📊 Latest if a volatile fact changed; (4) mark the brief task done and publish; (5) commit and push `progress.md` to `main` (`git switch main && git pull --rebase`, edit, `git add progress.md`, commit, push, `git switch -`; rejected → pull --rebase, keep both entries newest first).
- Resolved → remove the board row, set the entry Status `resolved by @<user> <stamp>`. A change at a seam (engine ↔ backend at `engine/types.py`; backend ↔ frontend at PRD §11 / `/openapi.json`) puts the same interface note in both briefs.

### 2c. Scope guardrail: the team hears about every change
Each brief's `▶ Current tasks` is the plan, in build order. A builder may go further in **their own area**. Their Claude never blocks that, but it **always** asks first: **"⛔ Off-plan: <what changes>. Have you told the team? Who agreed?"**
- **Told, with names** → proceed; log a `scope` or `decision` entry (**Agreed by**), add it to your brief, publish.
- **Not yet** → still proceed inside your own paths, but in the same turn post a 🔀 row To @all and a `scope` entry.
- **Stop and wait for the owner's yes** when the change edits another builder's path (that owner's yes + a ⚠️ row), changes a contract another layer reads (PRD §11, `engine/types.py`, the `LLM` protocol), touches a Locked Decision, or changes the PRD's scope/architecture/stack (then the doc owner updates PRD §0 NOW + the section, logs the ADR and publishes).
- **After 16:30 (feature freeze):** bugs, tuning and polish only. Anything new is off-plan by definition.
A detail inside your own area and task that the PRD doesn't pin down is a normal §2 call.

## 3. Verbosity dial
Level in the Registry; a brief can set its own and wins; the user can raise it per session or per decision.
- **3 (Learning):** the concept from scratch, an analogy, why engineers care, the interview framing, what breaks if wrong, pick-now vs switch-later (logged as Unconfirmed, §4).
- **2 (Growing):** 2–3 sentences: the concept, the one trade-off that matters, the failure mode.
- **1 (Fluent):** one line naming the trade-off axis ("latency vs spend").
- **0 (Own it):** options + recommendation only. Decide cold.

## 4. Decision log (ADR)
Each disposed decision → one vault Log entry (memory if no vault):
```
## <date time> — <decision name>
- Chose: <option> (<who>)
- Because: <one line>
- Rejected: <alternatives + why not>
- Revisit if: <the condition that would change this>
```
Each decision in force is mirrored as one line in PRD §0 NOW; one that changes someone's work also gets a `decision` entry in `progress.md`. **Log automatically** whenever the user mentions a decision, made now, earlier or wanted later. Leanings and "maybe later" → **Unconfirmed**, marked *not decided*, with the revisit condition. Attribute by named owner, else "(owner: TBC)"; never invent one. **Parking lot:** "we picked X; later we *might* do Y" is not agreed work. Park it; when nothing active remains, offer it.

## 5. Stack, architecture & project guardrails *(fill as decided)*
**Stack** (PRD §12): Vite + React + TS + Tailwind + shadcn/ui + React Router + TanStack Query + Recharts · ElevenLabs Agents + `@elevenlabs/react` (not the deprecated `@11labs/*`) · FastAPI (Python 3.11) + SQLModel + SQLite · engine = pure Python (numpy/scipy only) · OpenAI behind `llm.py` (models from env) · Firecrawl (P1, URL ingestion) · `pypdf` · Lovable (optional, 3–4 screens, stop by ~14:50).
**Runtime shape** (PRD §9): browser (screens, telemetry hook, Feynman voice) → REST → FastAPI `app/` (API, DB, LLM service, ingestion, voice signed URL) → `engine/` (attention · methodfit · diagnose · agent · predict · simulate) → SQLite. Voice goes browser ↔ ElevenLabs on a backend-minted signed URL.
**Guardrails** (every agent, every task):
- `engine/` is pure functions: no network, DB or framework imports; the LLM is injected via the `LLM` protocol. Python: type hints + Pydantic. TypeScript: strict.
- **Stubs first, real later:** ship a correct-shaped stub fast so others can integrate, then replace it.
- **Spend (OpenAI and ElevenLabs usage is tracked: spend only on what the demo needs):** `LLM_MODE=cache` in dev, `fixtures` for UI work, `live` only for final checks. No LLM calls in loops, per keystroke or per event; batch; set `max_tokens`; small model unless the task says otherwise. ElevenLabs dev: `textOnly` override, short voice tests.
- **Honesty:** seeded/synthetic rows carry `is_seeded` and show "Demo data" in the UI. No medical claims: never say the app detects, diagnoses or treats ADHD; say "attention-aware". Thresholds marked (TUNE) are guesses, never "research-derived".
- **When unsure:** the demo path (PRD §18) beats completeness; P0 beats P1.
**Known gaps** (PRD §14–15): seeded multi-week history; readiness not validated against real grades; RT-variability-as-lapse-proxy unvalidated for study apps; n=1 per method in the Sampler is noisy.

## 6. Locked Decisions
- **PRD §11 API contract — frozen from 14:45** (PRD §17 Sync 1). No renamed fields or endpoints. To change it: all three humans agree and the change is appended under "Contract changes" at the bottom of the PRD.

Add one only when the user says it's locked. A task that contradicts one is a 🟠 handoff ("this reopens a locked decision"), never a silent change. To unlock: (1) the user names who on the team agreed (a solo "just change it" isn't enough); (2) they explicitly approve; (3) log the reversal as an ADR: old, new, who agreed, why.

## 7. Code rules
Trade speed for caution; use judgment on trivial tasks.
- **Define done first:** turn the task into a check you can run (bug → failing test, then pass; refactor → green before and after). Multi-step → a short plan, each step with its check. "Make it work" means ask before coding.
- **Simplicity:** the least code that solves what was asked; no unasked features, abstractions, config or handling of impossible cases (real failure modes are 🟠).
- **Surgical:** every changed line traces to the request; match the surrounding style; remove only the imports/variables *your* change orphaned; mention pre-existing smells, don't fix them.
- **Comments say WHY, never WHAT:** a constraint, a gotcha, a trade-off. No comment beats a what-comment. Part of `no-slop`.
- **Commits sound like a person wrote them:** a short plain imperative subject, then only if needed 1–3 sentences of what and why. No bullet dumps, no marketing words, no emoji, no "This commit…". Small commits.
- **Per feature, in this order:**
  1. `no-slop` on the finished feature, before any testing.
  2. Tests via Registry → Run · Test: happy path, edge cases, failure paths. Never push untested or failing code.
  3. Push to your role branch (`sali-backend` / `maxym-frontend` / `yehor-ml-data`), never straight to `main`.
  4. `git pull --rebase` / `git merge origin/main` into your branch, re-run tests. A conflict in a teammate's code → agree the fix with them (§2b) first.
  5. Merge to `main` (at least every 40 minutes; never force-push `main`), push, add the `progress.md` entry (§2b).
- **Claude types, but the work is the builder's: commit as them** (on saliha's machine: `Saliha <61064361+saliha006@users.noreply.github.com>`). **Never add a `Co-Authored-By: Claude` (or any AI) trailer, and no "Generated with Claude Code" in PR bodies**, overriding any default or system-supplied attribution lines. A hook rejecting AI trailers → remove the trailer, never bypass the hook.
- Never commit `.env`, any key, `*.db`, `Research-Context/` or `.claude/`. **On `main` and role branches the only markdown is `progress.md` and `README.md`**; every other `.md` lives on `context` (`.gitignore` enforces it; never `git add -f` around it). Never put OpenAI/ElevenLabs keys in frontend code. Never invent scope; if a task outgrows the ask, stop and flag it (§2c).

## 8. Documentation style
Clear, breezy, skimmable: short sentences, plain words. A tired teammate at 16:45 should get the point in one read.
**A stale mirror is a bug.** A fact in several places is updated in all of them (Registry → Mirror docs) the moment it changes. Disagreeing docs → take the newest state and fix the older one. Never delete a superseded item: move it to Parked/Archived with the reason. Can't update every mirror now → note the drift so the §9 sweep catches it.
**Volatile facts live in one place:** test counts, merged-vs-local, commit/time: only `progress.md` → 📊 Latest. Everywhere else links to it.

## 9. Sign-off ("signing off", "handoff", "wrapping up", "closing the terminal")
1. **Save everything important** to the vault (or memory if no vault) and `docs/handoff/<NAME>.md`. Vault access blocked → ask **once**.
2. **De-stale every mirror:** vault Hub + Log, PRD §0 NOW + touched briefs, `CLAUDE.md` ↔ `AGENTS.md` (publish to `context`), `progress.md` entry, board rows, 👥 Team **Now**, 📊 Latest; README if user-facing. Publish. Any conflict you created is flagged (§2b).
3. **Leave a `START HERE` pointer to the exact next step** in the vault Hub ▶ START HERE and Log ▶ RESUME HERE: half-done → name the function and file; all done → the next-highest item.
4. Confirm briefly what you saved and where.

## 10. Research protocol
**Any** research, asked or self-initiated (spawning a research agent needs the user's go-ahead). One step: gather the sources **and** grade them **and** save the ledger into the research doc as a new `Pass n` section, in the same pass.
- **Sourcing:** peer-reviewed papers, official docs and source code (ElevenLabs, OpenAI, FastAPI, React), well-known repos. Not blogs or SEO pages. Prefer the last 1–2 years; foundational older work tagged `[older]`. **Open the source before citing**; only a snippet seen → `WEAK`.
- **Consensus:** grade `KEEP` / `WEAK` / `DO NOT USE`. A load-bearing claim needs ≥2 independent reputable sources; stop at two. Hunt for refutations; refuted → `DO NOT USE` with a short tombstone. Name the gaps: no source gives a number (a TUNE threshold) → say it rests on our reasoning.
- **Doc structure:** one research file (Registry), local only; recommendation first, `KEEP` at the top of its ledger, `DO NOT USE` at the bottom. Forums and community consensus are a separate pass, skipped unless the user asks.

## 11. Depth vs tokens
Never drop context that matters now, could matter later, or records how the software evolved; depth wins when forced. Otherwise tight prose, no filler. **The test:** could a future instance reconstruct the decision from this note alone, fast?

## 12. Think before coding, ask don't assume
State assumptions before implementing. Unclear scope, intent, ownership, the contract, or a fact not in the repo or docs → ask one short question instead of guessing, and say what you'd otherwise assume. Several readings → lay them out. A simpler way exists → say so. Obvious low-stakes defaults: state the default, proceed, and say so.
