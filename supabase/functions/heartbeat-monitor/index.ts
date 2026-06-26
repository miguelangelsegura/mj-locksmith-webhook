// Heartbeat monitor — scheduled health + abuse check.
//
// Invoked on a schedule (external cron POSTing this URL with ?token=$VAPI_SECRET;
// see docs/MONITORING.md). On each run it checks our OWN data for trouble and
// alerts ops via SMS (+ email if Resend is configured):
//   1. Unsent dispatch  — leads that ended but never got their SMS (Twilio/dispatch failing).
//   2. Abuse burst      — one caller making an unusual number of calls in the last hour.
//   3. Vapi low balance — best-effort, DISABLED until a working balance endpoint is wired
//                          (Vapi exposes none via the private key today; rely on the
//                          dashboard auto-reload as the real safety net).
// Reliable signals come from our DB; the function always returns a JSON summary.

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const VAPI_SECRET = Deno.env.get("VAPI_SECRET");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
const OPS_PHONE = Deno.env.get("OPS_PHONE");
const twilioReady = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_MESSAGING_SERVICE_SID);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ALERT_EMAIL = Deno.env.get("ALERT_EMAIL");
const ALERT_FROM_EMAIL = Deno.env.get("ALERT_FROM_EMAIL") ?? "alerts@dispango.com";

const NON_LEAD_OUTCOMES = new Set(["wrong_number", "spam", "info_only"]);
const ABUSE_BURST_THRESHOLD = Number(Deno.env.get("ABUSE_BURST_THRESHOLD") ?? "6");

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sendSms(to: string, body: string): Promise<void> {
  if (!twilioReady) return;
  const params = new URLSearchParams({ To: to, MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID!, Body: body });
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
}

async function sendEmail(subject: string, text: string): Promise<void> {
  if (!RESEND_API_KEY || !ALERT_EMAIL) return; // email channel optional
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: ALERT_FROM_EMAIL, to: ALERT_EMAIL, subject, text }),
  });
  if (!resp.ok) throw new Error(`resend ${resp.status}: ${await resp.text()}`);
}

async function alert(subject: string, message: string): Promise<void> {
  try {
    if (OPS_PHONE) await sendSms(OPS_PHONE, `[heartbeat] ${message}`.slice(0, 300));
  } catch (e) {
    console.log(`[heartbeat] sms alert failed: ${e}`);
  }
  try {
    await sendEmail(`[Dispango] ${subject}`, message);
  } catch (e) {
    console.log(`[heartbeat] email alert failed: ${e}`);
  }
}

async function checkVapiBalance(): Promise<string | null> {
  // Disabled until a working balance endpoint is wired. Vapi exposes no balance
  // via the private key today (account/credits/org all 404/401). Set VAPI_BALANCE_URL
  // once a working endpoint is found; meanwhile rely on Vapi dashboard auto-reload.
  const url = Deno.env.get("VAPI_BALANCE_URL");
  const key = Deno.env.get("VAPI_PRIVATE_KEY");
  if (!url || !key) return null;
  try {
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${key}`, "User-Agent": "Mozilla/5.0" } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const bal = Number(data.balance ?? data.credits ?? NaN);
    const min = Number(Deno.env.get("VAPI_BALANCE_MIN") ?? "20");
    return (!isNaN(bal) && bal < min) ? `Vapi balance low: $${bal} (min $${min})` : null;
  } catch (e) {
    console.log(`[heartbeat] balance check failed: ${e}`);
    return null;
  }
}

Deno.serve(async (req) => {
  if (VAPI_SECRET) {
    const token = new URL(req.url).searchParams.get("token") ?? "";
    const provided = req.headers.get("x-vapi-secret") || token;
    if (!constantTimeEqual(provided, VAPI_SECRET)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  if (!supabase) return Response.json({ error: "supabase not configured" }, { status: 503 });

  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const twoMinAgo = new Date(now - 2 * 60 * 1000).toISOString();
  const problems: string[] = [];

  // 1. Unsent dispatch (lead ended >2min ago, still no SMS).
  const { data: unsent } = await supabase
    .from("calls")
    .select("vapi_call_id, outcome, caller_phone")
    .is("notified_at", null)
    .gte("ended_at", hourAgo)
    .lte("ended_at", twoMinAgo);
  const unsentLeads = (unsent ?? []).filter((c) =>
    !NON_LEAD_OUTCOMES.has(String(c.outcome ?? "").trim().toLowerCase().replace(/ /g, "_"))
  );
  if (unsentLeads.length > 0) {
    problems.push(`${unsentLeads.length} lead(s) ended in the last hour with NO dispatch SMS — Twilio/dispatch may be failing.`);
  }

  // 2. Abuse burst (one number, many calls in the last hour).
  const { data: recent } = await supabase
    .from("calls")
    .select("caller_phone")
    .gte("ended_at", hourAgo)
    .not("caller_phone", "is", null);
  const counts: Record<string, number> = {};
  for (const r of recent ?? []) counts[r.caller_phone as string] = (counts[r.caller_phone as string] ?? 0) + 1;
  const abusers = Object.entries(counts).filter(([, n]) => n >= ABUSE_BURST_THRESHOLD);
  if (abusers.length > 0) {
    problems.push(`Possible abuse: ${abusers.map(([p, n]) => `${p} (${n} calls/hr)`).join(", ")}. Consider banning via the admin tool.`);
  }

  // 3. Vapi balance (best-effort, usually disabled).
  const balanceProblem = await checkVapiBalance();
  if (balanceProblem) problems.push(balanceProblem);

  if (problems.length > 0) {
    await alert("Heartbeat alert", problems.join(" "));
  }

  const summary = {
    ok: problems.length === 0,
    checkedAt: new Date(now).toISOString(),
    unsentLeads: unsentLeads.length,
    abusers: abusers.map(([p, n]) => ({ phone: p, calls: n })),
    problems,
  };
  console.log(`[heartbeat] ${JSON.stringify(summary)}`);
  return Response.json(summary);
});
