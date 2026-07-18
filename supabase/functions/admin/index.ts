// Admin / onboarding API for the Dispango team.
//
// A small, token-authenticated Edge Function the internal admin tool (Retool/
// Appsmith) calls to onboard + manage locksmith `clients` without touching SQL
// or the Vapi dashboard. It writes the SAME Supabase tables the vapi-webhook
// reads, so a new shop becomes live the moment its row is correct.
//
// Auth: this function is NOT called by Vapi or with a Supabase JWT — the tool
// builder sends `x-admin-token`. Deploy with verify_jwt = false (see
// config.toml); this token check is the gate. Fails CLOSED when the token is
// unset.
//
// Routes (function is mounted at /functions/v1/admin):
//   GET    /clients                 list clients (newest first)
//   POST   /clients                 create a client (validated)
//   PATCH  /clients/:id             update a client (e.g. active toggle)
//   POST   /clients/:id/test-sms    send a test dispatch SMS to the client's number
//
// Provisioning automation (buying the Twilio number, attaching the Vapi
// assistant + server URL) is intentionally NOT here yet — see ADMIN-DASHBOARD-SPEC.md.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { collectMonitoring, isLeadOutcome } from "../_shared/monitoring.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;
if (!supabase) console.log("[startup] Supabase env not set — admin API in log-only mode");

const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN");
if (!ADMIN_API_TOKEN) console.log("[startup] ADMIN_API_TOKEN not set — admin API is DISABLED (fails closed)");

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
const twilioReady = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_MESSAGING_SERVICE_SID);

// Used by the "place a test call" and "repair routing" troubleshooting tools to
// inspect/fix the Vapi phone-number resource (the exact place the server-URL
// regressions hid). Optional: if unset, those tools degrade to "can't check".
const VAPI_PRIVATE_KEY = Deno.env.get("VAPI_PRIVATE_KEY");
const VAPI_SECRET = Deno.env.get("VAPI_SECRET");
const VAPI_API_BASE = (Deno.env.get("VAPI_API_BASE") || "https://api.vapi.ai").replace(/\/$/, "");
// Vapi's edge rejects the default Deno User-Agent (Cloudflare 1010) — send a browser UA.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const WEBHOOK_BASE = supabaseUrl
  ? `${supabaseUrl.replace(/\/$/, "")}/functions/v1/vapi-webhook`
  : null;

const DEFAULT_TZ = "America/Edmonton";
const PHONE_RE = /^\+\d{10,15}$/;

// Columns the admin tool is allowed to set. Anything else in the body is ignored
// so the tool can't write arbitrary/computed columns (id, created_at, etc.).
const WRITABLE_FIELDS = [
  "business_name", "agent_name", "vapi_assistant_id", "dispatch_phone",
  "owner_phone", "inbound_number", "fallback_number", "cell_number", "answer_mode",
  "ring_timeout_seconds", "business_hours", "timezone", "active",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-admin-token",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const stripped = value.trim();
  return PHONE_RE.test(stripped) ? stripped : null;
}

function pickWritable(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of WRITABLE_FIELDS) {
    if (key in body) out[key] = body[key];
  }
  return out;
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

function parseIso(ts: unknown): Date | null {
  if (typeof ts !== "string" || !ts) return null;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function formatDispatchTime(iso: unknown, tz: string): string | null {
  const d = parseIso(iso);
  if (!d) return null;
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric", minute: "2-digit", timeZone: tz, timeZoneName: "short",
  }).format(d);
}

// Rebuild the dispatch SMS from a persisted `calls` row. Deliberately mirrors
// composeSmsBody in vapi-webhook/index.ts — kept as a self-contained copy so the
// resend tool never has to import the live call path (each Edge Function is its
// own deploy; small helpers are duplicated across them by convention here). If the
// webhook's format changes, update this to match.
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

// --- Vapi REST helpers (troubleshooting tools only) -----------------------

async function vapiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${VAPI_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
      "User-Agent": BROWSER_UA,
      ...(init.headers ?? {}),
    },
  });
}

