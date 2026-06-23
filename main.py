import asyncio
import hmac
import json
import os
import re
from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from supabase import create_client
from twilio.rest import Client as TwilioClient

app = FastAPI()

VAPI_WEBHOOK_SECRET = os.environ.get("VAPI_WEBHOOK_SECRET")
if not VAPI_WEBHOOK_SECRET:
    print("[startup] VAPI_WEBHOOK_SECRET not set — webhook is UNAUTHENTICATED", flush=True)

ADMIN_API_TOKEN = os.environ.get("ADMIN_API_TOKEN")
if not ADMIN_API_TOKEN:
    print("[startup] ADMIN_API_TOKEN not set — /admin endpoints are DISABLED", flush=True)

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
SMS_MAX_LEN = 110
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

    lines = [urgency]
    for key in ("caller_name", "caller_phone", "service_address"):
        value = row.get(key)
        if value:
            lines.append(value)
    detail = row.get("damage_description") or row.get("door_type")
    if detail:
        lines.append(detail)

    body_budget = SMS_MAX_LEN - len(ref) - 1
    summary = row.get("summary")
    if summary:
        non_summary = "\n".join(lines)
        budget = body_budget - len(non_summary) - 1
        if budget > 10:
            if len(summary) > budget:
                summary = summary[: budget - 2] + ".."
            lines.append(summary)

    body = "\n".join(lines)
    if len(body) > body_budget:
        body = body[: body_budget - 2] + ".."
    return body + "\n" + ref


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
        try:
            message = twilio_client.messages.create(
                to=dispatch_phone,
                messaging_service_sid=TWILIO_MESSAGING_SERVICE_SID,
                body=_compose_sms_body(row),
            )
        except Exception:
            # Release the claim so a Vapi retry can re-send. A duplicate dispatch
            # SMS is far cheaper than a silently dropped job lead.
            supabase.table("calls").update(
                {"notified_at": None, "notified_phone": None}
            ).eq("vapi_call_id", call_id).execute()
            raise
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
    if VAPI_WEBHOOK_SECRET:
        provided = request.headers.get("x-vapi-secret", "")
        if not hmac.compare_digest(provided, VAPI_WEBHOOK_SECRET):
            print("[vapi/webhook] rejected: bad/missing secret", flush=True)
            return JSONResponse({"received": False}, status_code=401)
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


# --- Admin API ---------------------------------------------------------------
# Internal endpoints for the onboarding tool (Retool/Appsmith). Reads, the
# active toggle, and edits are done by the tool directly against Supabase; only
# the actions that need server-side validation or Twilio creds live here.
# Fails closed: when ADMIN_API_TOKEN is unset every /admin route returns 503.


def require_admin(x_admin_token: str = Header(default="")):
    if not ADMIN_API_TOKEN:
        raise HTTPException(status_code=503, detail="admin API not configured")
    if not hmac.compare_digest(x_admin_token, ADMIN_API_TOKEN):
        raise HTTPException(status_code=401, detail="invalid admin token")


def _admin_create_client(payload):
    assistant_id = (payload.get("vapi_assistant_id") or "").strip()
    business_name = (payload.get("business_name") or "").strip()
    dispatch_phone = _normalize_phone(payload.get("dispatch_phone"))
    if not assistant_id:
        raise HTTPException(status_code=400, detail="vapi_assistant_id is required")
    if not business_name:
        raise HTTPException(status_code=400, detail="business_name is required")
    if dispatch_phone is None:
        raise HTTPException(status_code=400, detail="dispatch_phone must be E.164, e.g. +14165551234")
    existing = supabase.table("clients").select("id").eq("vapi_assistant_id", assistant_id).limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="a client with that vapi_assistant_id already exists")
    row = {
        "vapi_assistant_id": assistant_id,
        "business_name": business_name,
        "dispatch_phone": dispatch_phone,
        "active": bool(payload.get("active", True)),
    }
    res = supabase.table("clients").insert(row).execute()
    print(f"[admin] created client business={business_name!r} assistant={assistant_id}", flush=True)
    return (res.data or [row])[0]


def _admin_test_sms(client_id):
    res = supabase.table("clients").select("business_name, dispatch_phone").eq("id", client_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="client not found")
    dispatch_phone = _normalize_phone(rows[0].get("dispatch_phone"))
    if dispatch_phone is None:
        raise HTTPException(status_code=400, detail="client has no valid dispatch_phone")
    msg = twilio_client.messages.create(
        to=dispatch_phone,
        messaging_service_sid=TWILIO_MESSAGING_SERVICE_SID,
        body="Test dispatch — this number is set up to receive job alerts. No action needed.",
    )
    print(f"[admin] test sms sent client={client_id} to={dispatch_phone} sid={msg.sid}", flush=True)
    return {"to": dispatch_phone, "sid": msg.sid}


@app.post("/admin/clients")
async def admin_create_client(request: Request, _=Depends(require_admin)):
    if supabase is None:
        raise HTTPException(status_code=503, detail="supabase not configured")
    payload = await request.json()
    client = await asyncio.to_thread(_admin_create_client, payload)
    return {"created": True, "client": client}


@app.post("/admin/clients/{client_id}/test-sms")
async def admin_test_sms(client_id: str, _=Depends(require_admin)):
    if supabase is None or twilio_client is None:
        raise HTTPException(status_code=503, detail="supabase/twilio not configured")
    try:
        result = await asyncio.to_thread(_admin_test_sms, client_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"twilio send failed: {e}")
    return {"sent": True, **result}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
