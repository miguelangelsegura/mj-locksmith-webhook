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

// Public "call our AI" demo line. When DEMO_NUMBER is set, calls arriving on it are
// handled as a demo: the shared assistant answers as a clearly-labelled demo persona
// with a tight per-call cap, the per-caller rate limit/ban still apply, and the call
// is NOT persisted or dispatched as a lead (so demo calls are never mistaken for real
// jobs). Inert when DEMO_NUMBER is unset (e.g. local dev).
const DEMO_NUMBER = normalizePhone(Deno.env.get("DEMO_NUMBER"));
const DEMO_ASSISTANT_ID = Deno.env.get("VAPI_ASSISTANT_ID") ?? null;
const DEMO_BUSINESS_NAME = "Dispango Demo";
const DEMO_AGENT_NAME = "Riley";
const DEMO_MAX_DURATION_SECONDS = 180;
// Persona name used when a shop has no custom agent_name — matches the live TTS voice.
const DEFAULT_AGENT_NAME = "Elliot";

function isDemoNumber(inbound: string | null): boolean {
  return !!DEMO_NUMBER && inbound === DEMO_NUMBER;
}

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

// Resolve a client by inbound number IGNORING the `active` flag. Used only to
// attribute a demo call at persist time: the admin off-switch can flip the demo
// row inactive mid-call, and an in-flight call still fires an end-of-call-report.
// Matching by inbound number (which is unique to the demo row) keeps that report
// attributed to the demo client instead of falling through to
// lookupClientId(assistantId) — where the shared VAPI_ASSISTANT_ID is also held by
// a real client row, which would mis-attribute the call and text them a fake lead.
async function lookupClientByInboundAnyState(number: string | null): Promise<string | null> {
  if (!number || !supabase) return null;
  const { data } = await supabase
    .from("clients").select("id").eq("inbound_number", number).limit(1);
  return data?.[0]?.id ?? null;
}

async function lookupClientId(assistantId: unknown): Promise<string | null> {
  if (!assistantId || !supabase) return null;
  const { data } = await supabase
    .from("clients").select("id").eq("vapi_assistant_id", assistantId).eq("active", true).limit(1);
  return data?.[0]?.id ?? null;
}

