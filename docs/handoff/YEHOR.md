# YEHOR handoff + Codex queue

Yehor's two agents coordinate here. Claude (main checkout `GUH_2026`, branch `yehor-ml-data`) owns the engine stream and merges.
Codex (worktree `GUH_2026/.codex-worktree`, branch `yehor-ml-data-yd`; must be inside the project folder or Codex's sandbox can't write) takes the queue below. Codex: work only on files your task names,
push your branch, never merge; Claude merges and writes `progress.md`.

## Codex queue (top = now)
**Rule for every Codex task:** run `docs/skills/no-slop/SKILL.md` on your diff before you finish, and `docs/skills/debug/SKILL.md` on any failure (error, failing/flaky test, odd output, stuck). No guess-and-retry. Say in your reply which skills you ran and what they changed.
- ✅ Y-D done 15:14 (`6f8aa65`, SQLite default; merged to `main`). Claude did the personas itself.
- **Now (15:50):** CUSUM `sudden_drop` in `diagnose.py` + tests (uncommitted in `.codex-worktree`; Claude commits).
- **Next:** adversarial review of the TUNE thresholds on Ada/Ben.
- Codex's sandbox can't take git's index lock: leave changes uncommitted and say so; Claude commits.

## Claude stream
- Done by 15:15: Y0–Y4 (types, stubs, methodfit + priors, attention, diagnose, agent, predict, personas). 150 tests.
- Now: Y5. Done by 15:50: no-slop pass, CI-overlap HIGH rule, `stats_from_history`, trimmed-CV attention fix (burst → BREAK at answer 9), `readability.py`. Left: CUSUM (Codex), threshold review.
- Claude rule: `no-slop` skill after every code change and before every commit/push/merge; `debug` skill on every failure; re-copy skills after each sync.

## Gotchas
- Python: `GUH_2026/backend/.venv/bin/python` (3.11). Lint **from the repo root**: `uvx ruff check backend --exclude backend/.venv` (run from `backend/` it groups imports differently).
- No AI trailers on commits. Profiles are need-based (`short_blocks`, `reading_support`, `dyslexia_ui`), never diagnoses.

## For the video + Devpost (Y5)
**How it learns (voice-over, ~20 s):** Attune starts from what learning science already knows (practice testing beats rereading), then tries three methods on your own notes and keeps a running score of which one teaches you most per minute. While you study, it compares your answer timing with your own normal pace, so it can make a question easier or suggest a break before you burn out. When progress stalls, it works out whether you're tired, away, or the method has stopped working, and runs a one-week experiment with the next-best method to check.

**Honest limits:**
- The multi-week history is seeded: Ada and Ben are simulated students, and every seeded row is labelled Demo data.
- Attention is read from answer-timing variability against the user's own baseline. That's a proxy from lab studies, not validated for study apps. Attune is attention-aware, not a medical tool: it doesn't detect or diagnose ADHD.
- Thresholds are starting guesses tuned on the simulated students; readiness isn't validated against real exam results.
- Methods are compared on an immediate 5-item probe (delayed retention is roadmap), and 3 calibration sessions are a noisy start.

## Demo handoff for Saliha (16:30)
**Verified on `main` (`6d20c83`) on Yehor's machine:** 243 tests, ruff clean, frontend `npm run build` passes, and the full stack runs: backend `:8000` + frontend `:5173` (with `VITE_API_URL=http://127.0.0.1:8000`, CORS ok). Through the API: reset → seed (Data Structures, Ada's seeded history) → `advance-days 7` = PLATEAU → 7-day Feynman trial → `advance-days 7` = trial adopted (+0.21) → MASTERED. `scripts/attention_burst.py` → LAPSED + BREAK at answer 9.

**Run order for recording:**
1. Backend: `cd backend && .venv/bin/uvicorn app.main:app --port 8000 --env-file ../.env`
2. Frontend: `cd frontend && echo VITE_API_URL=http://127.0.0.1:8000 > .env && npm i && npm run dev` → http://127.0.0.1:5173
3. `curl -X POST :8000/api/dev/reset && curl -X POST :8000/api/dev/seed` before each take
4. Attention beat: `python scripts/attention_burst.py` (second terminal)
5. Loop beat: `/dev` → advance 7 days (say "seeded demo data") → plateau → Feynman trial; advance 7 again → adopted → mastered

