# Attune — Product Requirements Document

*Working title. v0.1 · 7 Nov 2026 · Hackathon MVP (build 14:15–17:00, record + submit 17:00–18:00)*

> **Tagline:** The study app that works out *how you* learn, and keeps checking.

---

## 0. NOW (decisions in force, pending, active tasks)
*Mirror of the top of `CLAUDE.md`/`AGENTS.md`. Volatile status lives in `progress.md` → 📊 Latest.*

**Decisions in force**
- Stack per §12; architecture per §9; `engine/` stays pure (no I/O).
- Roles (team confirmed 14:40, swapped from the v0.1 draft): **Saliha backend + DB + LLM/voice services** · **Maxym frontend + voice UI** · **Yehor AI/ML engine + data (personas, DB tables `app/db.py`, ingestion `app/ingest.py`) + reflection agent**. ElevenLabs "Sam" agent: Maxym (M0).
- Repo `saliha006/Great-Uni-Hack-2026`. Docs live on the **`context` branch** only (`AGENTS.md` = `CLAUDE.md`, this PRD in `docs/`, briefs in `docs/builders/`, `docs/handoff/`), never merged to `main`. `main` holds code, `progress.md` and `README.md`. Role branches: `sali-backend`, `maxym-frontend`, `yehor-ml-data`.
- Keys only in each machine's git-ignored `.env`. OpenAI and ElevenLabs usage is tracked: spend only on what the demo needs (§13 guards).
- §11 API contract is **locked from 14:45**; changes need all three and go under "Contract changes" (bottom).
- Cross-person requests: 📨 row on the `progress.md` Open board. Agent failover notes: `docs/handoff/<NAME>.md`.

- **Backend design (Saliha, 15:30):** demo subject runs on a committed hand-reviewed question bank; live LLM only for grading + reflection narration; fixtures/templates are the fallback; PDF, Firecrawl and Lovable cut; seeded rows labelled `[Demo data]` (no contract change); Feynman score = covered key points / total.

**Pending** (not decided): §19 open questions · doc owner (assumed Saliha) · team name · Maxym/Yehor GitHub handles.

**Active tasks:** Phase 0 (14:15–14:40, §17): Saliha S0 collaborators + stub API (repo done) · Yehor Y0/Y0b types + stubs · Maxym M0 scaffold + ElevenLabs agent.

---

## 1. Overview

**One-liner.** Attune finds the study method that actually works for each student, per subject, and watches their attention in real time so sessions adapt to them instead of the other way round. When progress stalls, an agent works out *why* (tired, absent, or the method stopped working) and runs a small experiment to fix it.

**Problem.**
- Most students, including at university, never find out which study method works for them. They default to rereading and highlighting, which research rates as low-utility.
- Students who do work it out study far more efficiently, but they got there by years of trial and error.
- Students with variable attention (including students with ADHD) lose focus in bursts, not on a schedule. Fixed 25/50-minute timers and one-size-fits-all methods don't fit them.

**Core insight: method fit, not "learning styles".** We do *not* claim people are visual/auditory learners. Evidence-based methods (active recall, practice testing, self-explanation/Feynman, spaced practice) work for almost everyone, but *how well each works varies by person, subject and attention state*. Attune measures that fit with controlled mini-experiments instead of asking people to self-diagnose.

**Positioning.** *Attention-aware*, not medical. We never diagnose, detect or treat ADHD and make no clinical claims. We adapt to observable behaviour (response patterns, focus window) for **any** student; ADHD-friendliness is a design target, not a label.

## 2. Goals, non-goals, principles

**Goals (MVP)**
1. Per-subject **Method Sampler** that measures which of 3 methods works best for the user, using a common yardstick.
2. **Real-time attention engine** that detects drift/lapse from behaviour and intervenes (ease difficulty, switch format, break, wrap up).
3. **Self-evaluating agent loop**: after every session (cheap update) and weekly or on plateau (reflection), diagnose and act, then check whether the action worked.
4. **Voice Feynman** sessions via ElevenLabs: the user teaches a curious AI student.
5. **Frictionless**: onboarding once per subject, then one tap to start the next, already-chosen session.
6. A **demo-ready** story that runs end-to-end 3 times in a row.

**Non-goals (MVP)**
- Diagnosing or screening for ADHD; medical claims; treatment.
- Auth/accounts, payments, mobile app, multi-user.
- All 5 methods live (3 live; 2 in the schema and roadmap).
- Training a model on external datasets (post-MVP).
- Claiming grade prediction. We show a *readiness estimate* until validated against real results.

**Principles**
- Frictionless by default. Every extra tap needs a reason.
- Measure, don't ask. Self-reported preference is a minor signal (people favour easy methods, and fluency is not learning).
- Transparent. Every adaptation comes with a one-line "why".
- Honest. Synthetic/seeded data is labelled as such.
- Privacy-light. Attention telemetry is sensitive: store the minimum, never sell, delete on request (post-MVP, note in write-up).

## 3. Users

**Primary:** university students (UK first), 18–25, taking several subjects, often cramming, many with attention that comes in bursts.

**Persona — Sam.** 2nd-year CS student, 4 modules, exams in 6 weeks. Rereads slides, highlights, feels busy but not confident. Loses focus unpredictably, then spirals into guilt. Wants to study *less but better* and doesn't want yet another app to configure.

**Jobs to be done:** "Tell me what to do right now." · "Tell me if my way of studying is working." · "Don't make me feel bad when I drift."

## 4. Glossary

