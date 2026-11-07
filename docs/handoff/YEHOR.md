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
