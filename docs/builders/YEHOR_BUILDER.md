# YEHOR — Builder file: AI/ML Engine + Data (personas) + Reflection Agent

**Read `docs/PRD.md` and `AGENTS.md` first.** This file is your task list and agent setup.

## Mission
You own the part that makes Attune more than a quiz app: the **adaptive engine** (`backend/engine/`): method-fit model, real-time attention scoring, diagnosis (tired vs absent vs plateau vs mastered), the reflection agent, readiness prediction, and the seeded personas that make the demo story reproducible. Everything is **pure Python functions**; Saliha wires them into the API.

Your two deliverables that decide the demo: **(1)** the attention engine fires a believable intervention, **(2)** the diagnosis correctly separates *fatigue* from *plateau* on seeded data and triggers a trial.

## Your agent setup

Claude Pro has tighter limits, so spend it on the logic with judgement in it and put Codex on volume from the start.

| Tool | Role | Use it for |
|---|---|---|
| **Claude Pro** (main driver) | Stream A, main worktree | `types.py`, `attention.py`, `methodfit.py`, `diagnose.py`, `agent.py`: all the logic with judgement in it |
| **Codex Plus** | Stream B, second worktree | `simulate.py` (personas), unit tests, adversarial review of thresholds, `predict.py` first draft |
| OpenAI / ElevenLabs / Firecrawl | You don't call these directly | The engine takes an injected `LLM`. Saliha owns the clients |

**Run two streams, no more.** Worktrees:
```bash
git worktree add ../attune-sim -b yehor-ml-data-sim   # Stream B (Codex): simulate.py + tests; merge into yehor-ml-data
# main checkout on yehor-ml-data = Stream A (Claude Pro): logic modules
```
**Bootstrap prompt (paste as the first message to any agent working for you):**
> Read `AGENTS.md`, `docs/PRD.md` (§8, §11, §13) and `docs/builders/YEHOR_BUILDER.md` fully. I'm Yehor. You work only in `backend/engine/**` and `backend/tests/engine/**`. Reply in ≤5 lines with: your scope, the interfaces you must match (PRD §11 "Engine ↔ backend interface"), and your first task. Then start. Commit after each task. Keep engine functions pure (no I/O, no network).

**Failover:** if Claude Pro nears its limit → "handoff" → agent appends to `docs/handoff/YEHOR.md` → Codex takes the main seat with the same bootstrap prompt (and vice-versa). Don't wait for the limit to fully hit.

**Before 14:15:** check Claude + Codex usage. Get the `.env` from Saliha directly (never via git or chat).

## Ownership
`backend/engine/**`, `backend/tests/engine/**`. **Don't touch** `backend/app/**` (Saliha) or `frontend/**` (Maxime). Requests go on the `progress.md` Open board as a 📨 row (CLAUDE.md §2a).

## ▶ Current tasks (in order)

**Y0 · 14:15–14:35 · Types first** *(unblocks Saliha)*
- `engine/types.py`: Pydantic models for everything in PRD §11 that the engine touches (`Method`, `Plan`, `AttentionReading`, `Intervention`, `Reflection`, `Decision`, `Readiness`, …) **plus** internals: `Event`, `ItemMeta`, `Baseline`, `MethodStats{alpha,beta,n}`, `SessionSummary{session_id, ts, method, mode, probe_score, delayed_score?, active_minutes, completion, felt_rating, drift_share, lapse_share, gap_days_before, hour_of_day, is_seeded}`, `SubjectCtx`, `Diagnosis{name, evidence}`, `TrialOutcome{adopt, delta, n}`, and the `LLM` Protocol (`complete_json(system, user, schema, tier)`).
- Push to `main` and tell Saliha.
- ✅ Accept: `from engine.types import *` works; models match PRD field names exactly.

**Y0b · 14:35–14:50 · Stubs with correct shapes** *(unblocks vertical slice)*
- Every function in PRD §11 "Engine ↔ backend interface" exists and returns a plausible, correctly-typed result (e.g. `score_attention` → `FOCUSED`, `choose_plan` → forced round-robin, `diagnose` → `ON_TRACK`, `reflect` → templated).
- ✅ Accept: Saliha can import and call all of them. Push by **14:50**.

**Y1 · 14:50–15:20 · `methodfit.py` + tests** *(Stream A)*
- `session_reward`, `update_stats` (Beta update with fractional reward), `choose_plan`, `confidence`. Reward weights per PRD §8.2.
- `choose_plan`: during `SAMPLING` → forced Latin-square order (rotate by `hash(subject_id)`; each round gets a different chunk of similar difficulty); in `ADAPTIVE` → Thompson sampling with exploration floor ≥15%; honour an active `TRIAL` (`trial_until`); set `session_minutes` from `focus_window` (default 20). Always fill `reason` with a human sentence ("Calibration round 2 of 3").
- Priors: practice test/active recall slightly above Feynman (prior strength ≈ 4).
- ✅ Accept: tests prove (a) sampler visits each live method once in rotated order, (b) a method with consistently higher reward becomes the most-chosen, (c) exploration floor holds, (d) plan during trial = trial method.

