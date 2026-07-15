// Customer dashboard API for the signed-in locksmith.
//
// The browser reads its OWN leads/analytics directly from Supabase under RLS
// (anon key + the user's JWT). This function handles the two things the browser
// must NOT do itself:
//   1. link a fresh Supabase Auth user to their `clients` row (privileged), and
//   2. WRITE the customer-editable settings (validated, scoped to the caller).
//
// Auth: the caller presents their Supabase Auth JWT as `Authorization: Bearer …`.
// We validate it with auth.getUser(token) and then use the SERVICE-ROLE client for
// DB work — every write is constrained to `where auth_uid = <caller>` so a valid
// token can only ever touch its own shop. verify_jwt = false in config.toml because
// we do the check here (and need to read the user off the token ourselves).
//
// Routes (mounted at /functions/v1/dashboard):
//   GET   /me           authenticate; claim/return the caller's shop profile
//   PATCH /settings      update the caller's editable settings (validated)
//   POST  /test-text     send a test SMS to a candidate lead-delivery number

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null;
if (!supabase) console.log("[startup] Supabase env not set — dashboard API in log-only mode");

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
const twilioReady = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_MESSAGING_SERVICE_SID);

const PHONE_RE = /^\+\d{10,15}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TEXT_MAX = 2000;

// The safe profile columns returned to the browser — the caller's own shop data.
// Deliberately excludes internal/secret columns (onboarding_token, stripe ids,
// signed_pdf_path, raw contract fields).
const PROFILE_COLS =
  "id, business_name, agent_name, contact_email, dispatch_phone, fallback_number, cell_number, " +
  "inbound_number, answer_mode, business_hours, timezone, service_area, services_offered, " +
  "pricing_notes, provision_status, active, subscription_status, plan, created_at";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const stripped = value.trim();
  return PHONE_RE.test(stripped) ? stripped : null;
}

// Escape PostgREST/SQL LIKE wildcards so an email is matched literally (ilike gives
// case-insensitivity; the escape stops a `%`/`_` in an address widening the match).
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, "\\$&");
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

// Authenticate the caller off their Supabase JWT. Returns the auth user or null.
async function authUser(req: Request): Promise<{ id: string; email: string | null; confirmed: boolean } | null> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token || !supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  const u = data.user;
  return { id: u.id, email: u.email ?? null, confirmed: !!u.email_confirmed_at };
}

// Resolve (and, on first login, claim) the caller's shop row. A row is claimed only
// when its contact_email matches the CONFIRMED auth email and it isn't already
// linked — so a login can bind to exactly one shop, and only the shop whose email
// the user has proven they control.
async function resolveClient(user: { id: string; email: string | null; confirmed: boolean }) {
  // Already linked?
  const { data: linked } = await supabase!
    .from("clients").select(PROFILE_COLS).eq("auth_uid", user.id).limit(1);
  if (linked && linked.length) return { client: linked[0], status: 200 as const };

  if (!user.email) return { client: null, status: 403 as const, error: "no email on this account" };
  if (!user.confirmed) return { client: null, status: 403 as const, error: "please confirm your email first" };

  // Match by email (contact_email has a unique index, so at most one).
  const { data: byEmail } = await supabase!
    .from("clients").select("id, auth_uid").ilike("contact_email", escapeLike(user.email)).limit(1);
  const row = byEmail?.[0];
  if (!row) return { client: null, status: 403 as const, error: "no Dispango account is linked to this email" };
  if (row.auth_uid && row.auth_uid !== user.id) {
    return { client: null, status: 403 as const, error: "this shop is already linked to another login" };
  }

  // Claim it. The guard `is('auth_uid', null)` makes the bind atomic — two
  // simultaneous first-logins can't both claim the same row.
  const { data: claimed, error } = await supabase!
    .from("clients").update({ auth_uid: user.id }).eq("id", row.id).is("auth_uid", null)
    .select(PROFILE_COLS);
  if (error) return { client: null, status: 500 as const, error: error.message };
  if (claimed && claimed.length) {
    console.log(`[dashboard] linked auth_uid=${user.id} -> client=${row.id}`);
    return { client: claimed[0], status: 200 as const };
  }
  // Lost the race — re-read by our own uid.
  const { data: reread } = await supabase!
    .from("clients").select(PROFILE_COLS).eq("auth_uid", user.id).limit(1);
  if (reread && reread.length) return { client: reread[0], status: 200 as const };
  return { client: null, status: 403 as const, error: "could not link this account" };
}

function validateBusinessHours(value: unknown): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  if (value === null) return { ok: true, value: null as unknown as Record<string, unknown> };
  if (typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "business_hours must be an object" };
  const out: Record<string, unknown> = {};
  for (const day of DAYS) {
    const d = (value as Record<string, unknown>)[day];
    if (d === undefined) { out[day] = { on: false, open: "09:00", close: "17:00" }; continue; }
    if (typeof d !== "object" || d === null) return { ok: false, error: `business_hours.${day} must be an object` };
    const on = !!(d as any).on;
    const open = String((d as any).open ?? "");
    const close = String((d as any).close ?? "");
    if (!TIME_RE.test(open) || !TIME_RE.test(close)) {
      return { ok: false, error: `business_hours.${day} open/close must be HH:MM (24h)` };
    }
    if (on && open >= close) return { ok: false, error: `business_hours.${day} open must be before close` };
    out[day] = { on, open, close };
  }
  return { ok: true, value: out };
}

function validTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function optText(value: unknown, field: string): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: `${field} must be text` };
  const t = value.trim();
  if (t.length > TEXT_MAX) return { ok: false, error: `${field} is too long (max ${TEXT_MAX} chars)` };
  return { ok: true, value: t || null };
}

async function updateSettings(userId: string, body: Record<string, unknown>): Promise<Response> {
  const patch: Record<string, unknown> = {};

  if ("dispatch_phone" in body) {
    const p = normalizePhone(body.dispatch_phone);
    if (!p) return json({ error: "dispatch_phone must be E.164, e.g. +14165551234" }, 400);
    patch.dispatch_phone = p;
  }
  if ("fallback_number" in body) {
    const raw = typeof body.fallback_number === "string" ? body.fallback_number.trim() : "";
    if (raw === "") patch.fallback_number = null;
    else {
      const p = normalizePhone(body.fallback_number);
      if (!p) return json({ error: "fallback_number must be E.164" }, 400);
      patch.fallback_number = p;
    }
  }
  if ("timezone" in body) {
    if (!validTimezone(body.timezone)) return json({ error: "timezone must be a valid IANA name, e.g. America/Edmonton" }, 400);
    patch.timezone = body.timezone;
  }
  if ("answer_mode" in body) {
    // Customers may only choose 24/7 AI or scheduled AI — not the internal
    // human-first mode. Anything else is rejected.
    if (body.answer_mode !== "ai_first" && body.answer_mode !== "scheduled") {
      return json({ error: "answer_mode must be 'ai_first' (24/7) or 'scheduled'" }, 400);
    }
    patch.answer_mode = body.answer_mode;
  }
  if ("business_hours" in body) {
    const v = validateBusinessHours(body.business_hours);
    if (!v.ok) return json({ error: v.error }, 400);
    patch.business_hours = v.value;
  }
  for (const field of ["service_area", "services_offered", "pricing_notes"]) {
    if (field in body) {
      const v = optText(body[field], field);
      if (!v.ok) return json({ error: v.error }, 400);
      patch[field] = v.value;
    }
  }

  // Switching TO scheduled needs a fallback number to bounce out-of-hours calls to
  // — refuse a config that would otherwise silently keep answering 24/7.
  if (patch.answer_mode === "scheduled") {
    const { data: cur } = await supabase!
      .from("clients").select("fallback_number").eq("auth_uid", userId).limit(1);
    const effectiveFallback = "fallback_number" in patch ? patch.fallback_number : cur?.[0]?.fallback_number;
    if (!effectiveFallback) {
      return json({ error: "Set your shop's phone number (where after-hours calls should ring) before switching to scheduled hours." }, 400);
    }
  }

  if (Object.keys(patch).length === 0) return json({ error: "no editable fields in body" }, 400);

  const { data, error } = await supabase!
    .from("clients").update(patch).eq("auth_uid", userId).select(PROFILE_COLS);
  if (error) return json({ error: error.message }, 400);
  if (!data || data.length === 0) return json({ error: "no shop linked to this account" }, 403);
  console.log(`[dashboard] settings updated user=${userId} fields=${Object.keys(patch).join(",")}`);
  return json({ updated: true, client: data[0] });
}

// Send a test text to a CANDIDATE number so the customer confirms delivery before
// saving it as their lead-delivery number. Does not persist anything.
async function testText(body: Record<string, unknown>): Promise<Response> {
  if (!twilioReady) return json({ error: "texting is not configured right now" }, 503);
  const to = normalizePhone(body.to);
  if (!to) return json({ error: "provide a number in E.164 format, e.g. +14165551234" }, 400);
  try {
    const sid = await sendSms(to, "Dispango test — this is where your job leads will be texted. You're all set.");
    console.log(`[dashboard] test text to=${to} sid=${sid}`);
    return json({ sent: true, to, sid });
  } catch (e) {
    console.log(`[dashboard] test text failed to=${to}: ${e}`);
    return json({ error: "couldn't send the test text — double-check the number" }, 502);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const path = new URL(req.url).pathname
    .replace(/^\/functions\/v1/, "")
    .replace(/^\/dashboard(?=\/|$)/, "") || "/";

  if (req.method === "GET" && (path === "/" || path === "")) {
    return json({ status: "ok" });
  }
  if (!supabase) return json({ error: "dashboard API not configured" }, 503);

  const user = await authUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  try {
    if (req.method === "GET" && path === "/me") {
      const { client, status, error } = await resolveClient(user);
      if (!client) return json({ error: error ?? "no shop linked" }, status);
      return json({ client });
    }
    if (req.method === "PATCH" && path === "/settings") {
      return await updateSettings(user.id, await req.json());
    }
    if (req.method === "POST" && path === "/test-text") {
      return await testText(await req.json());
    }
    return json({ error: "not found" }, 404);
  } catch (e) {
    console.log(`[dashboard] error: ${e}`);
    return json({ error: "something went wrong" }, 500);
  }
});