| Term | Meaning |
|---|---|
| **Method** | A study technique: `ACTIVE_RECALL`, `FEYNMAN`, `PRACTICE_TEST` (live); `SPACED_FLASHCARDS`, `BLURTING` (roadmap) |
| **Chunk** | A ~300-word slice of the user's material; sessions run on one chunk |
| **Session** | One study block on one chunk with one method |
| **Standard Probe** | 5 short items on the session's chunk, **same format whatever the method**, graded identically. This is the common yardstick |
| **Delayed probe** (P1) | 3 items from a previous session's chunk, asked at the start of a later session: a real retention measure |
| **Method Sampler** | Onboarding experiment: one short session per live method per subject, counterbalanced |
| **Method fit** | Posterior estimate of how well a method works for this user in this subject |
| **Attention state** | `FOCUSED` / `DRIFTING` / `LAPSED`, relative to the user's *own* baseline |
| **Focus window** | The user's typical minutes before drift starts; sets session length |
| **Diagnosis** | Why progress is as it is: `ON_TRACK` / `MASTERED` / `LOW_ENGAGEMENT` / `FATIGUE` / `PLATEAU` |
| **Trial** | A time-boxed switch to the second-best method to test whether it fixes a plateau |
| **Reflection** | The agent's logged diagnosis + decision + plain-language explanation |

## 5. Study methods (MVP)

| Method | How it runs | Per-item LLM cost |
|---|---|---|
| **Active Recall** (`ACTIVE_RECALL`) | Prompt → user types answer from memory → reveal model answer → 1-tap self-grade (got it / partly / missed) | None (self-grade) |
| **Practice Test** (`PRACTICE_TEST`) | Timed mixed items (MCQ + short answer for KNOWLEDGE, problems for PERFORMANCE). MCQ graded instantly; short answers graded in one batch at the end | 1 batch call |
| **Feynman** (`FEYNMAN`) | Voice conversation: user explains the chunk to "Sam", a curious AI student (ElevenLabs agent) who asks naive follow-ups and never explains. Transcript graded at end against the chunk's key points | 1 call (transcript) |

*Roadmap:* `SPACED_FLASHCARDS` (FSRS scheduling), `BLURTING` (write everything you remember, then diff against source).

**Subject kinds.** Set at onboarding (one toggle):
- `PERFORMANCE` (maths, coding, anything solved): probe items are problems; primary score = correctness (and time).
- `KNOWLEDGE` (languages, theory, humanities): probe items are recall/explain; primary score = recall accuracy.

We report **both** `performance` and `understanding` in the readiness estimate; the subject kind decides which is primary and which item formats appear.

## 6. Features & requirements

**P0: must work in the demo**

| ID | Feature | Acceptance |
|---|---|---|
| F1 | Create subject (name, kind, optional exam date) + add material (paste text or upload PDF/txt) | Subject appears with ≥3 chunks |
| F2 | Method Sampler: 3 short sessions per subject, counterbalanced chunk/method order | After 3 sessions, `phase` flips to `ADAPTIVE`, best method named |
| F3 | Session runner for Active Recall + Practice Test + Feynman (voice, typed fallback) | Each completes and ends in a Standard Probe |
| F4 | Standard Probe + 1–5 "how did that feel" rating | Probe score + reward stored; method stats update |
| F5 | Attention telemetry + engine + ≥1 visible intervention (break or easier/shorter) | Induced slow/erratic answers trigger intervention within ~8 items |
| F6 | Home: per-subject card with pre-chosen next session and "Start" button | One tap from home to first item |
| F7 | Reflection agent: diagnose + act + explain, on plateau or manual trigger | Seeded plateau → `PLATEAU` → trial of second-best method with explanation |
| F8 | Insights page: method-fit comparison, attention-by-session, timeline of recalibrations, readiness | Renders from seeded + live data |
| F9 | Dev panel `/dev`: seed demo persona, advance N days, force reflection, reset | Demo story reproducible in <30s |

**P1: if time**
- F10 Delayed probe at start of next session (true retention signal; feeds reward).
- F11 In-session difficulty adaptation (items get easier/harder from correctness + attention).
- F12 Weekly auto-reflection on `advance-days`.
- F13 Firecrawl "paste a URL" as material source.
- F14 Trial evaluation UI ("Trial result: kept / reverted").

**P2: stretch / roadmap:** FSRS spaced flashcards, BLURTING, auth + Postgres, deploy, calendar/exam-date prioritisation, pretraining retention priors on open spaced-repetition data.

## 7. User flows

### 7.1 Onboarding (once per subject)
```
Open app → "What are you studying?" (add subjects: name + [Problem-solving | Knowledge] + exam date?)
 → Add material per subject (paste / upload)            [≥ ~900 words, else warn]
 → "Quick calibration: 3 short rounds (~6 min each) so I can learn what works for you"
 → For each subject: Round 1 → probe → "how did that feel?" → Round 2 → ... → Round 3
 → Result card: "For Data Structures, Practice Testing works best for you (early read). Feynman is close."
 → Home
```
Rounds may be split across days; the user can start any subject's next round from Home. Order is counterbalanced and each round uses a *different* chunk of similar difficulty, so method isn't confounded with chunk.

### 7.2 Daily loop (after calibration)
```
Home (subject cards, each shows "Next: Active Recall · 15 min")
 → Tap Start → session runs with telemetry
     → attention engine reads events every answer/5s
     → if DRIFTING/LAPSED → intervention (ease / switch format / break / wrap up)
 → Standard Probe (5 items) → "how did that feel?" (1 tap)
 → Result: "Probe 4/5 · you were focused for 17 of 20 min" (+ reflection card if one fired)
```
No dashboard on the critical path. Insights is one tap away but optional.

