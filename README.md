# Locksmith Voice Agent — Webhook Receiver

Minimal FastAPI service that receives Vapi voice-agent `end-of-call-report` webhooks, persists each call to Supabase, and texts the client's dispatcher via Twilio. Falls back to log-only mode when Supabase/Twilio env vars are absent.

## Endpoints

- `GET /` — health check, returns `{"status": "ok"}`
- `POST /vapi/webhook` — verifies the `x-vapi-secret` header (when `VAPI_WEBHOOK_SECRET` is set), then persists the call and dispatches an SMS. Returns `{"received": true}` (200) on success, `401` on bad/missing secret. Always returns 200 on payload/processing errors so the worker can't crash.

## Configuration (env vars)

All optional — unset vars degrade gracefully. Set them in the Render dashboard.

- `VAPI_WEBHOOK_SECRET` — shared secret; must match the assistant's **Server URL Secret** in Vapi. If unset, the webhook is **unauthenticated** (a startup warning is logged).
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — if unset, runs in log-only mode (no persistence/SMS).
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` — if unset, SMS dispatch is disabled.

## Run locally

Requires Python 3.11+.

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Test (no secret set locally → request is accepted):

```bash
curl -X POST http://127.0.0.1:8000/vapi/webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"end-of-call-report","endedReason":"customer-ended-call"}}'
```

If `VAPI_WEBHOOK_SECRET` is set, add the matching header (a wrong/missing one returns 401):

```bash
curl -X POST http://127.0.0.1:8000/vapi/webhook \
  -H "Content-Type: application/json" \
  -H "x-vapi-secret: $VAPI_WEBHOOK_SECRET" \
  -d '{"message":{"type":"end-of-call-report","endedReason":"customer-ended-call"}}'
```

## Deploy to Render

This repo includes a `render.yaml` blueprint. In the Render dashboard: **New +** → **Web Service** → connect this GitHub repo. Render will read the blueprint, or fill in manually:

- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Runtime**: Python 3
- **Plan**: Free

Once deployed, the webhook URL is `https://<service-name>.onrender.com/vapi/webhook`. Paste this into the Vapi assistant config as the Server URL, and set the assistant's **Server URL Secret** to the same value as `VAPI_WEBHOOK_SECRET`.

## Roadmap

Persistence, Twilio dispatch SMS, and shared-secret auth are done. Remaining: an SMS retry sweep (currently relies on Vapi's retry window) and an optional fail-closed auth mode.
