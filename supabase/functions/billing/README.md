# Billing / onboarding Edge Function

Turns a closed deal into a paying, contract-signed, live client with **one link**:
the locksmith e-signs the contract (SignWell hosted page) and is redirected straight
into Stripe Checkout to pay. A client only goes `active = true` when **both** the
contract is signed **and** the subscription is paid; a lapsed subscription flips
`active = false` — the same flag `vapi-webhook` reads, so the agent stops answering
automatically.

## Routes (mounted at `/functions/v1/billing`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | none | health check |
| POST | `/onboarding` | `x-admin-token` | create the SignWell doc, return the signing link |
| GET | `/onboarding/:token/pay` | token | post-sign redirect → creates Stripe Checkout, 302s to Stripe |
| GET | `/onboarding/:token/done` | none | confirmation page |
| POST | `/webhooks/signwell` | SignWell HMAC | contract signed → store PDF, mark signed |
| POST | `/webhooks/stripe` | Stripe signature | paid / lapsed → set `subscription_status`; on paid, **auto-provisions a number** (see below) |
| GET | `/welcome-info/:token` | token | read-only `{business_name, inbound_number, provision_status}` for the `/welcome` page |
| POST | `/provision/:id/activate` | `x-admin-token` | operator's one-click Activate: `provision_status` staged → active |
| POST | `/provision/:id/retry` | `x-admin-token` | re-run provisioning for a client stuck in `error` (idempotent, never re-buys) |

`active = (contract_status == 'signed') AND (subscription_status == 'active')`,
recomputed by both webhooks. Enforcement: service is kept during `past_due` (Stripe
is smart-retrying the card); revoked only on `canceled` / `unpaid` / subscription
`deleted`.

## Secrets (`supabase secrets set …`)

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the runtime.

| Secret | What |
|---|---|
| `ADMIN_API_TOKEN` | gate for `POST /onboarding` (same token as the `admin` function) |
| `PUBLIC_BASE_URL` | the function's public base, e.g. `https://<ref>.supabase.co/functions/v1` — used to build redirect/success URLs |
| `STRIPE_SECRET_KEY` | Stripe API key (use a **test** key until go-live) |
| `STRIPE_WEBHOOK_SECRET` | from the Stripe webhook endpoint (`whsec_…`) |
| `STRIPE_PRICE_ID` | the recurring Price id (test placeholder for now; the amount is **not** hardcoded) |
| `SIGNWELL_API_KEY` | SignWell API key (`X-Api-Key` header) |
| `SIGNWELL_TEMPLATE_ID` | the contract template id |
| `SIGNWELL_WEBHOOK_ID` | the Webhook ID returned by SignWell's create-webhook call — it is the HMAC key SignWell signs events with (verification fails closed if unset) |
| `SIGNWELL_TEST_MODE` | `"true"` (default) creates non-binding test documents; set `"false"` for production |
| `RESEND_API_KEY` + `OPS_EMAIL` | "new paying customer — provision now" alert; if unset, the alert just logs |
| `OPS_FROM_EMAIL` | optional verified sender (default `onboarding@dispango.com`) |

### Provisioning secrets (Phase 2 — auto-buy a number on payment)

> ✅ **LIVE as of 2026-07-15 — provisioning is ON.** All secrets below are set in the Supabase
> project env (they're project-wide, shared by every function). `VAPI_PRIVATE_KEY` was the last
> one added; the rest were already present from the webhook. The next paid checkout auto-provisions.
> This table is now the **reference + rotate guide** — if a value changes, `supabase secrets set …`
> the new one (the local copy of `VAPI_PRIVATE_KEY` lives in the gitignored `supabase/functions/.env.local`).

| Secret | What |
|---|---|
| `VAPI_PRIVATE_KEY` | Vapi REST bearer (from `.env.local`). Used to register the number with Vapi. |
| `VAPI_ASSISTANT_ID` | the **shared** Vapi assistant id written to every provisioned client's row |
| `VAPI_SECRET` | billing needs its **own** copy (same value as the webhook's) to build the number's `server.url` `?token=` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | the live Twilio account that owns the numbers (same account the webhook texts from) |
| `TWILIO_NUMBER_COUNTRY` | optional, default `CA`. Country to buy numbers in; area code is matched to the shop's phone. |
| `PROVISIONING_ENABLED` | optional master kill-switch — set to `false` to force-disable even when configured |

**What it does** (`provisioning.ts`, called from `checkout.session.completed` after
`recomputeActive`, reusing the `stripe_events` idempotency claim so it never double-runs):
buys a Twilio number → registers it with Vapi as a **dynamic/server-routed** number
(`server.url` → vapi-webhook `?token`, `fallbackDestination` = the shop's real phone, **no
static `assistantId`**) → writes `inbound_number` + `vapi_assistant_id` + `fallback_number`
and sets **`provision_status='staged'`** (NOT live). It **never** touches `clients.active`
(owned solely by `recomputeActive`). Idempotent + partial-failure safe: never re-buys once
`inbound_number` is set. The operator taps **Activate** (admin-ui / `POST /provision/:id/activate`)
to flip `staged → active`; the vapi-webhook only routes calls for `active`/`none`
(`ROUTABLE_PROVISION`), so a staged number forwards to the shop's own phone until confirmed.

## One-time setup

1. `supabase db push --linked` (applies the `clients` billing columns + `stripe_events`).
2. Create a **private** Storage bucket named `contracts` (dashboard or `createBucket`).
3. Stripe (test mode): create a Product + recurring Price; add a webhook endpoint at
   `…/functions/v1/billing/webhooks/stripe` for `checkout.session.completed`,
   `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`,
   `customer.subscription.deleted`.
4. SignWell: create the contract template (merge field `business_name`); add a webhook
   pointed at `…/functions/v1/billing/webhooks/signwell` (it receives all document
   events; the handler acts only on `document_completed`). Save the returned **Webhook
   ID** as `SIGNWELL_WEBHOOK_ID` — SignWell signs each event `HMAC-SHA256("{type}@{time}")`
   keyed by that ID, sent as `event.hash` in the body.

## Local dev & verification

```bash
deno check supabase/functions/billing/index.ts
supabase functions serve billing --no-verify-jwt --env-file supabase/functions/.env.local
stripe listen --forward-to localhost:54321/functions/v1/billing/webhooks/stripe   # prints whsec_ for STRIPE_WEBHOOK_SECRET
```

Full dry run (you as the locksmith): create a client via the `admin` function →
`POST /billing/onboarding {client_id, contact_email}` → open the returned link →
sign (SignWell test mode) → land on `/pay` → pay with test card `4242 4242 4242 4242`
→ `/done`. Confirm the `clients` row shows `contract_status=signed`,
`subscription_status=active`, `active=true`, `signed_pdf_path` set, and the
provision email fired. Then cancel the test subscription and confirm `active=false`.