**Y2 · 15:20–15:55 · `attention.py` + tests** *(Stream A)*
- `score_attention` per PRD §8.3: `latency_ratio = latency / expected_seconds`; CV over a window of 8 (min 5); `idle_count`, `blur_count`; z-scores vs baseline; 2-window hysteresis.
- `recommend_intervention` per the table, with a 4-min cooldown; `focus_window` = median minutes-to-first-DRIFTING over the last 5 sessions, clamped 10–45; `update_baseline`.
- **Default baseline** values are placeholders (TUNE). Mark them clearly in code.
- ✅ Accept: synthetic streams: steady → `FOCUSED`; rising/erratic latencies → `DRIFTING` within ~8 items → `EASIER`/`SWITCH_FORMAT`; persistent → `BREAK`; no flicker on a single outlier.
- **Hand to Maxime/Saliha:** the demo needs an easy way to *induce* drift (e.g. answer slowly then fast, switch tabs). Agree the trigger with Maxime at the 15:50 sync.

**Y3 · 15:55–16:15 · `diagnose.py` + `simulate.py`** *(A: diagnose, B/Codex: simulate + scenario tests)*
- `diagnose` per PRD §8.4 (engagement_ok, attention_ok, Theil–Sen slope, flat/declining; the decision table; insufficient-data rule) and `evaluate_trial` (adopt if Δ ≥ +0.05 and n ≥ 2).
- `simulate.make_persona(name, seed)`: returns ~3 weeks of `SessionSummary`. Ship two personas:
  - **"Ada"** (attention-variable): week 1 improves on Practice Test; week 2 a fatigue spell (late-night sessions, rising drift share, shorter completion); week 3 stable attention but flat/declining probe on Practice Test, and a Feynman trial would improve it. This one carries the demo.
  - **"Ben"** (steady): rising scores → `ON_TRACK`, later `MASTERED`.
- **Scenario tests (must pass):** fatigue spell → `FATIGUE` (no method change) · gap of days → `LOW_ENGAGEMENT` · flat + good attention + mean <0.85 → `PLATEAU` · flat + mean ≥0.85 → `MASTERED` · rising → `ON_TRACK` · <3 sessions / <3 days → `ON_TRACK` + `insufficient_data`. Ada's three weeks yield FATIGUE then PLATEAU in the right order.
- ✅ Accept: the six scenarios pass; Ada's story is deterministic for a fixed seed.

**Y4 · 16:15–16:30 · `agent.py` + `predict.py`**
- `reflect(...)`: call `diagnose`, apply the PRD §8.4 action table, then ask the injected `LLM` (tier `smart`, JSON schema) for a ≤3-sentence supportive explanation from the structured evidence. **Validator**: reject any out-of-policy action (e.g. method change on FATIGUE) and fall back to a **templated explanation**; never fail the call. 
- `predict_readiness` per PRD §8.6 (shrinkage, recency weighting, LOW/MEDIUM/HIGH confidence).
- ✅ Accept: with a fake LLM that returns garbage, `reflect` still returns a valid `Reflection`; PLATEAU → `TRIAL_METHOD` with a different live method; explanation mentions the evidence (days, focus, method).
- **Cut first if late:** the LLM narration. Ship the templated explanation.

**Y5 · 16:30–17:00 · Tune + demo story + support**
- Tune thresholds on Ada/Ben until: Ada shows FATIGUE → PLATEAU → trial; the live attention intervention triggers on the induced pattern in <8 items; no flicker.
- Run the whole demo path (PRD §18) 3× with Saliha/Maxime; fix engine-side bugs only.
- Write the 3-sentence "how it learns" for the video voice-over and the Devpost write-up (honest limits: seeded data, unvalidated predictions, non-medical).
- If ahead: help Maxime with intervention UX or Saliha with the Insights page.

## Interfaces
- **You provide:** the functions in PRD §11. **You consume:** nothing from the network or DB. Saliha passes in plain data.
- **Your inputs arrive as:** `list[Event]`, `dict[int, ItemMeta]`, `Baseline`, `list[SessionSummary]`, `MethodStats`.

## Cut list (if behind)
LLM narration → exploration floor (keep Thompson) → `evaluate_trial` UI → `predict_readiness` (return `null`) → CUSUM. **Never cut:** attention intervention, `diagnose` scenarios, Ada's story.

## Your demo-readiness checklist
- [ ] `pytest backend/tests/engine` green
- [ ] Ada: FATIGUE → PLATEAU → TRIAL with a readable explanation
- [ ] Induced drift → intervention in <8 items, no flicker
- [ ] Sampler flips subject to `ADAPTIVE` after 3 rounds
- [ ] Voice-over script + honest-limits sentence ready

## ✅ Done log
*(finished task → one line: ✅ id · what · `progress.md` stamp)*
