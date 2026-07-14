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
const DEFAULT_TZ = "America/Edmonton";
const NON_LEAD_OUTCOMES = new Set(["wrong_number", "spam", "info_only"]);
// A number only routes live calls in these provisioning states. 'staged' (robot
// prepared it, operator hasn't confirmed) and 'error' (partial wiring) are held
// back so the call falls through to Vapi's fallbackDestination (the shop's real
// phone) instead of the AI answering. 'none' = legacy/manual rows (always live).
const ROUTABLE_PROVISION = ["active", "none"];

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

function extractInboundNumber(payload: any): string | null {
  const msg = payload?.message ?? {};
  const call = msg?.call ?? {};
  const candidates = [call?.phoneNumber?.number, msg?.phoneNumber?.number];
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

function formatDispatchTime(iso: unknown, tz: string): string | null {
  const d = parseIso(iso);
  if (!d) return null;
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
    timeZoneName: "short",
  }).format(d);
}

function composeSmsBody(row: Record<string, any>, tz: string): string {
  const urgency = String(row.urgency ?? "normal").toUpperCase();
  const callId = row.vapi_call_id ?? "";
  const ref = callId ? `ref:${String(callId).slice(-6)}` : "ref:?";

  const door = row.door_type ? String(row.door_type).replace(/_/g, " ") : null;
  const job = [door, row.damage_description].filter(Boolean).join(" — ");

  const lines = [door ? `${urgency} — ${door}` : `NEW LEAD — ${urgency}`];
  lines.push(`Call back: ${row.caller_phone ?? "not captured"}`);
  if (job) lines.push(`Job: ${job}`);
  if (row.vehicle_info) lines.push(`Vehicle: ${row.vehicle_info}`);
  if (row.service_address) lines.push(`Where: ${row.service_address}`);
  if (row.caller_name) lines.push(`Name: ${row.caller_name}`);
  const time = formatDispatchTime(row.ended_at, tz);
  if (time) lines.push(`Time: ${time}`);
  if (row.summary) lines.push(`Notes: ${row.summary}`);
  lines.push(ref);

  return lines.join("\n");
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
  const outcome = String(row.outcome ?? "").trim().toLowerCase().replace(/ /g, "_");
  if (NON_LEAD_OUTCOMES.has(outcome)) {
    console.log(`[vapi] skipping non-lead sms call=${callId} outcome=${outcome}`);
    return;
  }
  const { data: clientRows } = await supabase
    .from("clients").select("*").eq("id", clientId).limit(1);
  const rawPhone = clientRows?.[0]?.dispatch_phone;
  const tz = clientRows?.[0]?.timezone || DEFAULT_TZ;
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
  try {
    const sid = await sendSms(dispatchPhone, composeSmsBody(row, tz));
    console.log(`[vapi] sms sent call=${callId} to=${dispatchPhone} sid=${sid}`);
  } catch (e) {
    // Release the claim so a Vapi retry can re-send — a duplicate text beats a dropped lead.
    await supabase.from("calls")
      .update({ notified_at: null, notified_phone: null })
      .eq("vapi_call_id", callId);
    console.log(`[vapi] sms failed, claim released call=${callId}: ${e}`);
    throw e;
  }
}

async function lookupClientByInbound(number: string | null): Promise<string | null> {
  if (!number || !supabase) return null;
  const { data } = await supabase
    .from("clients").select("id").eq("inbound_number", number).eq("active", true)
    .in("provision_status", ROUTABLE_PROVISION).limit(1);
  return data?.[0]?.id ?? null;
}

async function lookupClientId(assistantId: unknown): Promise<string | null> {
  if (!assistantId || !supabase) return null;
  const { data } = await supabase
    .from("clients").select("id").eq("vapi_assistant_id", assistantId).eq("active", true).limit(1);
  return data?.[0]?.id ?? null;
}

async function lookupCallerMemory(phone: string | null) {
  if (!phone || !supabase) return null;
  const { data } = await supabase
    .from("calls")
    .select("caller_name, door_type, damage_description, service_address, summary, ended_at")
    .eq("caller_phone", phone)
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(20);
  if (!data || data.length === 0) return null;
  const clean = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const s = v.trim();
    return (!s || ["unknown", "null", "n/a", "none"].includes(s.toLowerCase())) ? null : s;
  };
  const firstClean = (vals: unknown[]) => {
    for (const v of vals) {
      const c = clean(v);
      if (c) return c;
    }
    return null;
  };
  const damage = firstClean(data.map((r) => r.damage_description));
  const door = firstClean(data.map((r) => (r.door_type ? String(r.door_type).replace(/_/g, " ") : null)));
  return {
    name: firstClean(data.map((r) => r.caller_name)),
    door,
    problem: damage || door,
    address: firstClean(data.map((r) => r.service_address)),
    summary: firstClean(data.map((r) => r.summary)),
  };
}

async function resolveClientContext(
  payload: any,
): Promise<{ assistantId: string | null; businessName: string; agentName: string }> {
  const envId = Deno.env.get("VAPI_ASSISTANT_ID");
  let row: any = null;
  if (supabase) {
    const inbound = extractInboundNumber(payload);
    if (inbound) {
      const { data } = await supabase
        .from("clients").select("vapi_assistant_id, business_name, agent_name, provision_status")
        .eq("inbound_number", inbound).eq("active", true).limit(1);
      const cand = data?.[0] ?? null;
      // A number we KNOW but haven't activated (staged/error) must not answer — and
      // must NOT fall through to the "first active client" default below (that would
      // answer as a random shop). Return no assistant so Vapi uses the number's
      // fallbackDestination (forwards to the shop's real phone).
      if (cand && !ROUTABLE_PROVISION.includes(cand.provision_status)) {
        console.log(`[vapi] inbound=${inbound} is provision_status=${cand.provision_status}, not live — no assistant`);
        return { assistantId: null, businessName: "", agentName: "" };
      }
      row = cand;
    }
    if (!row) {
      const { data } = await supabase
        .from("clients").select("vapi_assistant_id, business_name, agent_name")
        .eq("active", true).limit(1);
      row = data?.[0] ?? null;
    }
  }
  return {
    assistantId: envId ?? row?.vapi_assistant_id ?? null,
    businessName: row?.business_name ?? "",
    agentName: row?.agent_name ?? "",
  };
}

