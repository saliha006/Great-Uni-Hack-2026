# YEHOR handoff + Codex queue

Yehor's two agents coordinate here. Claude (main checkout `GUH_2026`, branch `yehor-ml-data`) owns the engine stream and merges.
Codex (worktree `../attune-data`, branch `yehor-ml-data-yd`) takes the queue below. Codex: work only on files your task names,
push your branch, never merge; Claude merges and writes `progress.md`.

## Codex queue (top = now)
- ✅ Y-D done 15:14 (`6f8aa65`, SQLite default; merged to `main`). Claude did the personas itself.
- **Next (Claude dispatches):** Y5 adversarial review of the TUNE thresholds on Ada/Ben; CUSUM sudden-drop check in `diagnose.py`.
- Codex's sandbox can't take git's index lock: leave changes uncommitted and say so; Claude commits.

## Claude stream
- Done by 15:15: Y0–Y4 (types, stubs, methodfit + priors, attention, diagnose, agent, predict, personas). 150 tests.
- Now: Y5 tune + demo support. Gaps: CUSUM drop check, CI-overlap rule for HIGH confidence.

## Gotchas
- Python: `GUH_2026/backend/.venv/bin/python` (3.11). Lint: `uvx ruff check backend --exclude backend/.venv`.
- No AI trailers on commits. Profiles are need-based (`short_blocks`, `reading_support`, `dyslexia_ui`), never diagnoses.