**Needed from Saliha before recording:**
- Record on your machine: Yehor has no `.env`, so here grading falls back to word overlap and reflections to templates. Set `OPENAI_MODEL_FAST` / `OPENAI_MODEL_SMART` for live marking + narration.
- Re-warm the LLM cache after `6d20c83` (the narration prompt's `current_method` changed at 16:12), then freeze it.
- `/insights/1` still renders Maxym's `InsightsShell`: get the route swap to your `Insights` page from @maxym (board row 16:35), or record the Insights beat last.
- Feynman voice needs Maxym's ElevenLabs agent + `ELEVENLABS_AGENT_ID`; until then use the typed fallback.
- Any existing `attune.db` needs one `/dev/reset` (new `llm_usage.user_id` column).
- Voice-over + honest limits for the video/Devpost: section "For the video + Devpost" above.

## Frontend design review for Maxym (16:40, polish only, your call)
Reviewed `frontend/src` against the frontend-design skill, ranked by impact on the 2-minute video. All are small; none touch the API.
1. **Make the reflection card the climax (1:30 beat).** `components/ReflectionCard.tsx` is a plain card. On the 1:30 beat, show the decision as the headline ("Try Feynman for 7 days, then compare") with the evidence underneath from `reflection.evidence` (`days`, `mean_probe`, `median_not_focused`, `method`). Judges skim, and this card is the idea.
2. **Let the attention state change read on camera (0:55 beat).** The state is a small chip (`FocusBar.tsx:61`) and EASIER/SWITCH_FORMAT show as a 5 s toast (`Session.tsx:68,89`). Give the chip one clear transition when it moves Focused → Drifting/Lapsed (one moment, not scattered motion), and keep the toast up until the next answer.
3. **Drop the global orange hover swap (`index.css:108-118`).** Every hovered control turns the accent orange, so moving the cursor during recording makes the UI flicker. Keep the hover change on buttons only.
4. **Sentence case for labels.** `Home.tsx:96` ("Eat the frog first") and `PageShell.tsx:59` ("Demo data") are uppercase with tracking: the most common generated-UI tell. Plain sentence case reads calmer.
5. **Quieter session header.** "Do Not Disturb: off (simulated)" (`FocusBar.tsx:62-65`) takes prime space next to the timer on every session shot. Move it into "Focus settings".
6. **Friendlier attention words.** "Lapsed" (`FocusBar.tsx:50`) sounds clinical next to our non-medical pitch; "Needs a break" says what the user should do.
7. **Palette note (after the hackathon):** cream background + slate + terracotta-orange hover is one of the defaults generated UIs cluster around. Not worth re-theming today.

## Pitch scripts (2:00 + 1:00 Q&A), draft 16:57, edit freely
**0:00–0:30 · Saliha, intro.** "Every student is told to 'just study smarter', but nobody tells you *which* method works for *you*. Flashcards for one person, explaining out loud for another. And if your focus comes in bursts, a fixed 25-minute timer just doesn't fit. Attune tries three proven study methods on your own notes, measures which one teaches you the most per minute, adapts each session to your attention, and when you stall, works out why."

**0:30–1:30 · Maxym, live demo** (reset + seed before going on stage; recorded video as backup)
- 0:30 session (20 s): start a session from the dashboard, answer question 1 normally, **switch tabs twice while on question 2**, answer it, then answer question 3 → chip turns Drifting and the toast says "Let's try a smaller step." (Verified through the API: the state needs two readings in a row, so the change shows on answer 3, not straight after the switch.) "It's watching my pace against my own baseline, not a fixed timer."
- 0:50 Insights (15 s): `/insights/1`. "After three calibration rounds it knows Practice Test teaches this student the most per minute."
- 1:05 the loop (25 s): `/dev` → advance 7 days, **say "this is seeded demo data"** → reflection card. "Scores went flat but focus was fine, so this is a plateau, not tiredness. Attune starts a one-week Feynman trial and only keeps it if scores actually rise."

**1:30–2:00 · Yehor, outro.** "We built Attune so it can't fool you. The AI never makes decisions. Language models hallucinate, so every plan change comes from transparent rules over your own data, and the model only explains it. If its explanation goes off-script, we throw it away and show a template instead. Every method is judged on the same quiz. Demo data is labelled. And Attune isn't a medical tool. It doesn't diagnose anything; it checks itself. Attune: learn how you learn, and keep checking."

**Q&A prep (1:00):** Why not let the LLM decide? (hallucination; rules + validator; LLM only grades short answers and narrates) · Is attention tracking a diagnosis? (no: answer timing vs your own baseline, attention-aware, not medical) · How do you know the method works? (same 5-question probe after every session; trial adopted only if scores rise ≥0.05) · What's seeded? (Ada's 3-week history; labelled "Demo data") · What's next? (delayed retention probe, real-exam validation, live voice tutor).
