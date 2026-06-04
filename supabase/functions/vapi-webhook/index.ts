import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;
if (!supabase) console.log("[startup] Supabase env not set — running in log-only mode");

const VAPI_SECRET = Deno.env.get("VAPI_SECRET");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
const OPS_PHONE = Deno.env.get("OPS_PHONE");
const twilioReady = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_MESSAGING_SERVICE_SID);
if (!twilioReady) console.log("[startup] Twilio creds not set — SMS disabled");

const STRUCTURED_FIELDS = [
  "caller_name", "service_address", "door_type",
  "damage_description", "urgency", "vehicle_info", "outcome",
];
const SMS_STALE_AFTER_MS = 60 * 60 * 1000;
const PHONE_RE = /^\+\d{10,15}$/;

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function parseIso(ts: unknown): Date | null {
  if (typeof ts !== "string" || !ts) return null;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const stripped = value.trim();
  return PHONE_RE.test(stripped) ? stripped : null;
}

function extractCallerPhone(payload: any): string | null {
  const msg = payload?.message ?? {};
  const call = msg?.call ?? {};
  const candidates = [
    call?.customer?.number,
    msg?.customer?.number,
    call?.from,
  ];
  for (const c of candidates) {
    const normalized = normalizePhone(c);
    if (normalized) return normalized;
  }
  return null;
}

function buildTranscript(messages: unknown): string | null {
  if (!Array.isArray(messages)) return null;
  const lines: string[] = [];
  for (const m of messages) {
    if (typeof m !== "object" || m === null) continue;
    const role = (m as any).role ?? "?";
    const content = (m as any).message ?? (m as any).content ?? "";
    lines.push(`[${role}]: ${content}`);
  }
  return lines.length ? lines.join("\n") : null;
}

function buildCallRow(payload: any): Record<string, unknown> {
  const msg = payload?.message ?? {};
  const call = msg?.call ?? {};
  const analysis = msg?.analysis ?? {};
  const artifact = msg?.artifact ?? {};
  const structured = artifact?.structuredOutputs ?? {};

  const startedRaw = msg?.startedAt ?? call?.createdAt;
  const endedRaw = msg?.endedAt;
  const startedDt = parseIso(msg?.startedAt);
  const endedDt = parseIso(endedRaw);
  const duration = startedDt && endedDt
    ? Math.floor((endedDt.getTime() - startedDt.getTime()) / 1000)
    : null;

  const row: Record<string, unknown> = {
    vapi_call_id: call?.id ?? null,
    started_at: startedRaw ?? null,
    ended_at: endedRaw ?? null,
    duration_seconds: duration,
    caller_phone: extractCallerPhone(payload),
    summary: analysis?.summary ?? null,
    transcript: buildTranscript(artifact?.messages),
  };
  for (const field of STRUCTURED_FIELDS) row[field] = null;
  if (structured && typeof structured === "object") {
    for (const entry of Object.values(structured)) {
      if (typeof entry !== "object" || entry === null) continue;
      const name = (entry as any).name;
      if (typeof name !== "string") continue;
      const field = name.trim().toLowerCase().replace(/ /g, "_");
      if (!STRUCTURED_FIELDS.includes(field)) continue;
      let result = (entry as any).result;
      if (typeof result === "string" && result.trim().toLowerCase() === "null") result = null;
      row[field] = result;
    }
  }
  return row;
}

function composeSmsBody(row: Record<string, any>): string {
  const urgency = row.urgency ?? "normal";
  const callId = row.vapi_call_id ?? "";
  const ref = callId ? `ref:${String(callId).slice(-6)}` : "ref:?";

  const lines: string[] = [urgency];
  for (const key of ["caller_name", "caller_phone", "service_address"]) {
    if (row[key]) lines.push(row[key]);
  }
  const detail = row.damage_description ?? row.door_type;
  if (detail) lines.push(detail);
  if (row.summary) lines.push(row.summary);

  return lines.join("\n") + "\n" + ref;
}