### 7.3 Recalibration (agent loop)
```
After each session:  update method stats + attention baseline (deterministic, instant)
Weekly OR plateau trigger:  diagnose(history)
   ON_TRACK        → keep plan
   MASTERED        → raise difficulty / next chunk
   LOW_ENGAGEMENT  → ease back in (short 5-min session), no method change
   FATIGUE         → shorter sessions / earlier breaks, no method change
   PLATEAU         → 7-day TRIAL of second-best method
 → Reflection logged + shown ("Your scores flattened for 5 days while you stayed focused. Let's try Feynman for a week.")
 → At trial end: compare trial probe mean vs prior window → adopt or revert
```

## 8. Adaptive engine specification

> All numeric thresholds marked **(TUNE)** are starting guesses, to be tuned on seeded personas. Do not present them as research-derived.

### 8.1 Measurement design (the part that makes this real)
- **Common yardstick.** Method scores are never compared using the method's own in-session score (a Feynman rating and a quiz score aren't comparable). Every session ends with the **Standard Probe**: 5 items on that chunk, same format and rubric for all methods.
- **Retention beats performance.** Immediate probes flatter methods that leave facts in short-term memory. When a delayed probe exists (P1), `retention = delayed_score`, else `immediate_score`. The write-up must state this limitation.
- **Chunk control.** Sampler uses 3 chunks of similar estimated difficulty in a Latin-square order across subjects.
- **Efficiency.** `efficiency = retention / max(active_minutes, 1)`, normalised per user: *learning per minute*, which is the "saves time" selling point.
- **Felt rating is a minor signal.** Users prefer easier methods that often teach less. Weight is small and used mainly as a tiebreak and engagement signal.

### 8.2 Reward and method-fit model
```
retention  = delayed_score if available else probe_score          # 0..1
eff_norm   = sigmoid((efficiency - user_median_efficiency) / scale)   # 0..1
felt_norm  = (felt_rating - 1) / 4
reward     = 0.60*retention + 0.25*eff_norm + 0.15*felt_norm       (TUNE)
```
- Per (subject, method): `Beta(alpha, beta)`; update `alpha += reward; beta += 1 - reward`.
- **Priors** (cold start) from literature: practice testing and active recall get slightly higher prior means than Feynman/self-explanation (see §13). Prior strength ≈ 4 pseudo-sessions (TUNE), so data takes over quickly.
- **Selection:** Thompson sampling with an exploration floor (≥15% of sessions go to a non-best method, TUNE). During `SAMPLING` phase, selection is forced round-robin (Latin square).
- **Confidence label:** `EARLY` (<2 sessions/method), `MODERATE` (2–4), `HIGH` (≥5 and non-overlapping credible intervals).

### 8.3 Attention engine (real time)
Signals per session (all client-measured, sent as events): item shown/answered timestamps, per-item latency, tab blur/focus, idle gaps (>30 s no input), voice turn timestamps (Feynman).

Features over a sliding window of the last 8 answered items (min 5):
- `latency_ratio` = latency / `expected_seconds` for that item (controls for item length/difficulty).
- `latency_cv` = coefficient of variation of `latency_ratio` (intra-individual response-time variability, the best-supported attention-lapse proxy in the ADHD literature; see §13 for limits).
- `idle_count`, `blur_count` in window; error streak.

