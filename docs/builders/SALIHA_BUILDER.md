# SALIHA — Builder file: AI/ML Engine + Reflection Agent

**Read `docs/PRD.md` and `AGENTS.md` first.** This file is your task list and agent setup.

## Mission
You own the part that makes Attune more than a quiz app: the **adaptive engine** (`backend/engine/`): method-fit model, real-time attention scoring, diagnosis (tired vs absent vs plateau vs mastered), the reflection agent, readiness prediction, and the seeded personas that make the demo story reproducible. Everything is **pure Python functions**; Yehor wires them into the API.

Your two deliverables that decide the demo: **(1)** the attention engine fires a believable intervention, **(2)** the diagnosis correctly separates *fatigue* from *plateau* on seeded data and triggers a trial.

## Your agent setup

You have the most capacity, so you carry the hardest module plus one parallel stream.

| Tool | Role | Use it for |
|---|---|---|
| **Claude Enterprise** (main driver) | Stream A, main worktree | `types.py`, `attention.py`, `methodfit.py`, `diagnose.py`, `agent.py`: all the logic with judgement in it |
| **Codex Plus** | Stream B, second worktree | `simulate.py` (personas), unit tests, adversarial review of thresholds, `predict.py` first draft |
| **Claude Pro #2** | Reserve / failover | Take over when Enterprise or Codex hits a limit (write a handoff note first). Also use it late (after 16:30) for demo tuning or helping Maxime/Yehor |
| **Lovable Pro (100 credits)** | One-off async screen generator | Fire the prompts in S-L at ~14:20, go back to engine work while it builds; Maxime copies the files. Stop using it after ~14:50 |
| OpenAI / ElevenLabs / Firecrawl | You don't call these directly | The engine takes an injected `LLM`. Yehor owns the clients |

**Run two streams, no more.** Worktrees:
```bash
git worktree add ../attune-sim -b sali-engine-sim   # Stream B (Codex): simulate.py + tests; merge into sali-engine
# main checkout on sali-engine = Stream A (Claude Enterprise): logic modules
```
**Bootstrap prompt (paste as the first message to any agent working for you):**
> Read `AGENTS.md`, `docs/PRD.md` (§8, §11, §13) and `docs/builders/SALIHA_BUILDER.md` fully. I'm Saliha. You work only in `backend/engine/**` and `backend/tests/engine/**`. Reply in ≤5 lines with: your scope, the interfaces you must match (PRD §11 "Engine ↔ backend interface"), and your first task. Then start. Commit after each task. Keep engine functions pure (no I/O, no network).

**Failover:** when an agent says it's near a limit → say "handoff" → it appends to `docs/handoff/SALIHA.md` → open the next tool with the bootstrap prompt. Don't wait for the limit to fully hit.

**Before 14:15:** check quota on Enterprise, Pro, and Codex so you know which stream to give the bulk to.

## Ownership
`backend/engine/**`, `backend/tests/engine/**`. **Don't touch** `backend/app/**` (Yehor) or `frontend/**` (Maxime). Requests go on the `progress.md` Open board as a 📨 row (CLAUDE.md §2a).

## ▶ Current tasks (in order)

**S0 · 14:15–14:35 · Types first** *(unblocks Yehor)*
- `engine/types.py`: Pydantic models for everything in PRD §11 that the engine touches (`Method`, `Plan`, `AttentionReading`, `Intervention`, `Reflection`, `Decision`, `Readiness`, …) **plus** internals: `Event`, `ItemMeta`, `Baseline`, `MethodStats{alpha,beta,n}`, `SessionSummary{session_id, ts, method, mode, probe_score, delayed_score?, active_minutes, completion, felt_rating, drift_share, lapse_share, gap_days_before, hour_of_day, is_seeded}`, `SubjectCtx`, `Diagnosis{name, evidence}`, `TrialOutcome{adopt, delta, n}`, and the `LLM` Protocol (`complete_json(system, user, schema, tier)`).
- Push to `main` and tell Yehor.
- ✅ Accept: `from engine.types import *` works; models match PRD field names exactly.

**S0b · 14:35–14:50 · Stubs with correct shapes** *(unblocks vertical slice)*
- Every function in PRD §11 "Engine ↔ backend interface" exists and returns a plausible, correctly-typed result (e.g. `score_attention` → `FOCUSED`, `choose_plan` → forced round-robin, `diagnose` → `ON_TRACK`, `reflect` → templated).
- ✅ Accept: Yehor can import and call all of them. Push by **14:50**.

**S-L · 14:20 (5 min, async) · Lovable screens**
- Paste Prompt 1 and Prompt 2 below into Lovable. Let it generate while you work. At ~14:50 send Maxime the preview/repo link. He copies the components, so no two-way sync.
- Spend: aim ≤ ~40 credits; keep the rest for fixes. If output is poor at 14:50, drop it. Maxime builds by hand.

**S1 · 14:50–15:20 · `methodfit.py` + tests** *(Stream A)*
- `session_reward`, `update_stats` (Beta update with fractional reward), `choose_plan`, `confidence`. Reward weights per PRD §8.2.
- `choose_plan`: during `SAMPLING` → forced Latin-square order (rotate by `hash(subject_id)`; each round gets a different chunk of similar difficulty); in `ADAPTIVE` → Thompson sampling with exploration floor ≥15%; honour an active `TRIAL` (`trial_until`); set `session_minutes` from `focus_window` (default 20). Always fill `reason` with a human sentence ("Calibration round 2 of 3").
- Priors: practice test/active recall slightly above Feynman (prior strength ≈ 4).
- ✅ Accept: tests prove (a) sampler visits each live method once in rotated order, (b) a method with consistently higher reward becomes the most-chosen, (c) exploration floor holds, (d) plan during trial = trial method.

