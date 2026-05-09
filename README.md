# Locksmith Voice Agent — Webhook Receiver (MVP)

Minimal FastAPI service that receives Vapi voice-agent end-of-call webhooks and logs the full payload to stdout. Tonight's only job: confirm payloads arrive and inspect their shape in Render logs.

## Endpoints

- `GET /` — health check, returns `{"status": "ok"}`
- `POST /vapi/webhook` — accepts arbitrary JSON, prints it pretty-formatted to stdout, returns `{"received": true}`

## Run locally

Requires Python 3.11+.

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Test:

```bash
curl -X POST http://127.0.0.1:8000/vapi/webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"type":"end-of-call-report","endedReason":"customer-ended-call"}}'
```

## Deploy to Render

This repo includes a `render.yaml` blueprint. In the Render dashboard: **New +** → **Web Service** → connect this GitHub repo. Render will read the blueprint, or fill in manually:

- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Runtime**: Python 3
- **Plan**: Free

Once deployed, the webhook URL is `https://<service-name>.onrender.com/vapi/webhook`. Paste this into the Vapi assistant config as the Server URL.

## Roadmap

Tomorrow: Supabase persistence, Twilio dispatch SMS, signature verification.
