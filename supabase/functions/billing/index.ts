// Billing / onboarding API for Dispango.
//
// Turns a closed deal into a paying, contract-signed, live client with one link:
// the locksmith e-signs the contract (SignWell hosted page) and is redirected
// straight into Stripe Checkout to pay. A client only goes `active = true` when
// BOTH the contract is signed AND the subscription is paid; a lapsed
// subscription flips `active = false`, which is the same flag the vapi-webhook
// reads, so the agent stops answering automatically.
//
// Auth differs per route:
//   POST /onboarding              x-admin-token  — Miguel creates the signing link
//   GET  /onboarding/:token/pay   token is auth  — post-sign redirect → Stripe Checkout
//   GET  /onboarding/:token/done  public         — confirmation page
//   POST /webhooks/signwell       SignWell HMAC  — contract signed → store PDF
//   POST /webhooks/stripe         Stripe sig     — paid / lapsed → flip subscription_status
//
// Deploy with verify_jwt = false (see config.toml); the per-route checks above
// are the gates. Mirrors the patterns in ../admin/index.ts.

import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe";
import { provisionForClient, provisioningEnabled } from "./provisioning.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;
if (!supabase) console.log("[startup] Supabase env not set — billing API in log-only mode");

const ADMIN_API_TOKEN = Deno.env.get("ADMIN_API_TOKEN");
if (!ADMIN_API_TOKEN) console.log("[startup] ADMIN_API_TOKEN not set — /onboarding create is DISABLED (fails closed)");

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID");
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() })
  : null;
const stripeCrypto = Stripe.createSubtleCryptoProvider();
if (!stripe) console.log("[startup] STRIPE_SECRET_KEY not set — Stripe disabled");

const SIGNWELL_API_KEY = Deno.env.get("SIGNWELL_API_KEY");
const SIGNWELL_TEMPLATE_ID = Deno.env.get("SIGNWELL_TEMPLATE_ID");
// SignWell signs each webhook with HMAC-SHA256 over "{type}@{time}" keyed by the
// Webhook ID (from the create-webhook response), delivered as `event.hash` in the body.
const SIGNWELL_WEBHOOK_ID = Deno.env.get("SIGNWELL_WEBHOOK_ID");
if (!SIGNWELL_API_KEY) console.log("[startup] SIGNWELL_API_KEY not set — e-sign disabled");

const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OPS_EMAIL = Deno.env.get("OPS_EMAIL");
const OPS_FROM_EMAIL = Deno.env.get("OPS_FROM_EMAIL") || "onboarding@dispango.com";

const PUBLIC_BASE_URL = (Deno.env.get("PUBLIC_BASE_URL") || "").replace(/\/$/, "");
// Where the styled "you're all set" page is hosted (off Supabase, since the
// edge runtime rewrites text/html → text/plain). When unset, fall back to the
// in-function /done route (plain text, but functional).
const PUBLIC_SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") || "").replace(/\/$/, "");
const CONTRACTS_BUCKET = "contracts";

function donePageUrl(token: string): string {
  // Prefer the branded success page on our own site; fall back to the plain
  // in-function /done route when PUBLIC_SITE_URL isn't set.
  return PUBLIC_SITE_URL
    ? `${PUBLIC_SITE_URL}/welcome?token=${encodeURIComponent(token)}`
    : `${PUBLIC_BASE_URL}/billing/onboarding/${token}/done`;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-admin-token",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function html(body: string, status = 200): Response {
  // Served from the *.supabase.co domain, where text/html is rewritten to
  // text/plain — acceptable for these tiny confirmation pages (no rich layout
  // needed; the user has already done the work). Custom domain would render it.
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...CORS },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