const RATE_LIMIT_PER_HOUR = 5;
const RATE_LIMIT_PER_DAY = 10;

async function countCallsSince(phone: string, sinceIso: string): Promise<number> {
  const { count } = await supabase!
    .from("calls")
    .select("vapi_call_id", { count: "exact", head: true })
    .eq("caller_phone", phone)
    .gte("ended_at", sinceIso);
  return count ?? 0;
}

// Block if the caller is over either window. Only completed calls count (rows
// are written at end-of-call); simultaneous in-flight calls are a known gap.
async function isRateLimited(phone: string | null): Promise<boolean> {
  if (!phone || !supabase) return false;
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (await countCallsSince(phone, hourAgo) >= RATE_LIMIT_PER_HOUR) return true;
  if (await countCallsSince(phone, dayAgo) >= RATE_LIMIT_PER_DAY) return true;
  return false;
}

async function isBanned(phone: string | null): Promise<boolean> {
  if (!phone || !supabase) return false;
  const { data } = await supabase
    .from("banned_callers")
    .select("caller_phone")
    .eq("caller_phone", phone)
    .limit(1);
  return !!(data && data.length);
}

// Spoken greeting must not read the street/house number aloud (caller ID is spoofable).
function greetingLocation(addr: string | null): string | null {
  if (!addr) return null;
  return addr.replace(/^\s*\d[\w-]*\s+/, "").trim() || null;
}

async function handleAssistantRequest(payload: any): Promise<Response> {
  const { assistantId, businessName, agentName } = await resolveClientContext(payload);
  const baseVars = {
    caller_name: "", caller_memory: "",
    business_name: businessName, agent_name: agentName,
  };
  if (!assistantId) {
    console.log("[vapi] assistant-request: no assistant resolved");
    return Response.json({ assistantOverrides: { variableValues: baseVars } });
  }
  try {
    const phone = extractCallerPhone(payload);
    const [banned, limited] = await Promise.all([isBanned(phone), isRateLimited(phone)]);
    if (banned) {
      console.log(`[vapi] blocked banned caller phone=${phone}`);
      return Response.json({ error: "Sorry, we can't take your call." });
    }
    if (limited) {
      console.log(`[vapi] rate-limited phone=${phone} (>${RATE_LIMIT_PER_HOUR}/hr or >=${RATE_LIMIT_PER_DAY}/day)`);
      return Response.json({
        error: "We're getting a lot of calls right now — please try again later.",
      });
    }
    const mem = await lookupCallerMemory(phone);
    if (!mem) {
      console.log(`[vapi] assistant-request: new caller phone=${phone}`);
      return Response.json({ assistantId, assistantOverrides: { variableValues: baseVars } });
    }
    const parts = ["Returning caller."];
    if (mem.door) parts.push(`Last job: ${mem.door}.`);
    if (mem.address) parts.push(`Address on file: ${mem.address}.`);
    if (mem.summary) parts.push(`Most recent call: ${mem.summary}`);
    const memory = parts.join(" ");
    const name = mem.name ?? "";
    const door = mem.door && mem.door.length <= 40 ? mem.door : null;
    const loc = greetingLocation(mem.address);
    const about = door && loc
      ? `the ${door} over at ${loc}`
      : loc
        ? `your place over at ${loc}`
        : door
          ? `the ${door}`
          : "";
    const business = businessName || "our shop";
    const agent = agentName || "the team";
    const greeting = name
      ? (about
        ? `Hi ${name}, it's ${agent} at ${business} — is this the same situation with ${about}, or did something new come up?`
        : `Hi ${name}, welcome back to ${business} — it's ${agent}. What's going on today?`)
      : (about
        ? `Welcome back to ${business} — this is ${agent}. Is this the same situation with ${about}, or something new?`
        : `Welcome back to ${business} — this is ${agent}. What's going on today?`);
    console.log(`[vapi] assistant-request: returning caller phone=${phone} name=${name}`);
    return Response.json({
      assistantId,
      assistantOverrides: {
        variableValues: { ...baseVars, caller_name: name, caller_memory: memory },
        firstMessage: greeting,
      },
    });
  } catch (e) {
    console.log(`[vapi] assistant-request error: ${e}`);
    return Response.json({ assistantId, assistantOverrides: { variableValues: baseVars } });
  }
}

async function persistCall(payload: any): Promise<void> {
  if (!supabase) return;
  const msg = payload?.message ?? {};
  const call = msg?.call ?? {};
  const callId = call?.id;
  const assistantId = call?.assistantId;
  try {
    const inboundNumber = extractInboundNumber(payload);
    const clientId = await lookupClientByInbound(inboundNumber) ?? await lookupClientId(assistantId);
    if (!clientId) {
      console.log(`[vapi] unknown client inbound=${inboundNumber} assistantId=${assistantId} call=${callId} — skipping insert`);
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
    if (eventType === "assistant-request") {
      return await handleAssistantRequest(payload);
    }
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
