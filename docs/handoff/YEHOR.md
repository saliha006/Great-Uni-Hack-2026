# YEHOR handoff + Codex queue

Yehor's two agents coordinate here. Claude (main checkout `GUH_2026`, branch `yehor-ml-data`) owns the engine stream and merges.
Codex (worktree `../attune-data`, branch `yehor-ml-data-yd`) takes the queue below. Codex: work only on files your task names,
push your branch, never merge; Claude merges and writes `progress.md`.

## Codex queue (top = now)
**Rule for every Codex task:** run `docs/skills/no-slop/SKILL.md` on your diff before you finish, and `docs/skills/debug/SKILL.md` on any failure (error, failing/flaky test, odd output, stuck). No guess-and-retry. Say in your reply which skills you ran and what they changed.
- ✅ Y-D done 15:14 (`6f8aa65`, SQLite default; merged to `main`). Claude did the personas itself.
- **Next (Claude dispatches):** Y5 adversarial review of the TUNE thresholds on Ada/Ben; CUSUM sudden-drop check in `diagnose.py`.
- Codex's sandbox can't take git's index lock: leave changes uncommitted and say so; Claude commits.

## Claude stream
- Done by 15:15: Y0–Y4 (types, stubs, methodfit + priors, attention, diagnose, agent, predict, personas). 150 tests.
- Now: Y5. Done 15:20: no-slop pass over all engine code, CI-overlap rule for HIGH confidence, `stats_from_history`. Left: CUSUM drop check, readability helpers.
- Claude rule: `no-slop` skill after every code change and before every commit/push/merge; `debug` skill on every failure; re-copy skills after each sync.

## Gotchas
- Python: `GUH_2026/backend/.venv/bin/python` (3.11). Lint **from the repo root**: `uvx ruff check backend --exclude backend/.venv` (run from `backend/` it groups imports differently).
- No AI trailers on commits. Profiles are need-based (`short_blocks`, `reading_support`, `dyslexia_ui`), never diagnoses.