async function notifyOps(subject: string, text: string): Promise<void> {
  if (!RESEND_API_KEY || !OPS_EMAIL) {
    console.log(`[ops] (email not configured) ${subject}: ${text}`);
    return;
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: OPS_FROM_EMAIL,
        to: OPS_EMAIL,
        subject: `[Dispango] ${subject}`,
        text,
      }),
    });
    if (!resp.ok) console.log(`[ops] email failed ${resp.status}: ${await resp.text()}`);
  } catch (e) {
    console.log(`[ops] email error: ${e}`);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Client-facing send of the onboarding link via Resend. Unlike notifyOps (an
// internal fire-and-forget alert), this is triggered by the operator from the
// admin UI, so it RETURNS success/failure for inline feedback instead of just
// logging. Deliverability to arbitrary client addresses requires OPS_FROM_EMAIL's
// domain to be verified in Resend.
async function sendOnboardingEmail(
  to: string,
  businessName: string,
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: "email not configured (RESEND_API_KEY unset)" };
  const forShop = businessName ? ` for ${businessName}` : "";
  const text =
    `Hi,\n\n` +
    `You're almost set up with Dispango${forShop}.\n\n` +
    `Use this secure link to sign your agreement and set up payment:\n${url}\n\n` +
    `Once you've signed and payment is set up, your AI receptionist goes live — nothing else needed on your end.\n\n` +
    `Questions? Just reply to this email.\n\n` +
    `— The Dispango team`;
  const html =
    `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">` +
    `<p>Hi,</p>` +
    `<p>You're almost set up with Dispango${businessName ? ` for <b>${escapeHtml(businessName)}</b>` : ""}.</p>` +
    `<p>Use this secure link to sign your agreement and set up payment:</p>` +
    `<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#4f7cff;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600">Sign &amp; get started</a></p>` +
    `<p style="color:#555;font-size:13px">Or paste this link into your browser:<br>${escapeHtml(url)}</p>` +
    `<p>Once you've signed and payment is set up, your AI receptionist goes live — nothing else needed on your end.</p>` +
    `<p>Questions? Just reply to this email.</p>` +
    `<p>— The Dispango team</p>` +
    `</div>`;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: OPS_FROM_EMAIL,
        to,
        ...(OPS_EMAIL ? { reply_to: OPS_EMAIL } : {}),
        subject: "Sign & activate your Dispango AI receptionist",
        text,
        html,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.log(`[onboarding-email] failed ${resp.status}: ${body}`);
      return { ok: false, error: `resend ${resp.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.log(`[onboarding-email] error: ${e}`);
    return { ok: false, error: String(e) };
  }
}

// active = contract signed AND subscription paid. Single source of truth for the
// flag the vapi-webhook reads. Called from both webhooks; whichever lands last
// flips the agent on. Never throws into the caller's webhook path.
async function recomputeActive(clientId: string): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase
    .from("clients")
    .select("contract_status, subscription_status")
    .eq("id", clientId)
    .limit(1);
  const row = data?.[0];
  if (!row) return;
  const active = row.contract_status === "signed" && row.subscription_status === "active";
  await supabase.from("clients").update({ active }).eq("id", clientId);
  console.log(`[billing] recompute active=${active} client=${clientId} contract=${row.contract_status} sub=${row.subscription_status}`);
}

// --- SignWell -------------------------------------------------------------

async function signwellCreateDocument(client: any, token: string): Promise<{ url: string; documentId: string }> {
  const redirectUrl = `${PUBLIC_BASE_URL}/billing/onboarding/${token}/pay`;
  // Create FROM TEMPLATE: this endpoint pulls the file + fields + placeholders
  // from the template. (The from-scratch /documents endpoint ignores template_id
  // and demands inline files/fields — that produced the 422 "no files / no fields".)
  // Recipient maps to the template slot via `placeholder_name`; `id` is just our
  // own handle for the recipient. `template_fields` prefill by `api_id` alone.
  const resp = await fetch("https://www.signwell.com/api/v1/document_templates/documents", {
    method: "POST",
    headers: { "X-Api-Key": SIGNWELL_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: SIGNWELL_TEMPLATE_ID,
      test_mode: (Deno.env.get("SIGNWELL_TEST_MODE") || "true") === "true",
      embedded_signing: false,
      redirect_url: redirectUrl,
      metadata: { onboarding_token: token, client_id: client.id },
      // SignWell requires a recipient for EVERY template placeholder. The
      // "Document Sender" placeholder has no signing fields (it's a preassigned
      // copy slot), so exclude it per-document — leaving the Client as the sole
      // recipient, so the doc completes on the Client's signature alone.
      // (case-sensitive — must match the template's placeholder name exactly.)
      exclude_placeholders: ["Document Sender"],
      recipients: [{
        id: "1",
        placeholder_name: "Client",
        name: client.business_name || "Client",
        email: client.contact_email,
      }],
      template_fields: [{
        api_id: "business_name",
        value: client.business_name || "",
      }],
    }),
  });
  if (!resp.ok) throw new Error(`signwell create ${resp.status}: ${await resp.text()}`);
  const doc = await resp.json();
  // Match the Client recipient by the id we assigned (response keeps it) rather
  // than by index, so we never hand back the wrong recipient's URL.
  const client_recipient = (doc?.recipients ?? []).find((r: any) => r?.id === "1");
  const signingUrl = client_recipient?.signing_url ?? doc?.embedded_signing_url ?? null;
  if (!signingUrl) throw new Error("signwell: no signing_url in response");
  return { url: signingUrl, documentId: doc.id };
}

async function signwellGetStatus(documentId: string): Promise<string | null> {
  if (!SIGNWELL_API_KEY) return null;
  const resp = await fetch(`https://www.signwell.com/api/v1/documents/${documentId}/`, {
    headers: { "X-Api-Key": SIGNWELL_API_KEY },
  });
  if (!resp.ok) return null;
  const doc = await resp.json();
  return doc?.status ?? null; // e.g. "Completed"
}

