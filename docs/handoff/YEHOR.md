# YEHOR handoff + Codex queue

Yehor's two agents coordinate here. Claude (main checkout `GUH_2026`, branch `yehor-ml-data`) owns the engine stream and merges.
Codex (worktree `../attune-data`, branch `yehor-ml-data-yd`) takes the queue below. Codex: work only on files your task names,
push your branch, never merge; Claude merges and writes `progress.md`.

## Codex queue (top = now)
- **Y-D (in progress):** `backend/app/db.py`, `backend/app/ingest.py` + tests. `ingest.py` pushed `54bcded`; `db.py` next.
- **Next: Y3 Stream B** `engine/simulate.py` personas Ada + Ben and the six diagnose scenario tests (brief Y3). Claude dispatches it.

## Claude stream
- Done: Y0 types, Y0b stubs, Y1 methodfit + priors, short_blocks profile (`3da2acd`).
- Now: Y2 `engine/attention.py` (15:00–15:55).

## Gotchas
- Python: `GUH_2026/backend/.venv/bin/python` (3.11). Lint: `uvx ruff check backend --exclude backend/.venv`.
- No AI trailers on commits. Profiles are need-based (`short_blocks`, `reading_support`, `dyslexia_ui`), never diagnoses.
