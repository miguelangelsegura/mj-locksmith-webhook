# Admin / Onboarding Dashboard — Spec (for Jordan)

*Hand this to a fresh Claude instance to scope + build the dashboard. Read
[SYSTEM-OVERVIEW.md](SYSTEM-OVERVIEW.md) first for how the voice-agent system works.*

## What this is for

A web app for the **Dispango team** (later, the locksmith) to **onboard and manage
locksmith clients without touching code, the Vapi dashboard, or SQL**. Today every new
client is a manual SQL insert into `clients` + manual Vapi number/assistant/server-URL
setup — error-prone (it silently broke the live system twice). This dashboard turns that
into a form + automation.

It is a **separate app** from the webhook in this repo, but it reads/writes the **same
Supabase database** (project `yqyvybukyfokyfsjzyso`, tables `clients` + `calls`) and drives
the **Vapi REST API** (`api.vapi.ai`, bearer `VAPI_PRIVATE_KEY`). Do **not** fork the
schema — coordinate it with this repo so the webhook and dashboard stay in sync.

## Existing `clients` schema (extend, don't replace)

`id`, `vapi_assistant_id`, `active`, `dispatch_phone`, `inbound_number`, `business_name`,
`agent_name`, `cell_number`, `answer_mode` (`human_first | ai_first | scheduled`),
`ring_timeout_seconds`, `business_hours`, `timezone`. **Add:** `fallback_number` (the
locksmith's real phone for the Vapi `fallbackDestination`), and optionally `service_area`,
`services_offered`, `pricing_notes`, `voice`.

`calls`: one row per call (captured fields + transcript + summary + `raw_payload` +
`notified_at`/`notified_phone` dispatch markers). Read-only for the dashboard.

## Features (what to include + why)

### A. Client onboarding form (create/edit a `clients` row)
- `business_name`, `agent_name` — the `{{variables}}` injected into the agent per call (shop identity).
- `dispatch_phone` — where leads are texted (E.164).
- `inbound_number` — the Vapi/Twilio number assigned to this shop (the routing key).
- **`fallback_number`** — the locksmith's real phone; powers Vapi `fallbackDestination` so a call forwards there if our server hiccups instead of dropping. *(Replaces today's hardcoded fallback.)*
- `answer_mode`, `ring_timeout_seconds`, `business_hours`, `timezone` — routing + SMS-timestamp zone.
- `service_area`, `services_offered`, `pricing_notes` — per-shop knowledge for the agent.
- `voice`, `active` toggle.

### B. Provisioning automation (the painful manual part today)
On save: buy/assign a Twilio number, attach the shared Vapi assistant, set the number's
**server URL (+ `?token` or the `x-vapi-secret` header) and `fallbackDestination`**, and
write the `clients` row — all via the Vapi + Supabase APIs. This eliminates the manual
Vapi-dashboard clicking that caused the silent server-URL regressions.

### C. Leads / calls viewer (per client)
List of calls with the captured fields, summary, transcript, recording link, and dispatch
status (texted? failed?). **Why:** the locksmith's core value + support/debugging.

### D. Analytics
Calls answered, leads captured, conversion, missed-call reasons, avg call cost/duration.
**Why:** the ROI story that drives retention + sales, plus cost monitoring.

### E. Billing
Stripe subscription state per client (active / past-due), plan tier. **Why:** know who's
paying; gate access on payment. (Stripe Payment Links/Invoicing — no custom checkout UI needed.)

### F. Ops / health
Webhook health, "calls received today?", failed-SMS list, low Vapi-balance alert, a "place
a test call" button. **Why:** catch silent failures early (the server-URL regression went
unnoticed twice).

### G. Access & security
Role-based: **admin** (Dispango team, all clients) vs **client** (locksmith sees only their
own data) — enforced by **Supabase Row-Level Security** on `clients`/`calls`. Audit log of
who changed what. **Why:** multi-tenant data isolation is mandatory before real customers.

## Tech notes / guardrails
- Same Supabase project (`yqyvybukyfokyfsjzyso`); **reuse** the existing `clients`/`calls`
  schema — coordinate any column changes with this repo (the webhook reads them).
- Vapi provisioning uses `VAPI_PRIVATE_KEY` — **server-side only, never in the browser**.
- **Add RLS** before the app is multi-user, or tenant A can read tenant B's leads.
- The webhook resolves a client by `inbound_number` (falling back to `vapi_assistant_id`),
  and injects `business_name`/`agent_name` per call — so those fields must be set correctly
  on the `clients` row for a new shop to work.
