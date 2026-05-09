# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

MVP webhook receiver for a Vapi voice-agent dispatch app (locksmith use case). A single-file FastAPI service whose only current job is logging incoming end-of-call payloads to stdout so the payload shape can be inspected in Render logs. Treat `main.py` as a payload-inspection stub, **not** a production handler.

## Local development

- Requires Python 3.11+. On this Mac the system `python3` is 3.9 — use `python3.11` explicitly (homebrew: `/opt/homebrew/bin/python3.11`).
- Setup: `python3.11 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
- Run: `uvicorn main:app --reload --port 8000`
- Smoke test commands are in [README.md](README.md). No test suite, linter, or type-checker is configured — verify changes by `curl`.

## Deployment

- Hosted on Render free plan via the `render.yaml` blueprint. GitHub repo: `miguelangelsegura/mj-locksmith-webhook`. Pushing to `main` triggers auto-deploy.
- Live webhook URL: `https://mj-locksmith-webhook.onrender.com/vapi/webhook`
- Free-plan caveat: services spin down after ~15 min idle, so the first request after a quiet period takes ~30s to wake up.

## Design constraints to preserve

- **`main.py` is intentionally minimal** (~30 lines; the user set a 60-line cap). Do not introduce Pydantic models, request validators, or abstraction layers — the endpoint deliberately accepts arbitrary JSON so unknown Vapi fields aren't rejected before they can be observed.
- **The webhook always returns 200**, even on JSON parse failure. The `try`/`except` exists so a malformed payload can never crash the worker.
- **Logs go to stdout via `print(..., flush=True)`** — that is what surfaces in Render's Logs tab. Do not switch to a logging framework, structured logger, or external log sink without an explicit ask.
- **Only `end-of-call-report` events log the full payload.** All other Vapi event types emit a one-line ack (`[vapi] <type> call=<id> bytes=<n>`) to keep Render logs readable. Do not remove the filter or expand other event types to full-JSON without an explicit ask.

## Out of scope (do not add unprompted)

Supabase persistence, Twilio dispatch SMS, and Vapi signature verification are deliberately deferred. Wait for an explicit request before adding any of them.