function isCompletedStatus(status: unknown): boolean {
  return typeof status === "string" &&
    ["completed", "manually completed"].includes(status.trim().toLowerCase());
}

async function signwellFetchPdf(documentId: string): Promise<Uint8Array | null> {
  if (!SIGNWELL_API_KEY) return null;
  const resp = await fetch(
    `https://www.signwell.com/api/v1/documents/${documentId}/completed_pdf/`,
    { headers: { "X-Api-Key": SIGNWELL_API_KEY } },
  );
  if (!resp.ok) {
    console.log(`[signwell] pdf fetch ${resp.status}: ${await resp.text()}`);
    return null;
  }
  return new Uint8Array(await resp.arrayBuffer());
}

// SignWell signs each event with HMAC-SHA256 over the string "{type}@{time}",
// keyed by the Webhook ID, and delivers the hex digest as event.hash in the body.
// Verify before trusting the event.
async function signwellVerify(event: any): Promise<boolean> {
  if (!SIGNWELL_WEBHOOK_ID) return false;
  const type = event?.event?.type;
  const time = event?.event?.time;
  const hash = event?.event?.hash;
  if (typeof type !== "string" || typeof time === "undefined" || typeof hash !== "string") return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SIGNWELL_WEBHOOK_ID),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${type}@${time}`));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(hex, hash.trim());
}

// --- Routes ---------------------------------------------------------------

async function createOnboarding(body: Record<string, unknown>): Promise<Response> {
  if (!supabase) return json({ error: "supabase not configured" }, 503);
  if (!SIGNWELL_API_KEY || !SIGNWELL_TEMPLATE_ID) return json({ error: "e-sign not configured" }, 503);
  if (!PUBLIC_BASE_URL) return json({ error: "PUBLIC_BASE_URL not set" }, 503);

  const clientId = String(body.client_id ?? "").trim();
  const contactEmail = String(body.contact_email ?? "").trim();
  if (!clientId) return json({ error: "client_id is required" }, 400);
  if (!contactEmail) return json({ error: "contact_email is required" }, 400);

  const { data } = await supabase.from("clients").select("*").eq("id", clientId).limit(1);
  const client = data?.[0];
  if (!client) return json({ error: "client not found" }, 404);

  const token = client.onboarding_token || randomToken();
  client.contact_email = contactEmail;

  let doc;
  try {
    doc = await signwellCreateDocument(client, token);
  } catch (e) {
    console.log(`[billing] signwell create failed client=${clientId}: ${e}`);
    return json({ error: `e-sign create failed: ${e}` }, 502);
  }

  const { error } = await supabase.from("clients").update({
    onboarding_token: token,
    contact_email: contactEmail,
    contract_status: "sent",
    contract_request_id: doc.documentId,
  }).eq("id", clientId);
  if (error) return json({ error: error.message }, 400);

  console.log(`[billing] onboarding created client=${clientId} doc=${doc.documentId}`);
  return json({ created: true, onboarding_url: doc.url, token });
}

// Email an already-generated onboarding link to the client. The link is supplied
// by the admin UI (the one it just generated) — we don't regenerate (no second
// SignWell doc) and don't refetch. Recipient is the STORED contact_email, set by
// createOnboarding, so the operator can't redirect it via the request body.
async function sendOnboardingLink(body: Record<string, unknown>): Promise<Response> {
  if (!supabase) return json({ error: "supabase not configured" }, 503);
  const clientId = String(body.client_id ?? "").trim();
  const url = String(body.onboarding_url ?? "").trim();
  if (!clientId) return json({ error: "client_id is required" }, 400);
  if (!url) return json({ error: "onboarding_url is required" }, 400);

  const { data } = await supabase
    .from("clients").select("business_name, contact_email").eq("id", clientId).limit(1);
  const client = data?.[0];
  if (!client) return json({ error: "client not found" }, 404);
  const to = String(client.contact_email ?? "").trim();
  if (!to) return json({ error: "client has no contact_email — generate the link first" }, 400);

  const result = await sendOnboardingEmail(to, String(client.business_name ?? ""), url);
  if (!result.ok) return json({ error: `email send failed: ${result.error}` }, 502);
  console.log(`[billing] onboarding email sent client=${clientId} to=${to}`);
  return json({ sent: true, to });
}

// --- Public self-serve signup --------------------------------------------
// PUBLIC (no admin token). A prospect fills the "Get Started" form; we create a
// clients row (active=false — the vapi-webhook keeps ignoring it), then run the
// SAME SignWell + Stripe onboarding as the admin flow and hand back the sign/pay
// URL. Number/assistant provisioning is still a human step after payment (there
// is no provisioning robot yet), so vapi_assistant_id / inbound_number stay null.
// This is a new, unauthenticated trust boundary — hence the honeypot, per-IP
// rate limit, dedupe, and strict field whitelist below.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+\d{10,15}$/;
const VOICE_ALLOWED = new Set(["elliot", "ava", "cole", "harper", "no preference"]);

// Best-effort per-instance rate limit. Edge instances are ephemeral and can run
// in parallel, so this is a speed bump, not a wall — the email dedupe below is
// the real duplicate guard. Cap: 5 signups / IP / hour.
const signupHits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  // Bound the map so stale keys can't grow it without limit over the isolate's life.
  if (signupHits.size > 2000) {
    for (const [k, v] of signupHits) {
      const recent = v.filter((t) => now - t < windowMs);
      if (recent.length === 0) signupHits.delete(k);
      else signupHits.set(k, recent);
    }
  }
  const hits = (signupHits.get(ip) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  signupHits.set(ip, hits);
  return hits.length > 5;
}

// North-America-friendly E.164 normalization: keep a leading +, add +1 for a bare
// 10-digit number, + for a bare 11-digit starting with 1. Returns null if it can't
// produce a valid E.164 string.
function normalizePhone(raw: string): string | null {
  const s = raw.trim();
  if (s.startsWith("+")) {
    const p = "+" + s.slice(1).replace(/\D/g, "");
    return E164_RE.test(p) ? p : null;
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || "unknown";
}

// Verify a Cloudflare Turnstile (free CAPTCHA) token against siteverify. Only
// called when TURNSTILE_SECRET_KEY is set. Fails closed: any network/parse error
// returns false, so a Cloudflare outage blocks signups rather than waving them
// through.
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  try {
    const form = new URLSearchParams();
    form.set("secret", TURNSTILE_SECRET_KEY!);
    form.set("response", token);
    if (ip && ip !== "unknown") form.set("remoteip", ip);
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data = await resp.json();
    return data?.success === true;
  } catch (e) {
    console.log(`[signup] turnstile verify error: ${e}`);
    return false;
  }
}

async function handleSignup(req: Request, body: Record<string, unknown>): Promise<Response> {
  if (!supabase) return json({ error: "service unavailable" }, 503);
  if (!SIGNWELL_API_KEY || !SIGNWELL_TEMPLATE_ID || !PUBLIC_BASE_URL) {
    return json({ error: "signup temporarily unavailable" }, 503);
  }

  // Honeypot: bots fill hidden fields humans never see. Pretend success, do nothing.
  if (String(body.company_url ?? "").trim() !== "") {
    console.log("[signup] honeypot tripped — ignoring");
    return json({ ok: true });
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    console.log(`[signup] rate limited ip=${ip}`);
    return json({ error: "too many attempts — please try again later" }, 429);
  }

  // Cloudflare Turnstile: enforced only when the secret is configured, so signups
  // keep working until the key + frontend site key are provisioned. Once on, a
  // missing/invalid token is rejected here — before any SignWell doc or DB write.
  if (TURNSTILE_SECRET_KEY) {
    const turnstileToken = String(body.turnstile_token ?? "").trim();
    if (!turnstileToken || !(await verifyTurnstile(turnstileToken, ip))) {
      console.log(`[signup] turnstile failed ip=${ip} hasToken=${!!turnstileToken}`);
      return json({ error: "Verification failed — please refresh and try again." }, 403);
    }
  }

  const businessName = String(body.business_name ?? "").trim().slice(0, 200);
  const contactEmail = String(body.contact_email ?? "").trim().slice(0, 200).toLowerCase();
  const phone = normalizePhone(String(body.phone ?? ""));
  const trade = String(body.trade ?? "").trim().slice(0, 80);
  const phoneType = String(body.phone_type ?? "").trim().slice(0, 40);
  const voiceRaw = String(body.voice ?? "").trim().slice(0, 40);
  const voice = VOICE_ALLOWED.has(voiceRaw.toLowerCase()) ? voiceRaw : "";

  if (!businessName) return json({ error: "business name is required" }, 400);
  if (!EMAIL_RE.test(contactEmail)) return json({ error: "a valid email is required" }, 400);
  if (!phone) return json({ error: "a valid phone number is required" }, 400);

  // Dedupe by email so a resubmit / double-click never makes a second row — and,
  // critically, never regenerates onboarding for an email that has ALREADY signed
  // (re-running createOnboarding would mint a fresh unsigned doc and regress the
  // completed signature back to "sent" — an unauthenticated griefing vector).
  const { data: existing } = await supabase
    .from("clients").select("id, active, contract_status, onboarding_token")
    .eq("contact_email", contactEmail).limit(1);
  const row = existing?.[0];

  if (row?.active) {
    return json({ error: "This email is already set up. Contact us if you need help." }, 409);
  }
  // Signed but not yet paid → send them straight to payment; do NOT re-create the
  // contract. (/pay gates on signed, so this only ever advances a real signer.)
  if (row && row.contract_status === "signed" && row.onboarding_token) {
    return json({ ok: true, onboarding_url: `${PUBLIC_BASE_URL}/billing/onboarding/${row.onboarding_token}/pay` });
  }

  let clientId = row?.id as string | undefined;

  if (!clientId) {
    // Force the safe defaults: active=false, no assistant/inbound number (a human
    // wires those after payment). The prospect's phone is both where leads get
    // texted and the owner contact until provisioning refines it.
    const { data: ins, error: insErr } = await supabase.from("clients").insert({
      business_name: businessName,
      contact_email: contactEmail,
      dispatch_phone: phone,
      owner_phone: phone,
      active: false,
    }).select("id").limit(1);
    if (insErr) {
      // Unique-violation (needs the clients_contact_email_unique index): a
      // concurrent request just created the row — re-select and continue.
      if ((insErr as { code?: string }).code === "23505") {
        const { data: again } = await supabase
          .from("clients").select("id").eq("contact_email", contactEmail).limit(1);
        clientId = again?.[0]?.id;
      }
      if (!clientId) {
        console.log(`[signup] insert failed: ${insErr.message}`);
        return json({ error: "could not create your account" }, 400);
      }
    } else {
      clientId = ins?.[0]?.id;
    }
    if (!clientId) return json({ error: "could not create your account" }, 400);
  } else {
    // Existing in-progress row (contract not yet signed): save the latest details
    // the prospect entered so a correction on resubmit isn't silently dropped.
    await supabase.from("clients").update({
      business_name: businessName,
      dispatch_phone: phone,
      owner_phone: phone,
    }).eq("id", clientId);
  }

  // Fire-and-forget lead alert with the details a human needs to provision later
  // (voice/trade aren't stored — no column yet — so they ride the notification).
  notifyOps(
    "New self-serve signup",
    `${businessName} started signup.\nEmail: ${contactEmail}\nLead phone: ${phone}\n` +
      `Line type: ${phoneType || "n/a"}\nTrade: ${trade || "n/a"}\n` +
      `Voice: ${voice || "no preference"}\nClient: ${clientId}`,
  ).catch(() => {});

  // Reuse the exact admin onboarding path (SignWell doc + stored token) and hand
  // back the sign/pay URL for the browser to redirect into.
  return await createOnboarding({ client_id: clientId, contact_email: contactEmail });
}

// Tokens we've already paged ops about for a Stripe config error, so a misconfig
// under live traffic alerts once (per instance) instead of on every refresh.
const stripeConfigPaged = new Set<string>();

async function onboardingPay(token: string): Promise<Response> {
  if (!supabase) return html("<p>Service unavailable.</p>", 503);
  if (!stripe || !STRIPE_PRICE_ID) return html("<p>Payment is not configured.</p>", 503);
  if (!PUBLIC_BASE_URL) return html("<p>Service misconfigured.</p>", 503);

  const { data } = await supabase.from("clients").select("*").eq("onboarding_token", token).limit(1);
  const client = data?.[0];
  if (!client) return html("<p>This onboarding link is invalid or has expired.</p>", 404);

  // Gate: must be signed. The webhook is the source of truth, but SignWell
  // redirects the browser here the instant the user signs — often a beat before
  // its own API/webhook reports "Completed". Poll briefly (a few checks over a
  // few seconds) so a just-signed user is carried straight to payment instead of
  // hitting a dead-end message. (This page renders as plain text from *.supabase.co,
  // so a client-side meta-refresh wouldn't run — the rescue has to be server-side.)
  let signed = client.contract_status === "signed";
  if (!signed && client.contract_request_id) {
    for (let i = 0; i < 4 && !signed; i++) {
      const status = await signwellGetStatus(client.contract_request_id);
      if (isCompletedStatus(status)) {
        await supabase.from("clients").update({ contract_status: "signed", signed_at: new Date().toISOString() })
          .eq("id", client.id);
        await recomputeActive(client.id);
        signed = true;
        break;
      }
      if (i < 3) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  if (!signed) {
    return html("<p>Please finish signing the contract first. If you just signed, refresh this page in a moment.</p>", 409);
  }

  // Already paid? Send them to the confirmation rather than charging twice.
  if (client.subscription_status === "active") {
    return Response.redirect(donePageUrl(token), 302);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: client.id,
      customer_email: client.contact_email || undefined,
      subscription_data: { metadata: { client_id: client.id, onboarding_token: token } },
      success_url: donePageUrl(token),
      cancel_url: `${PUBLIC_BASE_URL}/billing/onboarding/${token}/pay`,
    }, { idempotencyKey: `checkout_${token}` });
    return Response.redirect(session.url!, 302);
  } catch (e) {
    const type = (e as any)?.type;
    const code = (e as any)?.code;
    console.log(`[billing] checkout create failed token=${token} type=${type} code=${code}: ${e}`);
    // A config error (missing/invalid price, wrong-mode or bad key) fails EVERY
    // payment the same way — the classic trap when flipping Stripe test→live. Page
    // ops so a misconfig can't silently block all revenue; transient errors just log.
    if (
      (type === "StripeInvalidRequestError" || type === "StripeAuthenticationError") &&
      !stripeConfigPaged.has(token)
    ) {
      stripeConfigPaged.add(token);
      await notifyOps(
        "Payment blocked — Stripe misconfigured",
        `Checkout failed to start (type=${type} code=${code}). Verify STRIPE_PRICE_ID and ` +
          `STRIPE_SECRET_KEY are the SAME mode (both live or both test) and the price exists.`,
      );
    }
    return html("<p>Could not start payment. Please try again.</p>", 502);
  }
}

function onboardingDone(): Response {
  return html(
    "<h1>You're all set!</h1><p>Your contract is signed and your subscription is active. We'll be in touch shortly to get your line live.</p>",
  );
}

// Tokenized read for the /welcome page. The onboarding token is a bearer secret
// the payer already holds (it gates /pay), so we return just the public-facing
// provisioning state — enough to show them their assigned number. No secrets leave.
async function welcomeInfo(token: string): Promise<Response> {
  if (!supabase) return json({ error: "service unavailable" }, 503);
  const { data } = await supabase
    .from("clients")
    .select("business_name, inbound_number, fallback_number, provision_status")
    .eq("onboarding_token", token).limit(1);
  const c = data?.[0];
  if (!c) return json({ error: "not found" }, 404);
  return json({
    business_name: c.business_name ?? null,
    inbound_number: c.inbound_number ?? null,
    fallback_number: c.fallback_number ?? null,
    provision_status: c.provision_status ?? "none",
  });
}

// Operator's one-click Activate: staged → active. NEVER touches clients.active
// (owned solely by recomputeActive). Only advances a genuinely staged row.
async function activateProvision(id: string): Promise<Response> {
  if (!supabase) return json({ error: "supabase not configured" }, 503);
  const { data } = await supabase.from("clients").select("provision_status").eq("id", id).limit(1);
  const c = data?.[0];
  if (!c) return json({ error: "client not found" }, 404);
  if (c.provision_status === "active") return json({ activated: true, already: true });
  if (c.provision_status !== "staged") {
    return json({ error: `client is '${c.provision_status}', not 'staged' — nothing to activate` }, 409);
  }
  const { error } = await supabase.from("clients")
    .update({ provision_status: "active" }).eq("id", id).eq("provision_status", "staged");
  if (error) return json({ error: error.message }, 400);
  console.log(`[billing] provisioning activated client=${id}`);
  return json({ activated: true });
}

// Re-run provisioning for a client stuck in 'error' (or to resume a partial run).
// Idempotent + partial-failure safe inside provisionForClient (won't re-buy).
async function retryProvision(id: string): Promise<Response> {
  if (!supabase) return json({ error: "supabase not configured" }, 503);
  const gate = provisioningEnabled();
  if (!gate.ok) return json({ error: `provisioning disabled: ${gate.reason}` }, 503);
  const { data } = await supabase.from("clients").select("*").eq("id", id).limit(1);
  const client = data?.[0];
  if (!client) return json({ error: "client not found" }, 404);
  const result = await provisionForClient(supabase, client, { notify: notifyOps });
  return json({ result }, result.status === "error" ? 502 : 200);
}

// --- Webhooks -------------------------------------------------------------

async function handleSignwellWebhook(rawBody: string): Promise<Response> {
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ received: false }, 400);
  }
  if (!(await signwellVerify(event))) {
    console.log("[signwell] rejected: bad signature");
    return json({ received: false }, 401);
  }
  if (!supabase) {
    console.log("[signwell] supabase not configured — ack only");
    return json({ received: true });
  }

  const type = event?.event?.type ?? "";
  if (type !== "document_completed") {
    console.log(`[signwell] ack ${type}`);
    return json({ received: true });
  }

  const doc = event?.data?.object ?? {};
  const token = doc?.metadata?.onboarding_token;
  const documentId = doc?.id;
  if (!token && !documentId) return json({ received: true });

  const query = supabase.from("clients").select("*");
  const { data } = token
    ? await query.eq("onboarding_token", token).limit(1)
    : await query.eq("contract_request_id", documentId).limit(1);
  const client = data?.[0];
  if (!client) {
    console.log(`[signwell] no client for token=${token} doc=${documentId}`);
    return json({ received: true });
  }

  let signedPdfPath = client.signed_pdf_path;
  const pdf = await signwellFetchPdf(client.contract_request_id || documentId);
  if (pdf) {
    const path = `${client.id}.pdf`;
    const { error: upErr } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (upErr) console.log(`[signwell] pdf upload failed client=${client.id}: ${upErr.message}`);
    else signedPdfPath = path;
  }

  const { error: updErr } = await supabase.from("clients").update({
    contract_status: "signed",
    signed_at: new Date().toISOString(),
    signed_pdf_path: signedPdfPath,
  }).eq("id", client.id);
  if (updErr) {
    // Don't recompute against stale data (would wrongly leave active=false). Let
    // SignWell retry the webhook.
    console.log(`[signwell] update failed client=${client.id}: ${updErr.message}`);
    return json({ received: false }, 500);
  }
  await recomputeActive(client.id);
  console.log(`[signwell] signed client=${client.id}`);
  return json({ received: true });
}

const STRIPE_HANDLED = new Set([
  "checkout.session.completed",
  "invoice.paid",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
]);

// Map Stripe lifecycle → our subscription_status. We deliberately keep service
// during past_due (Stripe is smart-retrying the card); only canceled/unpaid/
// deleted stop it. Re-payment (invoice.paid → active) turns it back on.
async function resolveClientForStripe(obj: any): Promise<string | null> {
  if (!supabase) return null;
  const metaClient = obj?.metadata?.client_id;
  if (metaClient) return metaClient;
  const ref = obj?.client_reference_id;
  if (ref) return ref;
  const subId = typeof obj?.subscription === "string" ? obj.subscription : obj?.id;
  if (subId) {
    const { data } = await supabase.from("clients").select("id").eq("stripe_subscription_id", subId).limit(1);
    if (data?.[0]) return data[0].id;
  }
  const custId = typeof obj?.customer === "string" ? obj.customer : null;
  if (custId) {
    const { data } = await supabase.from("clients").select("id").eq("stripe_customer_id", custId).limit(1);
    if (data?.[0]) return data[0].id;
  }
  return null;
}

async function handleStripeEvent(event: any): Promise<void> {
  if (!supabase) return;
  if (!STRIPE_HANDLED.has(event.type)) return;
  // Idempotency: claim the event id; PK conflict (23505) means it's a replay.
  const { error: insErr } = await supabase.from("stripe_events").insert({ id: event.id, type: event.type });
  if (insErr) {
    if ((insErr as any).code === "23505") {
      console.log(`[stripe] duplicate event ${event.id} — skipping`);
      return;
    }
    // A transient insert error: don't risk double-processing or losing the event.
    // Throw so the webhook returns non-2xx and Stripe retries.
    throw new Error(`stripe_events insert failed: ${insErr.message}`);
  }

  const obj = event.data.object;
  const clientId = await resolveClientForStripe(obj);
  if (!clientId) {
    console.log(`[stripe] ${event.type}: no client resolved`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    await supabase.from("clients").update({
      stripe_customer_id: typeof obj.customer === "string" ? obj.customer : null,
      stripe_subscription_id: typeof obj.subscription === "string" ? obj.subscription : null,
      subscription_status: "active",
      plan: "flat_monthly",
    }).eq("id", clientId);
    await recomputeActive(clientId);
    // Buy + wire a number automatically, then stage it for one-click Activate.
    // This runs at-most-once per checkout: the stripe_events claim above already
    // guards against webhook replays, and provisionForClient additionally refuses
    // to re-buy when inbound_number is set. It never throws — a failure records a
    // retryable 'error' state and alerts ops. If provisioning isn't configured,
    // fall back to the manual "provision now" email so nothing is silently dropped.
    const { data } = await supabase.from("clients").select("*").eq("id", clientId).limit(1);
    const client = data?.[0];
    if (client && provisioningEnabled().ok) {
      const result = await provisionForClient(supabase, client, { notify: notifyOps });
      console.log(`[billing] provisioning client=${clientId} → ${result.status}`);
    } else {
      await notifyOps(
        "New paying customer — provision now",
        `${client?.business_name ?? clientId} signed + paid. Set up their Twilio number + Vapi wiring` +
          ` (auto-provisioning is off: ${provisioningEnabled().reason ?? "no client row"}).`,
      );
    }
    return;
  }

  if (event.type === "invoice.paid") {
    await supabase.from("clients").update({ subscription_status: "active" }).eq("id", clientId);
    await recomputeActive(clientId);
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    await supabase.from("clients").update({ subscription_status: "canceled" }).eq("id", clientId);
    await recomputeActive(clientId);
    return;
  }

  if (event.type === "customer.subscription.updated") {
    // A pure cancel_at_period_end flip keeps `status: active` — leave access on
    // until the subscription actually deletes at period end.
    const status = String(obj.status ?? "");
    const mapped = status === "active" || status === "trialing"
      ? "active"
      : status === "past_due"
        ? "past_due"
        : status === "unpaid"
          ? "unpaid"
          : status === "canceled"
            ? "canceled"
            : status === "incomplete" || status === "incomplete_expired"
              ? "incomplete"
              : "none";
    await supabase.from("clients").update({ subscription_status: mapped }).eq("id", clientId);
    await recomputeActive(clientId);
    return;
  }

  if (event.type === "invoice.payment_failed") {
    // Dunning signal only — do NOT revoke. Stripe is retrying.
    const { data } = await supabase.from("clients").select("business_name").eq("id", clientId).limit(1);
    await notifyOps(
      "Payment failed (retrying)",
      `${data?.[0]?.business_name ?? clientId} had a failed payment. Stripe is retrying; no action needed yet.`,
    );
    return;
  }
}

async function handleStripeWebhook(req: Request, rawBody: string): Promise<Response> {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return json({ received: false }, 503);
  const sig = req.headers.get("stripe-signature") ?? "";
  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, STRIPE_WEBHOOK_SECRET, undefined, stripeCrypto);
  } catch (e) {
    console.log(`[stripe] signature verification failed: ${e}`);
    return json({ received: false }, 401);
  }
  try {
    await handleStripeEvent(event);
  } catch (e) {
    // Return non-2xx so Stripe retries (e.g. a transient DB error before the
    // event was durably claimed). Idempotency makes the retry safe.
    console.log(`[stripe] handler error event=${event?.id}: ${e}`);
    return json({ received: false }, 500);
  }
  return json({ received: true });
}

// --- Router ---------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const path = new URL(req.url).pathname
    .replace(/^\/functions\/v1/, "")
    .replace(/^\/billing(?=\/|$)/, "") || "/";

  if (req.method === "GET" && (path === "/" || path === "")) {
    return json({ status: "ok" });
  }

  try {
    // Public token routes (token is the auth).
    const payMatch = path.match(/^\/onboarding\/([^/]+)\/pay$/);
    if (req.method === "GET" && payMatch) return await onboardingPay(payMatch[1]);

    const doneMatch = path.match(/^\/onboarding\/([^/]+)\/done$/);
    if (req.method === "GET" && doneMatch) return onboardingDone();

    // Public tokenized read for the /welcome page (token is the auth).
    const welcomeMatch = path.match(/^\/welcome-info\/([^/]+)$/);
    if (req.method === "GET" && welcomeMatch) return await welcomeInfo(welcomeMatch[1]);

    // Public self-serve signup (no admin token; guarded by honeypot + rate limit).
    if (req.method === "POST" && path === "/signup") {
      let signupBody: Record<string, unknown>;
      try {
        signupBody = await req.json();
      } catch {
        return json({ error: "invalid request" }, 400);
      }
      return await handleSignup(req, signupBody);
    }

    // Webhooks (signature is the auth) — read the raw body for verification.
    if (req.method === "POST" && path === "/webhooks/stripe") {
      return await handleStripeWebhook(req, await req.text());
    }
    if (req.method === "POST" && path === "/webhooks/signwell") {
      return await handleSignwellWebhook(await req.text());
    }

    // Admin-token route.
    if (req.method === "POST" && path === "/onboarding") {
      if (!ADMIN_API_TOKEN) return json({ error: "admin API not configured" }, 503);
      if (!constantTimeEqual(req.headers.get("x-admin-token") ?? "", ADMIN_API_TOKEN)) {
        console.log("[billing] rejected: bad/missing admin token");
        return json({ error: "unauthorized" }, 401);
      }
      return await createOnboarding(await req.json());
    }

    if (req.method === "POST" && path === "/onboarding/send") {
      if (!ADMIN_API_TOKEN) return json({ error: "admin API not configured" }, 503);
      if (!constantTimeEqual(req.headers.get("x-admin-token") ?? "", ADMIN_API_TOKEN)) {
        console.log("[billing] rejected: bad/missing admin token");
        return json({ error: "unauthorized" }, 401);
      }
      return await sendOnboardingLink(await req.json());
    }

    // Admin-token provisioning controls (activate / retry).
    const activateMatch = path.match(/^\/provision\/([^/]+)\/activate$/);
    const retryMatch = path.match(/^\/provision\/([^/]+)\/retry$/);
    if (req.method === "POST" && (activateMatch || retryMatch)) {
      if (!ADMIN_API_TOKEN) return json({ error: "admin API not configured" }, 503);
      if (!constantTimeEqual(req.headers.get("x-admin-token") ?? "", ADMIN_API_TOKEN)) {
        console.log("[billing] rejected: bad/missing admin token");
        return json({ error: "unauthorized" }, 401);
      }
      return activateMatch ? await activateProvision(activateMatch[1]) : await retryProvision(retryMatch![1]);
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    console.log(`[billing] error: ${e}`);
    return json({ error: "internal error" }, 500);
  }
});