State (relative to the user's **own baseline**, learned over their first ~2 sessions; defaults used before then):
```
z_cv   = (latency_cv   - baseline_cv)    / baseline_cv_sd
z_lat  = (latency_ratio - baseline_ratio) / baseline_ratio_sd
FOCUSED  : z_cv < 1 and z_lat < 1 and idle_count == 0 and blur_count <= 1
DRIFTING : z_cv >= 1 or z_lat >= 1 or blur_count >= 2 or idle_count == 1     (TUNE)
LAPSED   : z_cv >= 2 or z_lat >= 2 or idle_count >= 2 or (error_streak >= 3 and rising latency)
```
- **Hysteresis:** state changes only after 2 consecutive windows agree (stops flicker).
- **Intervention policy** (cooldown 4 min between interventions, TUNE):

| Condition | Intervention |
|---|---|
| First `DRIFTING` | `EASIER` (drop difficulty one step) or `SWITCH_FORMAT` (e.g. MCQ → short recall) |
| `DRIFTING` persists 2 windows | `BREAK` (3 min, 5 if second break) |
| `LAPSED` | `BREAK` immediately |
| Elapsed ≥ focus window and not FOCUSED | `WRAP_UP` (finish current block, go to probe) |

- **Focus window:** median minutes-to-first-`DRIFTING` over the last 5 sessions, clamped 10–45; cold-start default **20 min**.
- **Not a fixed Pomodoro.** Break and session length come from the user's own pattern.

### 8.4 Diagnosis: tired vs absent vs plateau vs mastered
Evaluated per subject on the last N sessions (needs ≥3 sessions spanning ≥3 days, else `ON_TRACK` with `insufficient_data=true`). Features per session: `probe_score`, `active_minutes`, `completion` (share of planned items done), `drift_share` + `lapse_share` (share of time not FOCUSED), `gap_days_before`, `hour_of_day`.

```
engagement_ok = sessions_last_7d >= 3 and mean(completion) >= 0.7 and median(gap_days) <= 3       (TUNE)
attention_ok  = median(drift_share + lapse_share) < 0.35 and not rising over last 3 sessions       (TUNE)
trend         = Theil–Sen slope of probe_score over the window
flat          = |slope| < 0.02/session ; declining = slope < -0.04                                (TUNE)
```

| Diagnosis | Condition | Action |
|---|---|---|
| `MASTERED` | flat/rising **and** mean probe ≥ 0.85 | `RAISE_DIFFICULTY` / next chunk (a high plateau is success, not a problem) |
| `LOW_ENGAGEMENT` | not `engagement_ok` | `EASE_IN` (short 5-min session, no method change) |
| `FATIGUE` | `engagement_ok` but not `attention_ok` (attention degrading, completion dropping) | `SHORTEN_SESSIONS` / earlier breaks, **no method change** |
| `PLATEAU` | `engagement_ok` and `attention_ok` and (flat or declining) and mean < 0.85 | `TRIAL_METHOD`: 7 days on 2nd-best method |
| `ON_TRACK` | otherwise | `KEEP` |

Use a change-point check (CUSUM on probe score) to catch sudden drops sooner than the 3-session window.

**Trial evaluation (closes the loop):** at trial end compare mean probe in trial vs the pre-trial window of equal size; adopt if delta ≥ +0.05 and n ≥ 2 (TUNE), else revert and log. This is where the system *learns from its own decisions*.

### 8.5 Reflection agent
- Triggers: weekly (`advance-days` crossing 7 days), plateau detected after a session, or manual.
- **Decision is rule-based and validated server-side** (table above). The LLM writes the plain-language explanation from the structured evidence and may tie-break between permitted alternatives (e.g. which alternate method). It **cannot** invent actions: a validator rejects out-of-policy output and falls back to a templated explanation.
- Every reflection is logged (`reflections` table) with its evidence. The demo can show the reasoning trail.
- Be honest in the pitch: this is a closed observe → diagnose → act → evaluate loop with an LLM narrator, not a self-modifying model.

### 8.6 Readiness prediction
```
performance   = recency-weighted mean of probe scores from PRACTICE_TEST sessions and problem items
understanding = recency-weighted mean of FEYNMAN scores and free-recall probe items
each shrunk toward 0.5 by n/(n+3); confidence LOW/MEDIUM/HIGH from n and recency
```
Shown as "Readiness" with confidence, never as a predicted grade. The write-up lists validating against real exam results as the first post-MVP experiment.

### 8.7 Cold start
- Week 1 value comes from the **Sampler** (a decision after ~3 short sessions) and **evidence-based defaults**, not from personalised ADHD models.
- Attention thresholds start from placeholders and personalise to the user's baseline after ~2 sessions.
- There is no public ADHD study-retention dataset we could find (see §13). Personalisation comes from *each user's own data*, collected from day one.

## 9. System architecture

```
┌────────────────────────── Browser (React) ──────────────────────────┐
│ Onboarding · Home · Session runner · Feynman (ElevenLabs React SDK) │
│ Telemetry hook (latency, blur, idle) · Insights · /dev panel        │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │ REST (JSON)                   │ WebRTC/WS (audio) — signed URL
                ▼                               ▼
┌──────────────────────── FastAPI backend ───┐  ┌──────────────────┐
│ app/ (API, DB, LLM service, ingestion)     │  │ ElevenLabs Agent │
│   ├─ sessions flow ─────► engine/ (pure Py)│  │ "Sam" student    │
│   ├─ llm.py (OpenAI; cache/fixtures modes) │  └──────────────────┘
│   └─ voice: signed-url, transcript grading │
│ engine/: attention · methodfit · diagnose  │
│          agent (reflection) · predict · sim│
└───────────────┬────────────────────────────┘
                ▼
        SQLite (SQLModel) — Postgres/Supabase post-MVP
```

**Key design decisions**
- `engine/` is **pure Python functions over typed data**, no I/O, no framework. It can be unit-tested and simulated without the UI. The LLM is *injected* (a `complete_json` interface), so the engine doesn't depend on any provider.
- Frontend **never** holds OpenAI/ElevenLabs keys. Backend mints ElevenLabs signed URLs and proxies LLM calls.
- **SQLite file** for the hackathon: zero setup, deterministic seeding on each machine.
- **Session data flow:** `POST /sessions` → engine picks method/mode/length → backend serves items (LLM-generated and cached per chunk+method) → client sends answers + telemetry events → engine returns attention reading + intervention → `finish` returns probe → `probe` answers update stats + may trigger reflection.

**Repo layout**
```
attune/
  AGENTS.md  CLAUDE.md                 # identical; agent instructions (root)
  docs/PRD.md  docs/builders/{MAXYM,SALIHA,YEHOR}_BUILDER.md  docs/handoff/
  backend/app/        # Saliha — FastAPI, DB, LLM service, ingestion, voice
  backend/engine/     # Yehor  — attention, methodfit, diagnose, agent, predict, simulate, types
  backend/tests/
  frontend/           # Maxym — Vite + React + TS (Insights page: Saliha)
  scripts/            # seed/dev helpers
  .env.example
```

## 10. Data model (SQLModel / SQLite)

| Table | Key fields |
|---|---|
| `users` | id, name (single demo user for MVP) |
| `subjects` | id, user_id, name, kind, exam_date, phase |
| `materials` | id, subject_id, title, source (`paste`/`pdf`/`url`) |
| `chunks` | id, subject_id, material_id, idx, text, key_points_json, difficulty_est |
| `sessions` | id, subject_id, chunk_id, method, mode, planned_minutes, started_at, ended_at, active_minutes, completion, probe_score, delayed_score, felt_rating, reward, is_seeded |
| `items` | id, session_id, kind, phase, prompt, options_json, answer_key, rubric, difficulty, expected_seconds |
| `responses` | id, item_id, session_id, answer, score, latency_ms, ts |
| `events` | id, session_id, type, ts, item_id, latency_ms, payload_json |
| `method_stats` | subject_id, method, alpha, beta, n, last_updated |
| `attention_baselines` | user_id, baseline_ratio, baseline_ratio_sd, baseline_cv, baseline_cv_sd, focus_window_min, updated_at |
| `plans` | subject_id, method, mode, session_minutes, trial_until, reason |
| `reflections` | id, subject_id, ts, trigger, diagnosis, evidence_json, decision_json, explanation |
| `llm_usage` | id, ts, purpose, model, prompt_tokens, completion_tokens, cache_hit |

`is_seeded` marks synthetic rows. The UI and write-up must make clear that the multi-week history in the demo is seeded.

## 11. API contract (FROZEN after 14:45)

Base path `/api`. JSON. Optional header `X-User-Id` (default `demo`). Backend publishes OpenAPI at `/openapi.json`; frontend generates types with `npx openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.d.ts`. The TypeScript below is the human-readable source of truth; backend Pydantic models must match field-for-field.

```ts
type Method = 'ACTIVE_RECALL'|'FEYNMAN'|'PRACTICE_TEST'|'SPACED_FLASHCARDS'|'BLURTING';
type SubjectKind = 'PERFORMANCE'|'KNOWLEDGE';
type Phase = 'SAMPLING'|'ADAPTIVE';
type SessionMode = 'SAMPLER'|'ADAPTIVE'|'TRIAL';
type AttentionStateName = 'FOCUSED'|'DRIFTING'|'LAPSED';
type InterventionType = 'NONE'|'EASIER'|'SWITCH_FORMAT'|'BREAK'|'WRAP_UP';
type DiagnosisName = 'ON_TRACK'|'MASTERED'|'LOW_ENGAGEMENT'|'FATIGUE'|'PLATEAU';
type Confidence = 'EARLY'|'MODERATE'|'HIGH';

interface Subject { id:number; name:string; kind:SubjectKind; exam_date?:string|null; phase:Phase }
interface Plan { method:Method; mode:SessionMode; session_minutes:number; trial_until?:string|null; reason:string }
interface MethodStatView { method:Method; n:number; mean_reward:number; ci_low:number; ci_high:number }
interface Readiness { performance:number|null; understanding:number|null; confidence:'LOW'|'MEDIUM'|'HIGH' }
interface SubjectState {
  subject:Subject;
  sampler:Record<string,{done:boolean; probe_score?:number}>;   // keyed by Method
  method_stats:MethodStatView[]; plan:Plan; readiness:Readiness|null;
  focus_window_min:number; confidence:Confidence;
}
interface Session { id:number; subject_id:number; method:Method; mode:SessionMode; planned_minutes:number; chunk_id:number; reason:string }
interface Item {
  id:number; kind:'RECALL_PROMPT'|'MCQ'|'SHORT_ANSWER'|'PROBLEM'|'FEYNMAN_BRIEF';
  phase:'MAIN'|'PROBE'|'WARMUP_PROBE'; prompt:string; options?:string[];
  difficulty:1|2|3|4|5; expected_seconds:number; hint?:string;
}
interface AnswerBody { item_id:number; answer:string; latency_ms:number; self_grade?:0|0.5|1 }   // self_grade for ACTIVE_RECALL
interface AnswerResult { score:number; correct?:boolean|null; feedback?:string; reveal?:string }
type EventType = 'ITEM_SHOWN'|'ITEM_ANSWERED'|'TAB_BLUR'|'TAB_FOCUS'|'IDLE'|'BREAK_START'|'BREAK_END'|'VOICE_TURN';
interface SessionEvent { type:EventType; ts:string; item_id?:number; latency_ms?:number; payload?:Record<string,unknown> }
interface AttentionReading { state:AttentionStateName; latency_cv:number|null; latency_ratio:number|null; idle_count:number; blur_count:number; window_n:number }
interface Intervention { type:InterventionType; message:string; break_seconds?:number; new_difficulty?:number }
interface EventsResult { attention:AttentionReading; intervention:Intervention }
interface FeynmanTurn { role:'user'|'agent'; text:string; ts:string }
interface FeynmanResult { score:number; covered:string[]; gaps:string[]; feedback:string }
interface SessionResult { probe_score:number; active_minutes:number; efficiency:number; reward:number; subject_state:SubjectState; reflection?:Reflection|null }
interface Decision { action:'KEEP'|'TRIAL_METHOD'|'SHORTEN_SESSIONS'|'EASE_IN'|'RAISE_DIFFICULTY'; method?:Method; trial_days?:number; session_minutes?:number }
interface Reflection { id:number; ts:string; trigger:'WEEKLY'|'PLATEAU'|'MANUAL'; diagnosis:DiagnosisName; evidence:Record<string,unknown>; decision:Decision; explanation:string }
interface Insights {
  method_series:Record<string,{ts:string; probe_score:number}[]>;
  attention_by_session:{session_id:number; ts:string; method:Method; drift_share:number; lapse_share:number}[];
  timeline:{ts:string; kind:'RECALIBRATION'|'BREAK'|'TRIAL_START'|'TRIAL_END'|'SAMPLER_DONE'; label:string}[];
  readiness_series:{ts:string; performance:number|null; understanding:number|null}[];
}
```

| # | Method & path | Body → Response |
|---|---|---|
| 1 | `POST /subjects` | `{name, kind, exam_date?}` → `Subject` |
| 2 | `GET /subjects` | → `{subject:Subject; plan:Plan; readiness:Readiness\|null}[]` |
| 3 | `POST /subjects/{id}/material` | `{title?, text?}` or multipart `file` (P1: `{url}`) → `{material_id, chunk_count}` |
| 4 | `GET /subjects/{id}/state` | → `SubjectState` |
| 5 | `POST /sessions` | `{subject_id, method?}` (server decides if omitted) → `Session` |
| 6 | `GET /sessions/{id}/next-item` | → `Item` or `{done:true}` |
| 7 | `POST /sessions/{id}/answer` | `AnswerBody` → `AnswerResult` |
| 8 | `POST /sessions/{id}/events` | `{events:SessionEvent[]}` → `EventsResult` |
| 9 | `GET /voice/signed-url?session_id=` | → `{signed_url, context:{topic, key_points:string[], first_message}}` |
| 10 | `POST /sessions/{id}/feynman-transcript` | `{turns:FeynmanTurn[]}` → `FeynmanResult` |
| 11 | `POST /sessions/{id}/finish` | → `{probe_items:Item[]}` |
| 12 | `POST /sessions/{id}/probe` | `{answers:{item_id,answer,latency_ms}[], felt_rating:1..5}` → `SessionResult` |
| 13 | `GET /subjects/{id}/insights` | → `Insights` |
| 14 | `GET /subjects/{id}/reflections` | → `Reflection[]` |
| 15 | `POST /agent/reflect` | `{subject_id, trigger:'MANUAL'\|'WEEKLY'}` → `Reflection` |
| 16 | `POST /dev/seed` · `POST /dev/advance-days` `{days}` · `POST /dev/reset` · `GET /dev/usage` | → seed ids / `{advanced_to, reflections}` / ok / LLM usage totals |

**Engine ↔ backend interface (Python)** — Yehor owns signatures; Saliha calls them.
```python
# backend/engine/types.py defines all models + Protocol LLM
class LLM(Protocol):
    def complete_json(self, system: str, user: str, schema: dict, tier: Literal["fast","smart"]) -> dict: ...

# attention.py
def score_attention(events: list[Event], items: dict[int, ItemMeta], baseline: Baseline) -> AttentionReading
def recommend_intervention(reading: AttentionReading, ctx: SessionCtx) -> Intervention
def update_baseline(baseline: Baseline, session_events: list[Event], items: dict[int, ItemMeta]) -> Baseline
def focus_window(sessions: list[SessionSummary]) -> int
# methodfit.py
def session_reward(probe: float, delayed: float | None, active_min: float, felt: int, user_median_eff: float) -> float
def update_stats(stats: MethodStats, reward: float) -> MethodStats
def choose_plan(subject: SubjectCtx, stats: dict[Method, MethodStats], history: list[SessionSummary], rng) -> Plan
def confidence(stats: dict[Method, MethodStats]) -> Confidence
# diagnose.py
def diagnose(history: list[SessionSummary], plan: Plan) -> Diagnosis        # name + evidence dict
def evaluate_trial(history: list[SessionSummary], trial: Plan) -> TrialOutcome
# agent.py
def reflect(subject: SubjectCtx, history: list[SessionSummary], stats, plan: Plan, trigger: str, llm: LLM) -> Reflection
# predict.py
def predict_readiness(history: list[SessionSummary], kind: SubjectKind) -> Readiness
# simulate.py
def make_persona(name: str, seed: int) -> list[SessionSummary]            # seeded history for demo + tests
```

## 12. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React + TypeScript + Tailwind + shadcn/ui + React Router + TanStack Query + Recharts | Fast, familiar, and matches Lovable's output so generated screens can be reused |
| Voice | **ElevenLabs Agents** + `@elevenlabs/react` (`useConversation`) | Real-time voice with transcripts; per-session context via overrides/dynamic variables |
| Backend | FastAPI (Python 3.11) + SQLModel + SQLite | Python for the ML engine; zero DB setup |
| Engine | Pure Python (numpy/scipy only; no heavy deps) | Testable, simulatable, no I/O |
| LLM | **OpenAI API**, behind `llm.py`, model names from env (`OPENAI_MODEL_FAST`, `OPENAI_MODEL_SMART`) | Team has a key; provider-agnostic wrapper so it's swappable |
| URL ingestion (P1) | **Firecrawl** scrape → markdown → chunks | Cheap way to bring in lecture notes / demo material (use openly licensed pages) |
| PDF (P0) | `pypdf` | Simple text extraction |
| Hosting | Local for demo; deploy only if spare time | Demo is a screen recording |

**ElevenLabs integration notes (verify against current docs; the SDK has changed recently)**
- Install `@elevenlabs/react`. The old `@11labs/*` packages are deprecated.
- Backend mints a **signed URL** via `GET https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=...` with header `xi-api-key`. The key never reaches the browser. The client calls `startSession({ signedUrl })`.
- Per-session context (topic, key points) goes in via `overrides` (prompt, firstMessage) or dynamic variables (`{{topic}}`). If overrides are rejected, check the agent's security/override settings in the ElevenLabs dashboard.
- `onMessage` yields user/agent transcript messages; collect them for grading. Mic permission is required: explain it in the UI before connecting.
- **Spend:** cap conversation length (~4–5 min) in the agent settings, and use the `textOnly` override during development.
- **Fallback:** typed Feynman via the LLM if voice isn't working by 16:15.

**Environment variables (`.env`, never committed)**
```
OPENAI_API_KEY=  OPENAI_MODEL_FAST=  OPENAI_MODEL_SMART=
ELEVENLABS_API_KEY=  ELEVENLABS_AGENT_ID=
FIRECRAWL_API_KEY=            # optional
LLM_MODE=cache                # live | cache | fixtures
LLM_MAX_CALLS_PER_SESSION=6
DATABASE_URL=sqlite:///./attune.db
```

## 13. Team, tools & spend

**Humans:** Saliha (backend API + LLM/voice services), Maxym (frontend + voice UI), Yehor (AI/ML engine + data: personas, DB tables, ingestion + reflection agent). *Confirmed by the team at 14:40; DB + ingestion moved to Yehor 14:50.*

**Resources:** ElevenLabs API · OpenAI API (key is uncapped but **spend is tracked**) · Firecrawl · Lovable Pro (100 credits, Saliha's account) · Saliha: Claude Enterprise + Claude Pro + Codex Plus · Maxym: Claude Pro + Codex Plus · Yehor: Claude Pro + Codex Plus.

**How to use all of it at once (rules of thumb)**
1. **Parallel across people, always.** Three builders on three folders.
2. **Within a person, max 2 agents at once, on disjoint files, each in its own git worktree.** More than that costs more in merge conflicts and context re-explaining than it saves in 3 hours.
3. **Sequential failover when a limit hits.** Switch tools immediately and don't wait. Before switching, ask the outgoing agent to append a status note to `docs/handoff/<NAME>.md` (done / in progress / next step / gotchas) so the incoming agent starts warm.
4. **Match the tool to the task.** Use the strongest Claude for design and tricky logic (engine, state machines, integrations), and Codex or the second stream for volume (CRUD, boilerplate, tests, UI polish, README).
5. **Spend the big allowance first.** Saliha: Enterprise is the main driver; run Codex as the second concurrent stream; open Claude Pro #2 only when one of those is limited. Nobody has visibility into remaining quota from here, so everyone checks their usage page at 14:15.
6. **Lovable = optional accelerator for 3–4 screens only** (Onboarding/Home, Insights, Dev panel), with mocked data. Don't use it for the session runner or telemetry. Copy its component files into `frontend/`. Don't two-way sync after 14:50.
7. **Firecrawl = P1** (URL → material) and quick demo content.

**LLM spend guards (the OpenAI key is tracked)**
- `LLM_MODE=cache` in dev: disk cache keyed by prompt hash, so repeated runs cost nothing. `fixtures` returns canned JSON for UI work with zero spend. `live` only for final checks/demo.
- Small/fast model for item generation and grading; larger model only for reflection explanations.
- Structured JSON outputs, `max_tokens` set on every call.
- **Batch**: generate 8 items per chunk+method in one call and cache; grade all short answers in one call; one call per Feynman transcript; one per reflection.
- No per-keystroke or per-event LLM calls. Active Recall uses self-grading, so zero LLM calls per item.
- Expect ≈2–3 LLM calls per session. `llm_usage` table + `GET /dev/usage` make spend visible. Hard cap: `LLM_MAX_CALLS_PER_SESSION`.
- Pre-generate demo-subject content once and keep it cached.

## 14. Evidence base (what we found, and what we didn't)

- **Study methods.** A major review of ten learning techniques (Dunlosky et al., 2013) rated practice testing and distributed practice as high-utility, self-explanation, elaborative interrogation and interleaving as moderate, and rereading, highlighting and summarisation as low. This supports shipping evidence-based methods rather than "styles". The *Feynman technique* isn't one of the ten; self-explanation is its nearest relative. Don't claim Feynman is proven superior. The **point** of Attune is to measure per person.
- **Attention signal.** A meta-analysis of 319 studies (Kofler et al., 2013) found greater response-time variability in ADHD than in typically developing groups (effect size ~0.76 for children/adolescents, ~0.46 for adults), and also that RT variability is not specific to ADHD. A review (Tamm et al., 2012) interprets it as reflecting occasional attention lapses. So RT variability is a defensible *lapse proxy*, but (a) it's group-level, not an individual diagnostic, (b) the studies use lab tasks of a few minutes, so transfer to study-app answer latency is an **assumption we must validate**, and (c) we use it relative to each user's own baseline, for any student, non-diagnostically.
- **Time-on-task.** One study (Johnson et al., 2007) found an impaired ADHD subgroup slowed progressively over a 5.5-minute task. This supports watching *trend within a session*, not just absolute speed.
- **Data.** We found **no public dataset of ADHD students' study-session retention**. Closest: `open-spaced-repetition/anki-revlogs-10k` (~727M reviews, 10k Anki users) and `FSRS-Anki-20k` (~1.7B reviews, 20k users): large, general-population forgetting-curve data, not ADHD-labelled and self-selected. Licence: research use, **don't redistribute**, link only. Post-MVP use: forgetting-curve priors and FSRS scheduling. **MVP uses none of it**; our "historical data" is the user's own sessions plus seeded personas.

**Sources**
- Dunlosky et al. (2013), *Improving Students' Learning With Effective Learning Techniques* — https://doi.org/10.1177/1529100612453266
- Kofler et al. (2013), *Reaction time variability in ADHD: a meta-analytic review of 319 studies* — https://stars.library.ucf.edu/facultybib2010/4230
- Tamm et al. (2012), *Reaction Time Variability in ADHD: A Review* — https://pubmed.ncbi.nlm.nih.gov/22930417/
- Johnson et al. (2007), *Response variability in ADHD* — https://www.tara.tcd.ie/items/e9dd9975-0eec-4d73-8e7a-ee453ca7921b
- Anki revlogs 10k — https://huggingface.co/datasets/open-spaced-repetition/anki-revlogs-10k · SRS benchmark — https://github.com/open-spaced-repetition/fsrs-benchmark
- ElevenLabs React SDK — https://elevenlabs.io/docs/conversational-ai/libraries/react

## 15. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Cold start** (no history) | Sampler gives a decision in ~3 short rounds; literature-based priors; baselines personalise after ~2 sessions; label results `EARLY` |
| **Ground truth**: do probes predict real grades? | State plainly it's unvalidated; first post-MVP experiment = correlate probe/readiness with real exam results |
| **Immediate vs delayed probe** | Immediate probes flatter short-term memory; add delayed probe (F10); disclose |
| **Perceived ≠ actual effectiveness** | Felt rating weight is small; decision driven by probe results |
| **n=1 per method in the Sampler is noisy** | Frame as "early read", keep exploring (≥15%), never claim certainty |
| **LLM grading noise** | MCQ deterministic; rubric-based short-answer grading at temp 0; batch; key-points-based Feynman rubric |
| **Voice latency / failure / cost** | Cap duration; `textOnly` for dev; typed fallback by 16:15 |
| **Medical/ADHD claims** | No diagnosis, no detection, no treatment claims anywhere in UI or write-up |
| **Privacy of attention telemetry** | Minimum data, local SQLite for MVP, mention deletion/consent in write-up |
| **Seeded data misrepresented** | `is_seeded` flag, "Demo data" badge in UI, say it in the video |
| **Spend overrun** | §13 guards; `GET /dev/usage` |
| **Integration pain across 3 people** | Frozen contract, stub API at 14:40, `openapi-typescript`, merge to main every ≤40 min |
| **Hackathon rules unknown to me** | Check required/sponsor APIs, originality, and team-size rules before 14:30 |

## 16. Success metrics

*Hackathon:* the demo path (§18) runs end-to-end 3× in a row; video ≤2:00; repo public/accessible with all members added.

*Product (post-MVP):* time-to-first-session <2 min · session completion rate · D7 return · **method-fit lift** (delayed-probe score of adaptive vs random assignment, A/B) · learning-per-minute vs baseline · plateau recovery rate after a trial · self-reported "I know how I study best" (pre/post).

## 17. Timeline & ownership (clock times, Sat 7 Nov)

| When | Milestone | Owner(s) |
|---|---|---|
| 14:15 | Everyone: read PRD + own builder file; check tool quotas; agents bootstrapped | All |
| 14:15–14:40 | **Phase 0: contract & scaffolding.** Repo + collaborators, stub API (fixtures), `engine/types.py` + engine stubs, Vite app + ElevenLabs agent | Saliha / Yehor / Maxym |
| **14:45** | **Sync 1: contract frozen; stub API reachable; engine stubs importable** | All |
| 14:45–15:50 | **Phase 1: vertical slice.** create subject → material → session → answer → probe → stats update (stub engine OK) | All |
| **15:50** | **Sync 2: vertical slice demo (2 min)** | All |
| 15:50–16:30 | **Phase 2: intelligence.** real attention + methodfit + diagnose + reflection; Feynman voice; interventions; Insights | Yehor / Maxym / Saliha |
| **16:30** | **FEATURE FREEZE.** Only bugs, tuning, polish after this | All |
| 16:30–17:00 | Seed demo persona, tune thresholds, rehearse demo path, README, repo hygiene | All |
| **17:00** | Development ends. Presentation hour begins | |
| 17:00–17:10 | Reset demo state; smoke test full path | Maxym + Saliha |
| 17:10–17:40 | **Record demo (≤2:00)** — 2 takes, pick best | Saliha (voice-over) + Maxym (driving UI) |
| 17:40–17:55 | Devpost: name, short write-up, video, repo link; confirm every teammate is on Devpost and a repo collaborator | Yehor + Saliha |
| **17:45** | **Target submit.** Hard deadline 18:00 | |

**Cut order if late (cut top-first):** reflection LLM narration (use template) → F11/F12/F13/F14 → delayed probe → Insights polish → Feynman voice (typed fallback) → readiness. **Never cut:** Sampler, probe, attention intervention, plateau → trial story.

## 18. Demo script (≤2:00, target 1:50) and submission checklist

| Time | Beat | On screen |
|---|---|---|
| 0:00–0:12 | **Hook.** "Most students never find out which study method works for them, and if your focus comes in bursts, fixed timers don't work either." | Title + 1 line |
| 0:12–0:35 | **Onboarding.** Add *Data Structures* (Problem-solving) → paste material → "3 quick rounds" | Onboarding |
| 0:35–0:55 | **Feynman voice.** Explain a concept to "Sam"; show live transcript; score + gaps | Voice screen |
| 0:55–1:15 | **Attention.** Answers slow/erratic (induced) → "Your pace is getting uneven. Take 3 minutes?" | Session + intervention |
| 1:15–1:30 | **Method fit.** "For this subject, Practice Testing gives you the most learning per minute." | Insights: method comparison |
| 1:30–1:52 | **Self-evaluating loop.** Dev panel: advance 2 weeks (**say "seeded demo data"**) → plateau detected, *not* tiredness → agent explains and starts a 7-day trial of Feynman | Reflection card + timeline |
| 1:52–2:00 | **Close.** "Attune: learn how you learn, and keep checking." | Logo/tagline |

**Submission checklist (Devpost)**
- [ ] Demo video ≤ 2:00, uploaded, link works logged-out
- [ ] Repo link works; **every teammate added as repo collaborator**
- [ ] **Every teammate added to the Devpost project**
- [ ] Project name + short write-up (problem, how it works, honest limits: seeded data, unvalidated predictions, non-medical)
- [ ] README: how to run in ≤5 commands; `.env.example`; no secrets in git history
- [ ] Hackathon-specific requirements (sponsor tech, categories) double-checked

## 19. Open questions

1. Hackathon name, tracks, required/sponsor tech, team-size and originality rules (affects LLM/voice choices).
2. ~~Role split~~ Answered 14:40: Saliha backend, Maxym frontend, Yehor AI/ML + data.
3. ElevenLabs quota (minutes/credits) and which voice/LLM the agent should use.
4. Which demo material do we use? Recommend something openly licensed, ~1,500 words, on one algorithms topic.

*Contract changes (append here, all three must agree):*
- *(none yet)*
