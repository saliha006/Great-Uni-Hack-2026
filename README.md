# Attune (Great Uni Hack 2026)

Finds the study method that works for each student, per subject, and adapts sessions to their attention.

## Run the backend
```bash
cd backend
uv venv --python 3.11 .venv && uv pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 8000 --env-file ../.env   # Windows: .venv/Scripts/uvicorn; API at :8000/api
.venv/bin/python -m pytest tests -q                              # tests
```
Copy `.env.example` to `.env` at the repo root and fill it in (keys from @saliha, never committed).
`API_MODE=fixtures` serves canned responses for frontend work. `LLM_MODE=cache` (default) only calls OpenAI on a cache
miss; `fixtures` never calls it.

**Demo state:** `POST /api/dev/reset`, then `POST /api/dev/seed` (Ada, three weeks of history), then
`POST /api/dev/advance-days {"days": 7}` to trigger the weekly reflection. `python scripts/attention_burst.py` plays a
steady-then-erratic answer pattern to show the attention intervention.

## Security settings
All optional; with none set the API behaves exactly as above. See `.env.example`.
- `ATTUNE_ENV=prod` removes `/api/dev/*` and the public schema; `DEV_TOKEN` makes dev routes require `X-Dev-Token`.
- `ALLOWED_HOSTS` turns on Host-header checking. uvicorn binds to 127.0.0.1 by default; keep it that way locally.
- `RL_<SCOPE>=count/seconds` sets a rate limit or quota per IP and per user (e.g. `RL_VOICE=20/86400`); unset = unlimited.
- Bodies over 1 MB are rejected, text fields have generous size caps, every response carries `nosniff`/`no-store`
  headers, and API keys are scrubbed from log lines. Keys live only in `.env`, which nothing serves over HTTP.
- An LLM only gets credit for a Feynman key point when its quote really appears in the student's words.

## How it scores you
- Every session ends with the same 5-question probe (3 multiple choice, 2 short answer) on that session's material, so
  methods are compared on one yardstick.
- Multiple choice is marked exactly. Short answers are marked 0 / ½ / 1 by an LLM against a model answer, with a
  word-overlap fallback. A Feynman explanation scores the share of the passage's key points you covered.
- Method fit is a Bayesian average of those scores, time spent and how the session felt, shown with an "early read"
  range until there is enough data.

## Honest limits
- The multi-week history in the demo is **seeded** ("Demo data" in the UI); it is not a real student's data.
- The probe is format-matched to the testing methods and n is tiny per method, so method rankings are an early read.
- Probe scores measure what you knew right after the session, not long-term retention (a delayed probe is designed,
  not shipped). The readiness estimate has not been checked against real exam results.
- LLM marking is not a teacher's marking. The Feynman transcript comes from the browser and is trusted as sent.
- Attention readings come from answer timing and tab focus compared with your own baseline. They are not a diagnosis:
  Attune does not detect, diagnose or treat ADHD or any condition.
- Privacy: pasted material is sent to OpenAI for grading and question generation; voice goes to ElevenLabs; attention
  events stay in the local database.