// Returning-caller memory is scoped to the SHOP (client_id), never global by phone
// alone: if the same person has called two shops on the platform, shop B must not
// greet them with what they told shop A. No clientId → no memory (treat as a new
// caller) rather than risk a cross-tenant leak.
async function lookupCallerMemory(phone: string | null, clientId: string | null) {
  if (!phone || !clientId || !supabase) return null;
  const { data } = await supabase
    .from("calls")
    .select("caller_name, door_type, damage_description, service_address, summary, ended_at")
    .eq("caller_phone", phone)
    .eq("client_id", clientId)
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

type ClientContext = {
  assistantId: string | null;
  clientId: string | null;
  businessName: string;
  agentName: string;
  answerMode: string | null;
  businessHours: unknown;
  timezone: string;
  fallbackNumber: string | null;
  serviceArea: string;
  servicesOffered: string;
  pricingNotes: string;
};

const CLIENT_CONTEXT_COLS =
  "id, vapi_assistant_id, business_name, agent_name, provision_status, answer_mode, business_hours, timezone, fallback_number, service_area, services_offered, pricing_notes";

function contextFrom(envId: string | undefined, row: any): ClientContext {
  return {
    assistantId: envId ?? row?.vapi_assistant_id ?? null,
    clientId: row?.id ?? null,
    businessName: row?.business_name ?? "",
    // Persona name the agent introduces itself with. Falls back to the TTS voice name
    // ("Elliot") so {{agent_name}} is never blank when a shop has only a business name.
    agentName: (row?.agent_name ?? "").trim() || DEFAULT_AGENT_NAME,
    answerMode: row?.answer_mode ?? null,
    businessHours: row?.business_hours ?? null,
    timezone: row?.timezone || DEFAULT_TZ,
    fallbackNumber: normalizePhone(row?.fallback_number),
    // Customer-editable knowledge the agent uses on the call (blank when unset).
    serviceArea: (row?.service_area ?? "").trim(),
    servicesOffered: (row?.services_offered ?? "").trim(),
    pricingNotes: (row?.pricing_notes ?? "").trim(),
  };
}

async function resolveClientContext(payload: any): Promise<ClientContext> {
  const envId = Deno.env.get("VAPI_ASSISTANT_ID");
  let row: any = null;
  if (supabase) {
    const inbound = extractInboundNumber(payload);
    if (inbound) {
      const { data } = await supabase
        .from("clients").select(CLIENT_CONTEXT_COLS)
        .eq("inbound_number", inbound).eq("active", true).limit(1);
      const cand = data?.[0] ?? null;
      // A number we KNOW but haven't activated (staged/error) must not answer as a
      // random shop. Return no assistant so Vapi uses the number's fallbackDestination
      // (forwards to the shop's real phone) rather than impersonating a tenant.
      if (cand && !ROUTABLE_PROVISION.includes(cand.provision_status)) {
        console.log(`[vapi] inbound=${inbound} is provision_status=${cand.provision_status}, not live — no assistant`);
        return contextFrom(undefined, null);
      }
      row = cand;
    }
    // Multi-tenant safety: NEVER fall back to an arbitrary "first active client".
    // If we can't positively identify the shop this call is for (no inbound number
    // on the payload, or the number isn't a live client), guessing the oldest active
    // shop made every unresolved call answer as — and load the returning-caller
    // memory of — that shop (a cross-tenant history leak). Resolve to no client/
    // assistant so Vapi forwards the call to the number's fallbackDestination
    // instead of impersonating a tenant and surfacing its data.
    if (!row) {
      console.log(`[vapi] assistant-request: inbound=${inbound ?? "none"} matched no live client — no assistant (won't guess a tenant)`);
      return contextFrom(undefined, null);
    }
  }
  return contextFrom(envId, row);
}

const HOURS_DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Is `now` inside the shop's configured weekly hours, evaluated in the shop's
// timezone? Used only for answer_mode='scheduled'. Any malformed config returns
// true (fail toward the AI answering — never silently drop/forward a call because
// the schedule JSON was bad).
function withinBusinessHours(businessHours: unknown, tz: string): boolean {
  if (!businessHours || typeof businessHours !== "object") return true;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(new Date());
    const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
    const dayKey = HOURS_DAY_KEYS[["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd)] ?? null;
    if (!dayKey) return true;
    const day = (businessHours as Record<string, any>)[dayKey];
    if (!day || typeof day !== "object") return true;
    if (!day.on) return false;
    let hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    const nowHhmm = `${String(hour).padStart(2, "0")}:${minute}`;
    const open = typeof day.open === "string" ? day.open : "00:00";
    const close = typeof day.close === "string" ? day.close : "23:59";
    return nowHhmm >= open && nowHhmm < close;
  } catch {
    return true;
  }
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

// Demo line: answer as the clearly-labelled demo persona with a tight per-call cap.
// Gated by an admin on/off switch (the demo row's `active` flag) first, then the
// ban + per-caller rate limit (a public number with no cap is an open door to
// draining the balance). The ban/rate-limit gate fails OPEN on a DB error like the
// main path — the short maxDuration cap still bounds the cost — but the on/off
// switch fails CLOSED (see below).
async function handleDemoRequest(inbound: string | null, phone: string | null): Promise<Response> {
  const demoVars = {
    caller_name: "", caller_memory: "",
    business_name: DEMO_BUSINESS_NAME, agent_name: DEMO_AGENT_NAME,
    // The demo shares the live assistant/prompt (v13 references these). Supply them
    // (blank) so Vapi never renders `{{service_area}}` etc. literally on a demo call.
    service_area: "", services_offered: "", pricing_notes: "",
  };
  if (!DEMO_ASSISTANT_ID) {
    console.log("[vapi] demo call but VAPI_ASSISTANT_ID unset — cannot route");
    return Response.json({ error: "Our demo line is not available right now." });
  }
  // Off-switch: the demo line only answers while its "Dispango Demo" client row is
  // active — toggle it with the Active switch on that row in the admin portal.
  // When disabled we return no assistant, so the call never spins up Vapi's AI and
  // burns no minutes. Unlike the main call path this fails CLOSED on a DB error:
  // the whole point of the switch is cost control, so "unsure → stay off" is safer.
  try {
    if (!(await lookupClientByInbound(inbound))) {
      console.log(`[vapi] demo line disabled (row inactive) inbound=${inbound}`);
      return Response.json({ error: "Our demo line is not available right now." });
    }
  } catch (e) {
    console.log(`[vapi] demo enable-check error (blocking): ${e}`);
    return Response.json({ error: "Our demo line is not available right now." });
  }
  try {
    const [banned, limited] = await Promise.all([isBanned(phone), isRateLimited(phone)]);
    if (banned) {
      console.log(`[vapi] demo blocked banned caller phone=${phone}`);
      return Response.json({ error: "Sorry, we can't take your call." });
    }
    if (limited) {
      console.log(`[vapi] demo rate-limited phone=${phone}`);
      return Response.json({ error: "The demo line is busy right now — please try again later." });
    }
  } catch (e) {
    console.log(`[vapi] demo gate error (failing open): ${e}`);
  }
  console.log(`[vapi] demo call phone=${phone}`);
  return Response.json({
    assistantId: DEMO_ASSISTANT_ID,
    assistantOverrides: {
      variableValues: demoVars,
      maxDurationSeconds: DEMO_MAX_DURATION_SECONDS,
    },
  });
}

async function handleAssistantRequest(payload: any): Promise<Response> {
  const inbound = extractInboundNumber(payload);
  if (isDemoNumber(inbound)) {
    return await handleDemoRequest(inbound, extractCallerPhone(payload));
  }
  const {
    assistantId, clientId, businessName, agentName,
    answerMode, businessHours, timezone, fallbackNumber,
    serviceArea, servicesOffered, pricingNotes,
  } = await resolveClientContext(payload);
  const baseVars = {
    caller_name: "", caller_memory: "",
    business_name: businessName, agent_name: agentName,
    service_area: serviceArea, services_offered: servicesOffered, pricing_notes: pricingNotes,
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
    // Business-hours window: when a shop chooses 'scheduled', the AI answers only
    // inside its configured hours; outside them the call forwards to the shop's own
    // phone (Vapi `destination` — forwards immediately, ignoring assistantId). Any
    // non-scheduled mode = 24/7 AI (unchanged behavior). We only bounce when we
    // actually have a fallback number to send them to; otherwise the AI answers so
    // a call is never dropped.
    if (answerMode === "scheduled" && !withinBusinessHours(businessHours, timezone)) {
      if (fallbackNumber) {
        console.log(`[vapi] out-of-hours (tz=${timezone}) — forwarding to shop ${fallbackNumber}`);
        return Response.json({ destination: { type: "number", number: fallbackNumber, message: "" } });
      }
      console.log(`[vapi] out-of-hours but no fallback_number — AI answering instead of dropping`);
    }
    const mem = await lookupCallerMemory(phone, clientId);
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
  const inboundNumber = extractInboundNumber(payload);
  const isDemo = isDemoNumber(inboundNumber);
  try {
    // Demo calls resolve the demo row by inbound number regardless of `active`, and
    // must NEVER fall through to lookupClientId(assistantId): the admin off-switch can
    // flip the demo row inactive mid-call, and the shared VAPI_ASSISTANT_ID is also
    // held by a real client row — that fallback would text an in-flight demo call to
    // a real shop as a fake lead.
    const clientId = isDemo
      ? await lookupClientByInboundAnyState(inboundNumber)
      : (await lookupClientByInbound(inboundNumber) ?? await lookupClientId(assistantId));
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
    // Demo line: the call IS persisted (so the per-caller rate limit — which counts
    // rows in `calls` — actually sees demo traffic and can trip) but is NEVER
    // dispatched as a lead. The demo number resolves to the dedicated "Dispango Demo"
    // client row, so even without this skip no real shop would be texted.
    if (isDemo) {
      console.log(`[vapi] demo call=${callId} — persisted, skipping lead SMS`);
      return;
    }
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
