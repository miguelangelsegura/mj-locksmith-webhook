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
| POST | `/webhooks/stripe` | Stripe signature | paid / lapsed → set `subscription_status` |

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
