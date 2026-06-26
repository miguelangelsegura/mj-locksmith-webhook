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

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OPS_EMAIL = Deno.env.get("OPS_EMAIL");
const OPS_FROM_EMAIL = Deno.env.get("OPS_FROM_EMAIL") || "onboarding@dispango.com";

const PUBLIC_BASE_URL = (Deno.env.get("PUBLIC_BASE_URL") || "").replace(/\/$/, "");
const CONTRACTS_BUCKET = "contracts";

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

async function onboardingPay(token: string): Promise<Response> {
  if (!supabase) return html("<p>Service unavailable.</p>", 503);
  if (!stripe || !STRIPE_PRICE_ID) return html("<p>Payment is not configured.</p>", 503);
  if (!PUBLIC_BASE_URL) return html("<p>Service misconfigured.</p>", 503);

  const { data } = await supabase.from("clients").select("*").eq("onboarding_token", token).limit(1);
  const client = data?.[0];
  if (!client) return html("<p>This onboarding link is invalid or has expired.</p>", 404);

  // Gate: must be signed. The webhook is the source of truth, but if it hasn't
  // landed yet do one synchronous status fetch so a just-signed user isn't stuck.
  let signed = client.contract_status === "signed";
  if (!signed && client.contract_request_id) {
    const status = await signwellGetStatus(client.contract_request_id);
    if (isCompletedStatus(status)) {
      await supabase.from("clients").update({ contract_status: "signed", signed_at: new Date().toISOString() })
        .eq("id", client.id);
      await recomputeActive(client.id);
      signed = true;
    }
  }
  if (!signed) {
    return html("<p>Please finish signing the contract first. If you just signed, refresh in a moment.</p>", 409);
  }

  // Already paid? Send them to the confirmation rather than charging twice.
  if (client.subscription_status === "active") {
    return Response.redirect(`${PUBLIC_BASE_URL}/billing/onboarding/${token}/done`, 302);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: client.id,
      customer_email: client.contact_email || undefined,
      subscription_data: { metadata: { client_id: client.id, onboarding_token: token } },
      success_url: `${PUBLIC_BASE_URL}/billing/onboarding/${token}/done`,
      cancel_url: `${PUBLIC_BASE_URL}/billing/onboarding/${token}/pay`,
    }, { idempotencyKey: `checkout_${token}` });
    return Response.redirect(session.url!, 302);
  } catch (e) {
    console.log(`[billing] checkout create failed token=${token}: ${e}`);
    return html("<p>Could not start payment. Please try again.</p>", 502);
  }
}

function onboardingDone(): Response {
  return html(
    "<h1>You're all set!</h1><p>Your contract is signed and your subscription is active. We'll be in touch shortly to get your line live.</p>",
  );
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
    const { data } = await supabase.from("clients").select("business_name").eq("id", clientId).limit(1);
    await notifyOps(
      "New paying customer — provision now",
      `${data?.[0]?.business_name ?? clientId} signed + paid. Set up their Twilio number + Vapi wiring.`,
    );
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

    return json({ error: "not found" }, 404);
  } catch (e) {
    console.log(`[billing] error: ${e}`);
    return json({ error: "internal error" }, 500);
  }
});
