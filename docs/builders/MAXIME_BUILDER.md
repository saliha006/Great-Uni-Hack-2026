# MAXIME — Builder file: Frontend + Voice UI

**Read `docs/PRD.md` and `AGENTS.md` first.** This file is your task list and agent setup.

## Mission
You own everything the user sees and touches: onboarding, Home, the session runner for three study methods, the **telemetry** that feeds the attention engine, the **Feynman voice** screen (ElevenLabs), intervention UX, the `/dev` panel, and demo polish. The principle is **frictionless**: one tap from Home to the first question.

Your two deliverables that decide the demo: **(1)** the full session flow (start → items → probe → result) with telemetry, **(2)** the Feynman voice conversation with a typed fallback.

## Your agent setup

Claude Pro has tighter limits than Enterprise, so split by *task type* and keep both tools busy on different files.

| Tool | Role | Use it for |
|---|---|---|
| **Claude Pro** (main driver) | Stream A, main worktree | Logic-heavy parts: session state machine, `useTelemetry`, ElevenLabs integration, intervention flow |
| **Codex Plus** | Stream B, second worktree | Volume: Onboarding/Home screens, forms, shadcn styling, `/dev` panel, loading/empty/error states, mobile tweaks |
| Lovable output (from Saliha) | Optional | Copy component files for Onboarding/Home/Insights/Dev from Saliha's Lovable project at ~14:50 (if good). Don't two-way sync |

```bash
git worktree add ../attune-ui -b maxime-frontend-ui   # Stream B (Codex): screens + polish; merge into maxime-frontend
# main checkout on maxime-frontend = Stream A (Claude Pro): runner, telemetry, voice
```
**Front-end skills** *(added 14:40 by Saliha)*: after syncing `context`, run `mkdir -p .claude/skills && cp -r docs/skills-frontend/* .claude/skills/` so your agents can use `design-direction`, `ui-audit`, `motion`, `motion-review`, `frontend-performance` and `reverse-engineer-ui`.

**Bootstrap prompt (first message to any agent working for you):**
> Read `AGENTS.md`, `docs/PRD.md` (§5, §7, §8.3, §11, §12, §18) and `docs/builders/MAXIME_BUILDER.md` fully. I'm Maxime. You work only in `frontend/**` (never `frontend/src/pages/Insights.tsx` or `components/insights/**`, which Saliha owns). Use generated types from `/openapi.json` (`npx openapi-typescript`). Reply in ≤5 lines: scope, the endpoints you'll call, and your first task. Then start. Commit after each task.

**Failover:** if Claude Pro hits its limit, say "handoff" → agent appends to `docs/handoff/MAXIME.md` → Codex takes the main seat with the same bootstrap prompt (and vice-versa). Because Pro is the tighter budget, give it **only the hard parts** and let Codex do volume from the start.

**Before 14:15:** check your Claude and Codex usage pages so you know your headroom.

## Ownership
`frontend/**` except Saliha's Insights files. **Don't touch** `backend/**`. You never hold API keys: the backend does that.

## ▶ Current tasks (in order)

**M0 · 14:15–14:40 · Scaffold + ElevenLabs agent** 
- `npm create vite@latest frontend -- --template react-ts`; add Tailwind, shadcn/ui, React Router, TanStack Query, Recharts. Routes: `/` (Home), `/onboarding`, `/session/:id`, `/insights/:subjectId`, `/dev`.
- API client: when Saliha's stub is up (~14:40), run `npx openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.d.ts`; wrap with a thin typed `api.ts`. Base URL via `VITE_API_URL`.
- **ElevenLabs dashboard:** create the agent "Sam" (prompt below), set max conversation length ~4–5 min, pick a cheap/fast LLM and a calm voice, enable overrides if needed. Send `ELEVENLABS_AGENT_ID` to Saliha, who adds it to `.env`.
- ✅ Accept: app runs; `GET /api/subjects` renders from the stub.

**M1 · 14:40–15:10 · Onboarding + Home** *(delegate to Codex / Lovable files)*
- Onboarding wizard per PRD §7.1 (subjects with Problem-solving/Knowledge toggle + exam date; material paste/upload; calibration explainer). Home: subject cards with phase chip, "Next: {method} · {minutes} min — {reason}" from `plan`, big **Start session** button, small readiness bar.
- ✅ Accept: create 2 subjects with material; Home shows cards; **Start** calls `POST /sessions` and routes to `/session/:id`.

