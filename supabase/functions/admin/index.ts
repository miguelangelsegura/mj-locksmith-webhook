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

const PHONE_RE = /^\+\d{10,15}$/;

// Columns the admin tool is allowed to set. Anything else in the body is ignored
// so the tool can't write arbitrary/computed columns (id, created_at, etc.).
const WRITABLE_FIELDS = [
  "business_name", "agent_name", "vapi_assistant_id", "dispatch_phone",
  "owner_phone", "inbound_number", "cell_number", "answer_mode",
  "ring_timeout_seconds", "business_hours", "timezone", "active",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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

    const itemMatch = path.match(/^\/clients\/([^/]+)$/);
    if (req.method === "PATCH" && itemMatch) {
      return await updateClientRow(itemMatch[1], await req.json());
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    console.log(`[admin] error: ${e}`);
    return json({ error: String(e) }, 500);
  }
});
