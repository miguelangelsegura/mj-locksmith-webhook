import asyncio
import json
import os
from datetime import datetime

from fastapi import FastAPI, Request
from supabase import create_client

app = FastAPI()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
else:
    supabase = None
    print("[startup] SUPABASE_URL/SUPABASE_SERVICE_KEY not set — running in log-only mode", flush=True)

STRUCTURED_FIELDS = ("caller_name", "service_address", "door_type", "damage_description", "urgency", "vehicle_info", "outcome")


def _parse_iso(ts):
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _build_transcript(messages):
    if not isinstance(messages, list):
        return None
    lines = []
    for m in messages:
        if not isinstance(m, dict):
            continue
        role = m.get("role", "?")
        content = m.get("message") or m.get("content") or ""
        lines.append(f"[{role}]: {content}")
    return "\n".join(lines) if lines else None


def _build_call_row(payload):
    msg = payload.get("message", {})
    call = msg.get("call") or {}
    analysis = msg.get("analysis") or {}
    structured = analysis.get("structuredOutputs") or {}
    artifact = msg.get("artifact") or {}

    started_raw = msg.get("startedAt") or call.get("createdAt")
    ended_raw = msg.get("endedAt")
    started_dt = _parse_iso(msg.get("startedAt"))
    ended_dt = _parse_iso(ended_raw)
    duration = int((ended_dt - started_dt).total_seconds()) if (started_dt and ended_dt) else None

    customer = call.get("customer") or {}
    row = {
        "vapi_call_id": call.get("id"),
        "started_at": started_raw,
        "ended_at": ended_raw,
        "duration_seconds": duration,
        "caller_phone": customer.get("number"),
        "summary": analysis.get("summary"),
        "transcript": _build_transcript(artifact.get("messages")),
    }
    for field in STRUCTURED_FIELDS:
        row[field] = structured.get(field) if isinstance(structured, dict) else None
    return row


def _lookup_client_id(assistant_id):
    if not assistant_id or supabase is None:
        return None
    res = supabase.table("clients").select("id").eq("vapi_assistant_id", assistant_id).eq("active", True).limit(1).execute()
    rows = res.data or []
    return rows[0]["id"] if rows else None


def _persist_call(payload):
    if supabase is None:
        return
    msg = payload.get("message", {})
    call = msg.get("call") or {}
    call_id = call.get("id")
    assistant_id = call.get("assistantId")
    try:
        client_id = _lookup_client_id(assistant_id)
        if not client_id:
            print(f"[vapi] unknown assistantId={assistant_id} call={call_id} — skipping insert", flush=True)
            return
        row = _build_call_row(payload)
        row["client_id"] = client_id
        row["raw_payload"] = payload
        supabase.table("calls").upsert(row, on_conflict="vapi_call_id").execute()
        print(f"[vapi] persisted call={call_id} client={client_id}", flush=True)
    except Exception as e:
        print(f"[vapi] persistence failed call={call_id}: {e}", flush=True)


@app.get("/")
async def health():
    return {"status": "ok"}


@app.post("/vapi/webhook")
async def vapi_webhook(request: Request):
    raw = await request.body()
    try:
        payload = json.loads(raw)
        msg = payload.get("message", {}) if isinstance(payload, dict) else {}
        event_type = msg.get("type", "<unknown>")
        call_id = (msg.get("call") or {}).get("id", "<no-call-id>")
        if event_type == "end-of-call-report":
            print(json.dumps(payload, indent=2), flush=True)
            await asyncio.to_thread(_persist_call, payload)
        else:
            print(f"[vapi] {event_type} call={call_id} bytes={len(raw)}", flush=True)
    except Exception as e:
        print(f"[vapi/webhook] failed to parse JSON: {e}", flush=True)
        print(f"[vapi/webhook] raw body: {raw!r}", flush=True)
    return {"received": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