**M2 · 15:10–15:50 · Session runner + telemetry** *(Claude, main)*
- State machine: `LOADING → ITEM → (feedback) → ITEM … → BREAK? → PROBE → FELT_RATING → RESULT`. Fetch via `next-item`; post via `answer`.
- Renderers: **Active Recall** (type answer → `answer` returns `reveal` → 1-tap self-grade got it/partly/missed → send `self_grade`), **Practice Test** (MCQ + short answer/problem with a visible timer).
- `useTelemetry(sessionId)`: emits `ITEM_SHOWN` / `ITEM_ANSWERED` with `latency_ms` (measure from item render to submit), `TAB_BLUR`/`TAB_FOCUS` (visibilitychange), `IDLE` (>30 s no input); batches to `POST /events` every ~5 s and on each answer; applies the returned `intervention`.
- Probe screen: render `probe_items` from `finish`, send `POST /probe` with a **1–5 "how did that feel?"** (emoji row). Result screen: probe score, "focused X of Y min", and a reflection card if `reflection` is present.
- ✅ Accept: a full Active Recall session and a Practice Test session end in a probe and update `subject_state`.
- **🔔 15:50 Sync 2:** do the live vertical slice demo with Saliha/Yehor.

**M3 · 15:50–16:20 · Feynman voice** *(Claude, main)*
- `/session/:id` for `FEYNMAN`: explain mic permission *before* connecting; fetch `GET /voice/signed-url?session_id=` → `{signed_url, context}`; `useConversation` → `startSession({ signedUrl })` with context via overrides/dynamic variables; show live transcript from `onMessage`; speaking indicator; End button.
- On end: `POST /feynman-transcript {turns}` → show `score`, `covered`, `gaps`. Then flow into the Standard Probe like other methods. Emit `VOICE_TURN` events with timestamps.
- Check the current ElevenLabs React docs. The SDK API has been changing (provider/hooks naming). Keep a **typed fallback** mode (text box talks to the same grader) behind a toggle.
- **Time-box:** if voice isn't working by **16:15**, ship the typed fallback and move on.
- ✅ Accept: a 2-minute voice session yields a transcript and a score; fallback works with voice off.

**M4 · 16:20–16:45 · Interventions + Dev panel + reflection UI**
- Intervention UX: `EASIER` → subtle toast ("Let's make this a bit easier"); `SWITCH_FORMAT` → brief toast then next item changes; `BREAK` → calm modal with countdown (`BREAK_START`/`BREAK_END` events); `WRAP_UP` → "Let's finish with the quick check." Tone: supportive, never guilt.
- Small attention chip in the session header (Focused / Drifting / Lapsed). Optional and unobtrusive.
- `/dev`: **Seed demo persona**, **Advance N days**, **Force reflection**, **Reset**, "Demo data" badge, and a "simulate drift" toggle that makes the next answers slow/erratic *only if* Yehor confirms it (otherwise do it by hand in the demo).
- Reflection card component (diagnosis chip + explanation + decision) used on Result and Home.
- ✅ Accept: induced drift shows a break modal; `/dev` can reset and replay the demo in <30 s.

**M5 · 16:45–17:00 · Polish the demo path**
- Run PRD §18 end-to-end 3×. Fix empty/loading/error states on that path only, remove console errors, check 1280×720 layout (that's the recording size). No new features.

## "Sam" agent prompt (ElevenLabs dashboard)
> You are "Sam", a curious first-year student who knows nothing about **{{topic}}**. The user will explain it to you in their own words. Ask **one short follow-up at a time**. Push gently on gaps and jargon ("what do you mean by…?", "can you give me an example?"). Never explain the topic yourself and never give the answer. Keep every reply under two sentences. After about six exchanges, thank them warmly and say you feel you understand. Concepts a complete explanation would eventually cover (never reveal these): **{{key_points}}**.

First message: *"Hi! I've never learned this. Can you teach me about {{topic}}?"*

## Interfaces
- **You call:** PRD §11 endpoints #1–#16 (types from OpenAPI). **You provide:** `Insights` page shell/route + design tokens; Saliha builds the page body. Share your layout components (Card, Chip, PageShell) by 15:30.
- **Telemetry contract:** `latency_ms` = item render → submit; `ts` = ISO UTC; `item_id` on item events; `IDLE` after 30 s with no input.

## Cut list (if behind)
Attention chip → Dev panel "simulate drift" → `SWITCH_FORMAT` UX → Onboarding step polish → voice (typed fallback). **Never cut:** session flow, probe + felt rating, break intervention, Home Start button.

## Your demo-readiness checklist
- [ ] Home → Start → first item in one tap
- [ ] Active Recall + Practice Test + Feynman each reach the probe
- [ ] Break modal appears on induced drift
- [ ] `/dev` reset + seed + advance works; "Demo data" badge visible
- [ ] 1280×720 looks right; no console errors on the demo path

## ✅ Done log
*(finished task → one line: ✅ id · what · `progress.md` stamp)*
