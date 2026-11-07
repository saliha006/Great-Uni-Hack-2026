# Attune (Great Uni Hack 2026)

Finds the study method that works for each student, per subject, and adapts sessions to their attention.

## Run the backend
```bash
cd backend
uv venv --python 3.11 .venv && uv pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000     # API at http://localhost:8000/api, schema at /openapi.json
.venv/bin/python -m pytest tests/app -q                 # tests
```
Copy `.env.example` to `.env` at the repo root and fill it in (keys from @saliha, never committed).

**Status:** every endpoint currently returns fixtures (stub API). Real logic replaces them task by task.