// Strip a `?token=`/`&token=` value from any string before it's returned to the
// browser. The Vapi number's server URL and the synthetic-webhook URL both carry
// VAPI_SECRET — a strictly higher trust boundary than the ADMIN_API_TOKEN the
// operator holds. Never echo the raw secret into a check detail or error message.
function redactToken(s: string): string {
  return s.replace(/([?&]token=)[^&\s"']+/gi, "$1***");
}

// Find the Vapi phone-number resource matching an E.164 number. Returns the raw
// object (with .server, .assistantId, .fallbackDestination) or null if not imported.
async function vapiFindNumber(number: string): Promise<any | null> {
  const resp = await vapiFetch(`/phone-number?limit=1000`);
  if (!resp.ok) throw new Error(`vapi list ${resp.status}: ${await resp.text()}`);
  const list = await resp.json();
  if (!Array.isArray(list)) return null;
  return list.find((n) => n?.number === number) ?? null;
}

async function createClientRow(body: Record<string, unknown>): Promise<Response> {
  const businessName = String(body.business_name ?? "").trim();
  const assistantId = String(body.vapi_assistant_id ?? "").trim();
  const dispatchPhone = normalizePhone(body.dispatch_phone);
  const ownerPhone = normalizePhone(body.owner_phone);

  if (!businessName) return json({ error: "business_name is required" }, 400);
  if (!assistantId) return json({ error: "vapi_assistant_id is required" }, 400);
  if (!dispatchPhone) {
    return json({ error: "dispatch_phone must be E.164, e.g. +14165551234" }, 400);
  }
  if (!ownerPhone) {
    return json({ error: "owner_phone must be E.164, e.g. +14165551234" }, 400);
  }

  // Reject duplicate assistant before insert for a clean error (the column is
  // also UNIQUE at the DB level, which is the real guard).
  const { data: existing } = await supabase!
    .from("clients").select("id").eq("vapi_assistant_id", assistantId).limit(1);
  if (existing && existing.length > 0) {
    return json({ error: "a client with that vapi_assistant_id already exists" }, 409);
  }

  const row = pickWritable(body);
  if ("fallback_number" in row) {
    const fb = normalizePhone(row.fallback_number);
    if (row.fallback_number && !fb) return json({ error: "fallback_number must be E.164" }, 400);
    row.fallback_number = fb;
  }
  row.business_name = businessName;
  row.vapi_assistant_id = assistantId;
  row.dispatch_phone = dispatchPhone;
  row.owner_phone = ownerPhone;
  // New clients start inactive: the billing flow (sign + pay) flips active=true
  // via recomputeActive. Never let a client be born active before onboarding.
  row.active = false;

  const { data, error } = await supabase!.from("clients").insert(row).select();
  if (error) return json({ error: error.message }, 400);
  console.log(`[admin] created client business=${JSON.stringify(businessName)} assistant=${assistantId}`);
  return json({ created: true, client: data?.[0] ?? null }, 201);
}

async function updateClientRow(id: string, body: Record<string, unknown>): Promise<Response> {
  const patch = pickWritable(body);
  if ("dispatch_phone" in patch) {
    const normalized = normalizePhone(patch.dispatch_phone);
    if (!normalized) return json({ error: "dispatch_phone must be E.164" }, 400);
    patch.dispatch_phone = normalized;
  }
  if ("owner_phone" in patch) {
    const normalized = normalizePhone(patch.owner_phone);
    if (!normalized) return json({ error: "owner_phone must be E.164" }, 400);
    patch.owner_phone = normalized;
  }
  // fallback_number feeds the Vapi fallbackDestination — validate it like the others
  // so garbage can't be saved (an empty string clears it).
  if ("fallback_number" in patch) {
    const raw = typeof patch.fallback_number === "string" ? patch.fallback_number.trim() : "";
    if (raw === "") patch.fallback_number = null;
    else {
      const normalized = normalizePhone(patch.fallback_number);
      if (!normalized) return json({ error: "fallback_number must be E.164" }, 400);
      patch.fallback_number = normalized;
    }
  }
  if (Object.keys(patch).length === 0) {
    return json({ error: "no writable fields in body" }, 400);
  }
  const { data, error } = await supabase!
    .from("clients").update(patch).eq("id", id).select();
  if (error) return json({ error: error.message }, 400);
  if (!data || data.length === 0) return json({ error: "client not found" }, 404);
  console.log(`[admin] updated client=${id} fields=${Object.keys(patch).join(",")}`);
  return json({ updated: true, client: data[0] });
}

async function testSms(id: string): Promise<Response> {
  if (!twilioReady) return json({ error: "twilio not configured" }, 503);
  const { data } = await supabase!
    .from("clients").select("business_name, dispatch_phone").eq("id", id).limit(1);
  if (!data || data.length === 0) return json({ error: "client not found" }, 404);
  const dispatchPhone = normalizePhone(data[0].dispatch_phone);
  if (!dispatchPhone) return json({ error: "client has no valid dispatch_phone" }, 400);
  try {
    const sid = await sendSms(
      dispatchPhone,
      "Dispango test — this number is set up to receive job alerts. No action needed.",
    );
    console.log(`[admin] test sms sent client=${id} to=${dispatchPhone} sid=${sid}`);
    return json({ sent: true, to: dispatchPhone, sid });
  } catch (e) {
    console.log(`[admin] test sms failed client=${id}: ${e}`);
    return json({ error: `twilio send failed: ${e}` }, 502);
  }
}

// The window the monitoring dashboard looks back over for "failed lead texts".
// Wider than the shared collectMonitoring hour so the operator can still see (and
// resend) a lead that failed earlier today, not just in the last 60 minutes.
const FAILED_LEAD_WINDOW_MS = 24 * 60 * 60 * 1000;

// Live monitoring summary for the admin dashboard. Builds on the shared
// collectMonitoring signals (unsent leads + abuse burst — the SAME code the
// scheduled heartbeat-monitor uses) and adds the operator-facing pieces: the
// actual list of failed lead texts (so each can be resent), a per-client "are
// this shop's calls working?" rollup, and the external watchdog's last check-in.
async function health(): Promise<Response> {
  const now = Date.now();
  const summary = await collectMonitoring(supabase!);

  // Pull everything we need in parallel: clients, recent calls, heartbeat row.
  const sinceLeads = new Date(now - FAILED_LEAD_WINDOW_MS).toISOString();
  const twoMinAgo = new Date(now - 2 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const [clientsRes, unsentRes, recentRes, hbRes, services] = await Promise.all([
    supabase!.from("clients").select(
      "id, business_name, dispatch_phone, inbound_number, active, provision_status, provision_error",
    ),
    supabase!.from("calls").select(
      "vapi_call_id, client_id, caller_phone, outcome, ended_at, door_type, damage_description, summary, notified_phone",
    ).is("notified_at", null).gte("ended_at", sinceLeads).lte("ended_at", twoMinAgo)
      .order("ended_at", { ascending: false }),
    supabase!.from("calls").select("client_id, ended_at, notified_at, outcome")
      .gte("ended_at", dayAgo),
    supabase!.from("ops_heartbeat").select("last_run_at, last_ok, last_problems").eq("id", 1).limit(1),
    collectServices(),
  ]);

  const clients = clientsRes.data ?? [];
  const clientById: Record<string, any> = {};
  for (const c of clients) clientById[c.id] = c;

  const isLead = isLeadOutcome;

  // Failed lead texts: real leads that ended (>2min ago) with no dispatch SMS.
  const failedLeads = (unsentRes.data ?? []).filter((c) => isLead(c.outcome)).map((c) => ({
    vapi_call_id: c.vapi_call_id,
    client_id: c.client_id,
    business_name: clientById[c.client_id]?.business_name ?? null,
    caller_phone: c.caller_phone,
    outcome: c.outcome,
    ended_at: c.ended_at,
    job: [c.door_type ? String(c.door_type).replace(/_/g, " ") : null, c.damage_description]
      .filter(Boolean).join(" — ") || null,
  }));

  // Per-client rollup: calls today, unsent leads today, live-routing state.
  const perClientAgg: Record<string, { calls: number; unsent: number }> = {};
  for (const r of recentRes.data ?? []) {
    const id = r.client_id as string;
    if (!id) continue;
    const agg = perClientAgg[id] ?? (perClientAgg[id] = { calls: 0, unsent: 0 });
    agg.calls++;
    if (!r.notified_at && isLead(r.outcome)) agg.unsent++;
  }
  const perClient = clients
    .filter((c) => c.active || c.provision_status === "staged" || c.provision_status === "error")
    .map((c) => {
      const agg = perClientAgg[c.id] ?? { calls: 0, unsent: 0 };
      const routable = c.active && ["active", "none"].includes(c.provision_status);
      let status = "ok", note = "Calls route to the AI.";
      if (!c.inbound_number) { status = "warn"; note = "No phone number assigned yet."; }
      else if (c.provision_status === "error") { status = "bad"; note = "Number wiring failed — retry provisioning."; }
      else if (c.provision_status === "staged") { status = "warn"; note = "Number is prepared but not activated — calls forward to the shop."; }
      else if (!c.active) { status = "off"; note = "Inactive — not billed/live."; }
      else if (agg.unsent > 0) { status = "bad"; note = `${agg.unsent} lead text(s) didn't send.`; }
      return {
        id: c.id, business_name: c.business_name, inbound_number: c.inbound_number,
        active: c.active, provision_status: c.provision_status, routable,
        callsToday: agg.calls, unsentToday: agg.unsent, status, note,
      };
    });

  const hb = hbRes.data?.[0] ?? null;

  return json({
    ...summary,
    failedLeads,
    perClient,
    services,
    heartbeat: hb
      ? { lastRunAt: hb.last_run_at, ok: hb.last_ok, problems: hb.last_problems }
      : { lastRunAt: null, ok: null, problems: null },
  });
}

// --- Troubleshooting: synthetic "place a test call" ------------------------

type Check = { key: string; label: string; ok: boolean | null; detail: string };

// End-to-end routing check for one shop WITHOUT a real call — the tool the spec
// (§F) says would have caught the two server-URL regressions. It inspects the two
// links a real call travels: (1) the Vapi phone-number resource (is it imported,
// does its server URL point at THIS webhook and not a dead host, is it dynamically
// routed with a fallback?), and (2) a synthetic assistant-request replayed to the
// live webhook (does the shop resolve, with the right business name?).
async function testCall(id: string): Promise<Response> {
  const { data } = await supabase!.from("clients").select("*").eq("id", id).limit(1);
  const c = data?.[0];
  if (!c) return json({ error: "client not found" }, 404);

  const checks: Check[] = [];
  const inbound = normalizePhone(c.inbound_number);

  // 1. Number assigned.
  checks.push({
    key: "inbound", label: "Phone number assigned",
    ok: !!inbound,
    detail: inbound ? `Calls come in on ${inbound}.` : "No inbound number on this shop yet — run provisioning.",
  });

  // 2. Dispatch number valid (leads have somewhere to go).
  const dispatch = normalizePhone(c.dispatch_phone);
  checks.push({
    key: "dispatch", label: "Lead texts have a destination",
    ok: !!dispatch,
    detail: dispatch ? `Leads text to ${dispatch}.` : "No valid dispatch phone — leads can't be delivered.",
  });

  // 3. Vapi phone-number wiring — the regression hot-spot.
  let vapiNumber: any = null;
  if (!inbound) {
    checks.push({ key: "vapi_routing", label: "Vapi routing", ok: false, detail: "Skipped — no number to check." });
  } else if (!VAPI_PRIVATE_KEY) {
    checks.push({ key: "vapi_routing", label: "Vapi routing", ok: null, detail: "Can't check — VAPI_PRIVATE_KEY not set on the admin function." });
  } else {
    try {
      vapiNumber = await vapiFindNumber(inbound);
      if (!vapiNumber) {
        checks.push({ key: "vapi_routing", label: "Vapi routing", ok: false, detail: `${inbound} is not imported into Vapi — run provisioning to wire it.` });
      } else {
        const serverUrl = String(vapiNumber?.server?.url ?? "");
        const shownUrl = redactToken(serverUrl); // never surface VAPI_SECRET to the operator
        const pointsHere = !!WEBHOOK_BASE && serverUrl.startsWith(WEBHOOK_BASE);
        const dead = /onrender\.com|localhost|ngrok/i.test(serverUrl);
        const hasToken = /[?&]token=/.test(serverUrl);
        const dynamic = !vapiNumber?.assistantId && !vapiNumber?.squadId;
        const hasFallback = !!vapiNumber?.fallbackDestination?.number;

        checks.push({
          key: "vapi_server_url", label: "Number points at this server",
          ok: pointsHere && !dead,
          detail: !serverUrl
            ? "The number has NO server URL — live calls won't reach us. Click Repair routing."
            : dead
              ? `Server URL points at a dead host (${shownUrl}). Click Repair routing.`
              : pointsHere
                ? "Server URL points at this webhook. ✓"
                : `Server URL points somewhere unexpected (${shownUrl}). Click Repair routing.`,
        });
        checks.push({
          key: "vapi_token", label: "Server URL carries the auth token",
          ok: hasToken,
          detail: hasToken ? "The ?token is present. ✓" : "No ?token on the server URL — the webhook will reject calls. Click Repair routing.",
        });
        checks.push({
          key: "vapi_dynamic", label: "Dynamic routing (per-shop identity works)",
          ok: dynamic,
          detail: dynamic ? "No hard-coded assistant — greeting variables fill in correctly. ✓" : "A static assistant is pinned to the number — {{business_name}} etc. render literally. Click Repair routing.",
        });
        checks.push({
          key: "vapi_fallback", label: "Fallback to the shop's phone",
          ok: hasFallback,
          detail: hasFallback ? `Falls back to ${vapiNumber.fallbackDestination.number} if we hiccup. ✓` : "No fallback number — a hiccup drops the call instead of forwarding.",
        });
      }
    } catch (e) {
      checks.push({ key: "vapi_routing", label: "Vapi routing", ok: false, detail: `Couldn't reach Vapi: ${e}` });
    }
  }

  // 4. Live webhook resolves this shop — replay a synthetic assistant-request.
  if (!inbound) {
    checks.push({ key: "webhook", label: "Webhook recognizes this shop", ok: false, detail: "Skipped — no number." });
  } else if (!WEBHOOK_BASE || !VAPI_SECRET) {
    checks.push({ key: "webhook", label: "Webhook recognizes this shop", ok: null, detail: "Can't check — VAPI_SECRET not set on the admin function." });
  } else {
    try {
      const resp = await fetch(`${WEBHOOK_BASE}?token=${encodeURIComponent(VAPI_SECRET)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: { type: "assistant-request", call: { phoneNumber: { number: inbound } } },
        }),
      });
      const body = await resp.json().catch(() => ({}));
      const vars = body?.assistantOverrides?.variableValues ?? {};
      const resolvedName = String(vars.business_name ?? "");
      const gotAssistant = !!body?.assistantId;
      const live = ["active", "none"].includes(c.provision_status) && c.active;
      if (live) {
        const nameOk = !c.business_name || resolvedName === c.business_name;
        checks.push({
          key: "webhook", label: "Webhook recognizes this shop",
          ok: gotAssistant && nameOk,
          detail: gotAssistant
            ? (nameOk ? `Resolves to "${resolvedName || "(no name)"}" with an assistant. ✓` : `Resolved the wrong shop name: "${resolvedName}" (expected "${c.business_name}").`)
            : "Webhook returned no assistant — calls won't be answered by the AI.",
        });
      } else {
        // Staged/error/inactive SHOULD be withheld (call forwards to the shop).
        checks.push({
          key: "webhook", label: "Webhook holds this shop back (not live yet)",
          ok: !gotAssistant,
          detail: !gotAssistant
            ? "Correctly withheld — calls forward to the shop until you activate. ✓"
            : "Webhook is answering as this shop even though it isn't live — unexpected.",
        });
      }
    } catch (e) {
      // Deno's fetch error text can embed the full request URL (with ?token=) — redact it.
      checks.push({ key: "webhook", label: "Webhook recognizes this shop", ok: false, detail: `Couldn't reach the webhook: ${redactToken(String(e))}` });
    }
  }

  const failing = checks.filter((c) => c.ok === false);
  const ok = failing.length === 0;
  const repairable = checks.some((c) =>
    c.ok === false && ["vapi_server_url", "vapi_token", "vapi_dynamic", "vapi_fallback", "vapi_routing"].includes(c.key));
  return json({ ok, checks, repairable, business_name: c.business_name });
}

// --- Troubleshooting: repair a broken Vapi server URL ----------------------

// Re-point an already-imported Vapi number at THIS webhook (correct server URL +
// token + fallback), the guided fix for a detected routing regression. Retrying
// provisioning does NOT fix this — its Vapi step is find-or-create and no-ops on
// an existing number — so a bad server URL needs an explicit PATCH, which is this.
async function repairRouting(id: string): Promise<Response> {
  if (!VAPI_PRIVATE_KEY || !VAPI_SECRET || !WEBHOOK_BASE) {
    return json({ error: "repair unavailable — VAPI_PRIVATE_KEY / VAPI_SECRET not set on the admin function" }, 503);
  }
  const { data } = await supabase!.from("clients").select("*").eq("id", id).limit(1);
  const c = data?.[0];
  if (!c) return json({ error: "client not found" }, 404);
  const inbound = normalizePhone(c.inbound_number);
  if (!inbound) return json({ error: "no inbound number to repair — run provisioning first" }, 400);

  try {
    const num = await vapiFindNumber(inbound);
    if (!num?.id) return json({ error: `${inbound} is not imported into Vapi — run provisioning to wire it` }, 409);
    const fallback = normalizePhone(c.fallback_number) ?? normalizePhone(c.owner_phone) ?? normalizePhone(c.dispatch_phone);
    const patch: Record<string, unknown> = {
      server: { url: `${WEBHOOK_BASE}?token=${encodeURIComponent(VAPI_SECRET)}` },
      // Clear any pinned assistant/squad so routing stays dynamic (per-shop vars work).
      assistantId: null,
      squadId: null,
    };
    // Re-send the Twilio credential linkage (same account that provisioning's POST
    // sends). Vapi's PATCH for some resources REPLACES rather than merges (see the
    // model-PATCH note in CLAUDE.md); re-including these makes repair safe under
    // either semantic — a fix must never wipe the number's ability to place calls.
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      patch.provider = "twilio";
      patch.twilioAccountSid = TWILIO_ACCOUNT_SID;
      patch.twilioAuthToken = TWILIO_AUTH_TOKEN;
    }
    if (fallback) patch.fallbackDestination = { type: "number", number: fallback };
    const resp = await vapiFetch(`/phone-number/${num.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!resp.ok) {
      // The patch body carries twilioAuthToken; a Vapi 4xx can echo rejected field
      // values back. Log the body server-side only — never return it to the operator.
      console.log(`[admin] repair patch failed client=${id} vapi ${resp.status}: ${await resp.text()}`);
      return json({ error: `vapi rejected the repair (status ${resp.status}) — see function logs` }, 502);
    }
    console.log(`[admin] repaired routing client=${id} number=${inbound}`);
    return json({ repaired: true, number: inbound });
  } catch (e) {
    console.log(`[admin] repair failed client=${id}: ${e}`);
    return json({ error: String(e) }, 502);
  }
}

// --- Troubleshooting: resend a failed lead SMS -----------------------------

// Re-send the dispatch text for a persisted call whose SMS never went out (or,
// with force, one that did). Rebuilds the text from the stored row and stamps
// notified_at so a normal webhook retry won't then double-send. Idempotency guard:
// refuses a row that already has notified_at unless force=true.
async function resendSms(callId: string, force: boolean): Promise<Response> {
  if (!twilioReady) return json({ error: "twilio not configured" }, 503);
  const { data } = await supabase!.from("calls").select("*").eq("vapi_call_id", callId).limit(1);
  const row = data?.[0];
  if (!row) return json({ error: "call not found" }, 404);
  const { data: clientRows } = await supabase!
    .from("clients").select("dispatch_phone, timezone").eq("id", row.client_id).limit(1);
  const dispatch = normalizePhone(clientRows?.[0]?.dispatch_phone);
  if (!dispatch) return json({ error: "client has no valid dispatch phone" }, 400);
  const tz = clientRows?.[0]?.timezone || DEFAULT_TZ;

  // Claim the row BEFORE sending, exactly like the webhook's sendDispatchSms — an
  // atomic conditional update, not a check-then-act — so two concurrent resends
  // (or a double-click) can never both send. Without `force` the claim only lands
  // when notified_at IS NULL (a genuinely failed/unsent lead); with `force` the
  // operator is deliberately overriding a prior send, so claim unconditionally.
  const claimTs = new Date().toISOString();
  let claim = supabase!.from("calls")
    .update({ notified_at: claimTs, notified_phone: dispatch })
    .eq("vapi_call_id", callId);
  if (!force) claim = claim.is("notified_at", null);
  const { data: claimed, error: claimErr } = await claim.select();
  if (claimErr) return json({ error: claimErr.message }, 400);
  if (!claimed || claimed.length === 0) {
    return json({ error: "this lead was already texted — pass force to send it again", notified_at: row.notified_at }, 409);
  }

  try {
    const sid = await sendSms(dispatch, composeSmsBody(row, tz));
    console.log(`[admin] resent lead sms call=${callId} to=${dispatch} sid=${sid}`);
    return json({ sent: true, to: dispatch, sid });
  } catch (e) {
    // Release the claim so a later resend can retry — mirrors the webhook.
    await supabase!.from("calls")
      .update({ notified_at: row.notified_at ?? null, notified_phone: row.notified_phone ?? null })
      .eq("vapi_call_id", callId);
    console.log(`[admin] resend sms failed call=${callId}: ${e}`);
    return json({ error: `twilio send failed: ${e}` }, 502);
  }
}

// --- Calls / leads inspection ---------------------------------------------

const CALL_LIST_FIELDS =
  "vapi_call_id, client_id, caller_phone, caller_name, outcome, urgency, door_type, damage_description, service_address, ended_at, duration_seconds, notified_at";

function jobLabel(row: Record<string, any>): string | null {
  const door = row.door_type ? String(row.door_type).replace(/_/g, " ") : null;
  return [door, row.damage_description].filter(Boolean).join(" — ") || null;
}

// Recent calls/leads, newest first. Optional ?client_id, ?outcome, ?limit.
// The support/debugging lifeline — see what a caller actually said and whether
// the lead texted out. Returns light rows; full transcript is in the detail route.
async function getCalls(params: URLSearchParams): Promise<Response> {
  const clientId = params.get("client_id");
  const outcome = params.get("outcome");
  let limit = Number(params.get("limit") ?? "60");
  if (!Number.isFinite(limit) || limit <= 0) limit = 60;
  limit = Math.min(limit, 200);

  let q = supabase!.from("calls").select(CALL_LIST_FIELDS)
    .not("ended_at", "is", null).order("ended_at", { ascending: false }).limit(limit);
  if (clientId) q = q.eq("client_id", clientId);
  if (outcome) q = q.eq("outcome", outcome);
  const { data, error } = await q;
  if (error) return json({ error: error.message }, 400);

  const ids = [...new Set((data ?? []).map((r) => r.client_id).filter(Boolean))];
  const nameById: Record<string, string> = {};
  if (ids.length) {
    const { data: cs } = await supabase!.from("clients").select("id, business_name").in("id", ids);
    for (const c of cs ?? []) nameById[c.id] = c.business_name;
  }
  const calls = (data ?? []).map((r) => ({
    ...r, business_name: nameById[r.client_id] ?? null, job: jobLabel(r),
  }));
  return json({ calls });
}

// One call in full: structured fields, transcript, recording link, delivery.
async function getCallDetail(callId: string): Promise<Response> {
  const { data } = await supabase!.from("calls").select("*").eq("vapi_call_id", callId).limit(1);
  const row = data?.[0];
  if (!row) return json({ error: "call not found" }, 404);
  // Recording link lives in the stored Vapi end-of-call payload, not its own column.
  const artifact = row.raw_payload?.message?.artifact ?? {};
  const recordingUrl = artifact.recordingUrl ?? artifact.stereoRecordingUrl ?? artifact.recording?.stereoUrl ?? null;
  let business_name: string | null = null, dispatch_phone: string | null = null;
  if (row.client_id) {
    const { data: c } = await supabase!.from("clients").select("business_name, dispatch_phone").eq("id", row.client_id).limit(1);
    business_name = c?.[0]?.business_name ?? null;
    dispatch_phone = c?.[0]?.dispatch_phone ?? null;
  }
  const { raw_payload: _drop, ...rest } = row; // raw payload is large — omit
  return json({ call: { ...rest, business_name, dispatch_phone, recordingUrl, job: jobLabel(row) } });
}

// --- Analytics (the ROI story) --------------------------------------------

// The shop-local hour of a timestamp (0–23), for the after-hours count.
function localHour(iso: string, tz: string): number | null {
  const d = parseIso(iso);
  if (!d) return null;
  const h = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(d);
  const n = parseInt(h, 10);
  return Number.isFinite(n) ? (n === 24 ? 0 : n) : null;
}

// Rolling 7-day metrics: volume, leads captured, conversion, after-hours catches
// (the product's actual pitch), avg duration, outcome mix, and a daily series.
async function getAnalytics(): Promise<Response> {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
  const dayStart = new Date(now - 24 * 3600 * 1000).toISOString();

  const [callsRes, clientsRes] = await Promise.all([
    supabase!.from("calls").select("client_id, outcome, ended_at, duration_seconds, notified_at").gte("ended_at", weekAgo),
    supabase!.from("clients").select("id, timezone"),
  ]);
  const tzById: Record<string, string> = {};
  for (const c of clientsRes.data ?? []) tzById[c.id] = c.timezone || DEFAULT_TZ;

  const rows = callsRes.data ?? [];
  const isLead = isLeadOutcome;

  let leads = 0, afterHours = 0, durSum = 0, durN = 0, today = 0, leadsToday = 0;
  const outcomeMix: Record<string, number> = {};
  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i--) dayKeys.push(new Date(now - i * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const daily: Record<string, number> = Object.fromEntries(dayKeys.map((k) => [k, 0]));

  for (const r of rows) {
    const lead = isLead(r.outcome);
    if (lead) leads++;
    const oc = String(r.outcome ?? "unknown").trim().toLowerCase().replace(/ /g, "_") || "unknown";
    outcomeMix[oc] = (outcomeMix[oc] ?? 0) + 1;
    if (typeof r.duration_seconds === "number") { durSum += r.duration_seconds; durN++; }
    const dk = String(r.ended_at ?? "").slice(0, 10);
    if (dk in daily) daily[dk]++;
    if (r.ended_at && r.ended_at >= dayStart) { today++; if (lead) leadsToday++; }
    if (lead) {
      const h = localHour(r.ended_at, tzById[r.client_id] ?? DEFAULT_TZ);
      if (h !== null && (h < 8 || h >= 18)) afterHours++;
    }
  }
  const total = rows.length;
  return json({
    windowDays: 7,
    totalCalls: total,
    leads,
    conversion: total ? Math.round((leads / total) * 100) : 0,
    afterHours,
    callsToday: today,
    leadsToday,
    avgDurationSec: durN ? Math.round(durSum / durN) : null,
    outcomeMix,
    daily: dayKeys.map((k) => ({ day: k, calls: daily[k] })),
  });
}

// --- Service / dependency board -------------------------------------------

// Twilio account balance — a dead-simple GET that answers "will our texts even
// send?" (an empty Twilio account silently fails every dispatch SMS).
async function twilioBalance(): Promise<{ configured: boolean; ok: boolean; balance: number | null; currency: string | null; low: boolean }> {
  if (!twilioReady) return { configured: false, ok: false, balance: null, currency: null, low: false };
  try {
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Balance.json`, {
      headers: { Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`) },
    });
    if (!resp.ok) return { configured: true, ok: false, balance: null, currency: null, low: false };
    const d = await resp.json();
    const bal = Number(d.balance);
    const min = Number(Deno.env.get("TWILIO_BALANCE_MIN") ?? "10");
    return { configured: true, ok: true, balance: isNaN(bal) ? null : bal, currency: d.currency ?? "USD", low: !isNaN(bal) && bal < min };
  } catch {
    return { configured: true, ok: false, balance: null, currency: null, low: false };
  }
}

// "Is anything upstream broken right now?" — one board over the services a call
// depends on, so the operator checks dependencies before chasing symptoms.
async function collectServices(): Promise<Record<string, unknown>> {
  const [twilio, webhookUp] = await Promise.all([
    twilioBalance(),
    (async () => {
      if (!WEBHOOK_BASE) return null;
      try {
        const r = await fetch(WEBHOOK_BASE, { method: "GET" });
        return r.ok;
      } catch { return false; }
    })(),
  ]);
  return {
    twilio,
    // Vapi exposes no balance via the private key — surface only whether we can
    // inspect it at all (the test-call/repair tools need VAPI_PRIVATE_KEY).
    vapi: { configured: !!VAPI_PRIVATE_KEY },
    webhook: { up: webhookUp },
    database: { up: true }, // if this endpoint answered, our Supabase queries worked
  };
}

async function listBanned(): Promise<Response> {
  const { data, error } = await supabase!
    .from("banned_callers").select("*").order("created_at", { ascending: false });
  if (error) return json({ error: error.message }, 400);
  return json({ banned: data ?? [] });
}

async function banCaller(body: Record<string, unknown>): Promise<Response> {
  const phone = normalizePhone(body.caller_phone);
  if (!phone) return json({ error: "caller_phone must be E.164, e.g. +14165551234" }, 400);
  const reason = typeof body.reason === "string" ? (body.reason.trim() || null) : null;
  const { data, error } = await supabase!
    .from("banned_callers").upsert({ caller_phone: phone, reason }, { onConflict: "caller_phone" }).select();
  if (error) return json({ error: error.message }, 400);
  console.log(`[admin] banned caller=${phone}`);
  return json({ banned: true, caller: data?.[0] ?? null }, 201);
}

async function unbanCaller(phone: string): Promise<Response> {
  const normalized = normalizePhone(phone);
  if (!normalized) return json({ error: "invalid phone" }, 400);
  const { data, error } = await supabase!
    .from("banned_callers").delete().eq("caller_phone", normalized).select();
  if (error) return json({ error: error.message }, 400);
  if (!data || data.length === 0) return json({ error: "not found" }, 404);
  console.log(`[admin] unbanned caller=${normalized}`);
  return json({ unbanned: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Strip any `/functions/v1` and the `/admin` function-name prefix so routing
  // works the same locally and when deployed.
  const path = new URL(req.url).pathname
    .replace(/^\/functions\/v1/, "")
    .replace(/^\/admin(?=\/|$)/, "") || "/";

  if (req.method === "GET" && (path === "/" || path === "")) {
    return json({ status: "ok" });
  }

  // --- auth gate (fail closed) ---
  if (!ADMIN_API_TOKEN) return json({ error: "admin API not configured" }, 503);
  if (!constantTimeEqual(req.headers.get("x-admin-token") ?? "", ADMIN_API_TOKEN)) {
    console.log("[admin] rejected: bad/missing token");
    return json({ error: "unauthorized" }, 401);
  }
  if (!supabase) return json({ error: "supabase not configured" }, 503);

  try {
    if (req.method === "GET" && path === "/clients") {
      const { data, error } = await supabase
        .from("clients").select("*").order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ clients: data ?? [] });
    }

    if (req.method === "POST" && path === "/clients") {
      return await createClientRow(await req.json());
    }

    const testMatch = path.match(/^\/clients\/([^/]+)\/test-sms$/);
    if (req.method === "POST" && testMatch) {
      return await testSms(testMatch[1]);
    }

    const testCallMatch = path.match(/^\/clients\/([^/]+)\/test-call$/);
    if (req.method === "POST" && testCallMatch) {
      return await testCall(testCallMatch[1]);
    }

    const repairMatch = path.match(/^\/clients\/([^/]+)\/repair-routing$/);
    if (req.method === "POST" && repairMatch) {
      return await repairRouting(repairMatch[1]);
    }

    const resendMatch = path.match(/^\/calls\/([^/]+)\/resend-sms$/);
    if (req.method === "POST" && resendMatch) {
      const force = new URL(req.url).searchParams.get("force") === "1";
      return await resendSms(decodeURIComponent(resendMatch[1]), force);
    }

    if (req.method === "GET" && path === "/calls") {
      return await getCalls(new URL(req.url).searchParams);
    }
    const callDetailMatch = path.match(/^\/calls\/([^/]+)$/);
    if (req.method === "GET" && callDetailMatch) {
      return await getCallDetail(decodeURIComponent(callDetailMatch[1]));
    }

    if (req.method === "GET" && path === "/analytics") {
      return await getAnalytics();
    }

    const itemMatch = path.match(/^\/clients\/([^/]+)$/);
    if (req.method === "PATCH" && itemMatch) {
      return await updateClientRow(itemMatch[1], await req.json());
    }

    if (req.method === "GET" && path === "/health") {
      return await health();
    }
    if (req.method === "GET" && path === "/banned") {
      return await listBanned();
    }
    if (req.method === "POST" && path === "/banned") {
      return await banCaller(await req.json());
    }
    const banMatch = path.match(/^\/banned\/([^/]+)$/);
    if (req.method === "DELETE" && banMatch) {
      return await unbanCaller(decodeURIComponent(banMatch[1]));
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    console.log(`[admin] error: ${e}`);
    return json({ error: String(e) }, 500);
  }
});