async function sendSms(to: string, body: string): Promise<string | null> {
  const params = new URLSearchParams({
    To: to,
    MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID!,
    Body: body,
  });
  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );
  if (!resp.ok) throw new Error(`twilio ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.sid ?? null;
}

async function notifyOps(message: string): Promise<void> {
  if (!twilioReady || !OPS_PHONE) return;
  try {
    await sendSms(OPS_PHONE, `[locksmith-webhook] ${message}`.slice(0, 300));
  } catch (e) {
    console.log(`[ops] alert failed: ${e}`);
  }
}

async function sendDispatchSms(clientId: string, callId: string, row: Record<string, any>): Promise<void> {
  if (!twilioReady || !supabase) return;
  const { data: clientRows } = await supabase
    .from("clients").select("dispatch_phone").eq("id", clientId).limit(1);
  const rawPhone = clientRows?.[0]?.dispatch_phone;
  if (!rawPhone) {
    console.log(`[vapi] no dispatch_phone for client=${clientId} call=${callId}`);
    return;
  }
  const dispatchPhone = normalizePhone(rawPhone);
  if (!dispatchPhone) {
    console.log(`[vapi] invalid dispatch_phone for client=${clientId} raw=${JSON.stringify(rawPhone)}`);
    return;
  }
  const endedDt = parseIso(row.ended_at);
  if (endedDt && Date.now() - endedDt.getTime() > SMS_STALE_AFTER_MS) {
    console.log(`[vapi] skipping stale sms call=${callId}`);
    return;
  }
  const { data: claim } = await supabase
    .from("calls")
    .update({ notified_at: new Date().toISOString(), notified_phone: dispatchPhone })
    .eq("vapi_call_id", callId)
    .is("notified_at", null)
    .select();
  if (!claim || claim.length === 0) {
    console.log(`[vapi] sms already sent call=${callId}`);
    return;
  }
  const sid = await sendSms(dispatchPhone, composeSmsBody(row));
  console.log(`[vapi] sms sent call=${callId} to=${dispatchPhone} sid=${sid}`);
}

async function lookupClientId(assistantId: unknown): Promise<string | null> {
  if (!assistantId || !supabase) return null;
  const { data } = await supabase
    .from("clients").select("id").eq("vapi_assistant_id", assistantId).eq("active", true).limit(1);
  return data?.[0]?.id ?? null;
}

async function persistCall(payload: any): Promise<void> {
  if (!supabase) return;
  const msg = payload?.message ?? {};
  const call = msg?.call ?? {};
  const callId = call?.id;
  const assistantId = call?.assistantId;
  try {
    const clientId = await lookupClientId(assistantId);
    if (!clientId) {
      console.log(`[vapi] unknown assistantId=${assistantId} call=${callId} — skipping insert`);
      return;
    }
    const row = buildCallRow(payload);
    row.client_id = clientId;
    row.raw_payload = payload;
    const { error } = await supabase.from("calls").upsert(row, { onConflict: "vapi_call_id" });
    if (error) throw new Error(error.message);
    console.log(`[vapi] persisted call=${callId} client=${clientId}`);
    await sendDispatchSms(clientId, callId, row);
  } catch (e) {
    console.log(`[vapi] persistence failed call=${callId}: ${e}`);
    await notifyOps(`persistence failed call=${callId}: ${e}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return Response.json({ status: "ok" });
  }

  if (VAPI_SECRET) {
    const token = new URL(req.url).searchParams.get("token") ?? "";
    const provided = req.headers.get("x-vapi-secret") || token;
    if (!constantTimeEqual(provided, VAPI_SECRET)) {
      console.log("[vapi] rejected unauthenticated request");
      return Response.json({ received: false });
    }
  }

  const raw = await req.text();
  try {
    const payload = JSON.parse(raw);
    const msg = (payload && typeof payload === "object") ? (payload.message ?? {}) : {};
    const eventType = msg.type ?? "<unknown>";
    const callId = msg.call?.id ?? "<no-call-id>";
    if (eventType === "end-of-call-report") {
      console.log(JSON.stringify(payload, null, 2));
      await persistCall(payload);
    } else {
      console.log(`[vapi] ${eventType} call=${callId} bytes=${raw.length}`);
    }
  } catch (e) {
    console.log(`[vapi/webhook] failed to parse JSON: ${e}`);
    console.log(`[vapi/webhook] raw body: ${raw}`);
  }
  return Response.json({ received: true });
});
