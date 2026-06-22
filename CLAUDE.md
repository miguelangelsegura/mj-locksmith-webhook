# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Webhook receiver for a Vapi voice-agent dispatch app (locksmith use case). A single-file FastAPI service ([main.py](main.py)) that receives Vapi `end-of-call-report` webhooks and, for each call: looks up which client (locksmith business) owns the assistant, persists a parsed call row to Supabase, and texts the client's dispatcher via Twilio. Other Vapi event types get a one-line stdout ack. The service degrades gracefully — if Supabase or Twilio env vars are missing it runs in log-only mode rather than failing.

End-to-end flow: customer calls → Vapi voice agent handles the conversation → on hang-up Vapi POSTs `end-of-call-report` → this service verifies the shared secret, persists the call, and dispatches an SMS.

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

- **`main.py` is intentionally minimal** — no Pydantic models, request validators, or abstraction layers. The endpoint deliberately accepts arbitrary JSON so unknown Vapi fields aren't rejected before they can be observed/persisted (the full payload is stored in `calls.raw_payload`).
- **The webhook returns 200 on any processing/JSON error.** The `try`/`except` blocks exist so a malformed or unexpected payload can never crash the worker or trigger a Vapi retry-storm. The one intentional exception: a missing/bad `x-vapi-secret` returns 401 (see auth below).
- **Auth: shared-secret via `x-vapi-secret`.** When `VAPI_WEBHOOK_SECRET` is set, the handler constant-time-compares it against the header and rejects mismatches with 401. It **fails open** (logs a loud warning, accepts requests) when the env var is unset so local `curl` testing works — keep that behavior unless asked to fail closed.
- **Persistence & SMS are idempotent.** Calls upsert on `vapi_call_id`. The dispatch SMS is guarded by an atomic claim (`UPDATE ... WHERE notified_at IS NULL`) so concurrent webhook deliveries can't double-text; on a Twilio send failure the claim is released so a retry can re-send. Preserve this claim/release ordering.
- **Logs go to stdout via `print(..., flush=True)`** — that is what surfaces in Render's Logs tab. Do not switch to a logging framework, structured logger, or external log sink without an explicit ask.
- **Only `end-of-call-report` events log the full payload and persist.** All other Vapi event types emit a one-line ack (`[vapi] <type> call=<id> bytes=<n>`) to keep Render logs readable. Do not remove the filter without an explicit ask.

## Expected Supabase schema

- `clients`: `id`, `vapi_assistant_id`, `active` (bool), `dispatch_phone` (E.164).
- `calls`: `vapi_call_id` (unique, upsert conflict target), `client_id`, timing/`duration_seconds`, `caller_phone`, `summary`, `transcript`, the structured fields in `STRUCTURED_FIELDS`, `raw_payload` (jsonb), plus `notified_at` / `notified_phone` for the SMS dispatch claim.

## Roadmap / not yet done

Per-client SMS retry sweep (currently relies on Vapi's retry window), and a stricter fail-closed auth mode. Ask before expanding scope further.