**S2 · 15:20–15:55 · `attention.py` + tests** *(Stream A)*
- `score_attention` per PRD §8.3: `latency_ratio = latency / expected_seconds`; CV over a window of 8 (min 5); `idle_count`, `blur_count`; z-scores vs baseline; 2-window hysteresis.
- `recommend_intervention` per the table, with a 4-min cooldown; `focus_window` = median minutes-to-first-DRIFTING over the last 5 sessions, clamped 10–45; `update_baseline`.
- **Default baseline** values are placeholders (TUNE). Mark them clearly in code.
- ✅ Accept: synthetic streams: steady → `FOCUSED`; rising/erratic latencies → `DRIFTING` within ~8 items → `EASIER`/`SWITCH_FORMAT`; persistent → `BREAK`; no flicker on a single outlier.
- **Hand to Maxime/Yehor:** the demo needs an easy way to *induce* drift (e.g. answer slowly then fast, switch tabs). Agree the trigger with Maxime at the 15:50 sync.

**S3 · 15:55–16:15 · `diagnose.py` + `simulate.py`** *(A: diagnose, B/Codex: simulate + scenario tests)*
- `diagnose` per PRD §8.4 (engagement_ok, attention_ok, Theil–Sen slope, flat/declining; the decision table; insufficient-data rule) and `evaluate_trial` (adopt if Δ ≥ +0.05 and n ≥ 2).
- `simulate.make_persona(name, seed)`: returns ~3 weeks of `SessionSummary`. Ship two personas:
  - **"Ada"** (attention-variable): week 1 improves on Practice Test; week 2 a fatigue spell (late-night sessions, rising drift share, shorter completion); week 3 stable attention but flat/declining probe on Practice Test, and a Feynman trial would improve it. This one carries the demo.
  - **"Ben"** (steady): rising scores → `ON_TRACK`, later `MASTERED`.
- **Scenario tests (must pass):** fatigue spell → `FATIGUE` (no method change) · gap of days → `LOW_ENGAGEMENT` · flat + good attention + mean <0.85 → `PLATEAU` · flat + mean ≥0.85 → `MASTERED` · rising → `ON_TRACK` · <3 sessions / <3 days → `ON_TRACK` + `insufficient_data`. Ada's three weeks yield FATIGUE then PLATEAU in the right order.
- ✅ Accept: the six scenarios pass; Ada's story is deterministic for a fixed seed.

**S4 · 16:15–16:30 · `agent.py` + `predict.py`**
- `reflect(...)`: call `diagnose`, apply the PRD §8.4 action table, then ask the injected `LLM` (tier `smart`, JSON schema) for a ≤3-sentence supportive explanation from the structured evidence. **Validator**: reject any out-of-policy action (e.g. method change on FATIGUE) and fall back to a **templated explanation**; never fail the call. 
- `predict_readiness` per PRD §8.6 (shrinkage, recency weighting, LOW/MEDIUM/HIGH confidence).
- ✅ Accept: with a fake LLM that returns garbage, `reflect` still returns a valid `Reflection`; PLATEAU → `TRIAL_METHOD` with a different live method; explanation mentions the evidence (days, focus, method).
- **Cut first if late:** the LLM narration. Ship the templated explanation.

**S5 · 16:30–17:00 · Tune + demo story + support**
- Tune thresholds on Ada/Ben until: Ada shows FATIGUE → PLATEAU → trial; the live attention intervention triggers on the induced pattern in <8 items; no flicker.
- Run the whole demo path (PRD §18) 3× with Yehor/Maxime; fix engine-side bugs only.
- Write the 3-sentence "how it learns" for the video voice-over and the Devpost write-up (honest limits: seeded data, unvalidated predictions, non-medical).
- If ahead: help Maxime with intervention UX or Yehor with the Insights page.

## Lovable prompts (paste as-is)

**Prompt 1 — Onboarding + Home**
> Build a clean, calm study app UI in React + TypeScript + Tailwind + shadcn/ui, mobile-first, light and dark mode, using mocked data in `src/mock.ts` (no backend). Screens: (1) **Onboarding** wizard: step 1 "What are you studying?" — add subjects (name text input, a two-option toggle "Problem-solving / Knowledge", optional exam date); step 2 per-subject "Add your material" (textarea + file drop, show word count, warn under 900 words); step 3 "Quick calibration: 3 short rounds per subject (~6 min each) so I can learn what works for you" with a Start button. (2) **Home**: a card per subject showing name, a phase chip (Calibrating 1/3 · Adaptive), a one-line "Next: Active Recall · 15 min — why: Calibration round 1 of 3", a large primary "Start session" button, and a small readiness bar. Keep it uncluttered: the primary action must be obvious. Export each screen as its own component in `src/pages/`.

**Prompt 2 — Insights + Dev panel**
> Using the same stack and mocked data, add (1) an **Insights** page for one subject: a bar chart comparing three study methods (Active Recall, Practice Test, Feynman) with credible-interval error bars and an "Early read / Moderate / High" confidence badge; a line chart of probe score over time per method; a stacked bar per session showing focused/drifting/lapsed share; a timeline of events (Sampler done, Break, Recalibration, Trial start/end); a readiness card with two gauges (Performance, Understanding) and a confidence label; and a "Reflections" list of cards (diagnosis chip, plain-language explanation, decision). Use Recharts. (2) A hidden **/dev** page with buttons: Seed demo persona, Advance 7 days, Force reflection, Reset — plus a visible "Demo data" badge. Types for all mock data are in the block I paste next: *(paste the TypeScript block from PRD §11)*.

## Interfaces
- **You provide:** the functions in PRD §11. **You consume:** nothing from the network or DB. Yehor passes in plain data.
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
