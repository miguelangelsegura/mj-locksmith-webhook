import asyncio
import json
import os
import re
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Request
from supabase import create_client
from twilio.rest import Client as TwilioClient

app = FastAPI()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
else:
    supabase = None
    print("[startup] SUPABASE_URL/SUPABASE_SERVICE_KEY not set — running in log-only mode", flush=True)

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_MESSAGING_SERVICE_SID = os.environ.get("TWILIO_MESSAGING_SERVICE_SID")

if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SERVICE_SID:
    twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
else:
    twilio_client = None
    print("[startup] Twilio creds not set — SMS disabled", flush=True)

STRUCTURED_FIELDS = ("caller_name", "service_address", "door_type", "damage_description", "urgency", "vehicle_info", "outcome")
SMS_MAX_LEN = 480
SMS_STALE_AFTER = timedelta(hours=1)
PHONE_RE = re.compile(r"^\+\d{10,15}$")


def _parse_iso(ts):
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _normalize_phone(value):
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped if PHONE_RE.match(stripped) else None


def _extract_caller_phone(payload):
    msg = payload.get("message") or {}
    call = msg.get("call") or {}
    candidates = (
        (call.get("customer") or {}).get("number"),
        (msg.get("customer") or {}).get("number"),
        call.get("from"),
    )
    for c in candidates:
        normalized = _normalize_phone(c)
        if normalized:
            return normalized
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
    artifact = msg.get("artifact") or {}
    structured = artifact.get("structuredOutputs") or {}

    started_raw = msg.get("startedAt") or call.get("createdAt")
    ended_raw = msg.get("endedAt")
    started_dt = _parse_iso(msg.get("startedAt"))
    ended_dt = _parse_iso(ended_raw)
    duration = int((ended_dt - started_dt).total_seconds()) if (started_dt and ended_dt) else None

    row = {
        "vapi_call_id": call.get("id"),
        "started_at": started_raw,
        "ended_at": ended_raw,
        "duration_seconds": duration,
        "caller_phone": _extract_caller_phone(payload),
        "summary": analysis.get("summary"),
        "transcript": _build_transcript(artifact.get("messages")),
    }
    for field in STRUCTURED_FIELDS:
        row[field] = None
    if isinstance(structured, dict):
        for entry in structured.values():
            if not isinstance(entry, dict):
                continue
            name = entry.get("name")
            if not isinstance(name, str):
                continue
            field = name.strip().lower().replace(" ", "_")
            if field not in STRUCTURED_FIELDS:
                continue
            result = entry.get("result")
            if isinstance(result, str) and result.strip().lower() == "null":
                result = None
            row[field] = result
    return row


def _compose_sms_body(row):
    urgency = row.get("urgency") or "normal"
    call_id = row.get("vapi_call_id") or ""
    ref = f"ref:{call_id[-6:]}" if call_id else "ref:?"

    lines = [f"New call — {urgency}"]
    for label, key, default in (
        ("Name", "caller_name", "unknown"),
        ("Phone", "caller_phone", "unknown"),
        ("Address", "service_address", None),
        ("Door", "door_type", None),
        ("Damage", "damage_description", None),
        ("Vehicle", "vehicle_info", None),
        ("Outcome", "outcome", None),
    ):
        value = row.get(key) or default
        if value:
            lines.append(f"{label}: {value}")

    summary = row.get("summary")
    if summary:
        non_summary = "\n".join(lines + [ref])
        budget = SMS_MAX_LEN - len(non_summary) - len("\nSummary: ")
        if budget > 20:
            if len(summary) > budget:
                summary = summary[: budget - 1] + "…"
            lines.append(f"Summary: {summary}")
    lines.append(ref)
    return "\n".join(lines)


def _send_dispatch_sms(client_id, call_id, row):
    if twilio_client is None or supabase is None:
        return
    try:
        res = supabase.table("clients").select("dispatch_phone").eq("id", client_id).limit(1).execute()
        rows = res.data or []
        raw_phone = rows[0].get("dispatch_phone") if rows else None
        if not raw_phone:
            print(f"[vapi] no dispatch_phone for client={client_id} call={call_id}", flush=True)
            return
        dispatch_phone = _normalize_phone(raw_phone)
        if dispatch_phone is None:
            print(f"[vapi] invalid dispatch_phone for client={client_id} raw={raw_phone!r}", flush=True)
            return
        ended_dt = _parse_iso(row.get("ended_at"))
        if ended_dt and (datetime.now(timezone.utc) - ended_dt) > SMS_STALE_AFTER:
            print(f"[vapi] skipping stale sms call={call_id}", flush=True)
            return
        claim = (
            supabase.table("calls")
            .update({"notified_at": datetime.now(timezone.utc).isoformat(), "notified_phone": dispatch_phone})
            .eq("vapi_call_id", call_id)
            .is_("notified_at", "null")
            .execute()
        )
        if not claim.data:
            print(f"[vapi] sms already sent call={call_id}", flush=True)
            return
        message = twilio_client.messages.create(
            to=dispatch_phone,
            messaging_service_sid=TWILIO_MESSAGING_SERVICE_SID,
            body=_compose_sms_body(row),
        )
        print(f"[vapi] sms sent call={call_id} to={dispatch_phone} sid={message.sid}", flush=True)
    except Exception as e:
        print(f"[vapi] sms failed call={call_id}: {e}", flush=True)


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
        _send_dispatch_sms(client_id, call_id, row)
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
