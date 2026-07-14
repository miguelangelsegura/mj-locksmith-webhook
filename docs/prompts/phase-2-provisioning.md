# Phase 2 kickoff — Provisioning automation + complete onboarding

Paste into a fresh, DEDICATED Claude Code window. Sequential (after Phase 1). This is the riskiest
phase — it spends money and touches payments + the live call path. Give it its own session.

---

Read `docs/LAUNCH-ROADMAP.md` (Phase 2), `docs/ADMIN-DASHBOARD-SPEC.md` §B, and `CLAUDE.md` first.

**Task:** Build the **one-click-you-confirm** provisioning robot so onboarding becomes: pay → sign
Terms → get a working number, with a human confirm step.

- In `supabase/functions/billing/index.ts`, on `checkout.session.completed` **after**
  `recomputeActive` and **reusing the `stripe_events` idempotency claim** (so it never double-runs on a
  webhook replay), call a new server-side provisioning module that:
  1. Buys/selects a **Twilio number** (area code near the shop where possible) via the Twilio REST API.
  2. Registers it with **Vapi** as a **dynamic/server-routed** phone-number resource: `server.url` →
     the vapi-webhook `?token=<VAPI_SECRET>`, plus a `fallbackDestination` = the shop's real phone.
     **No static `assistantId`** on the number (or `{{vars}}` render literally on live calls).
  3. Writes `inbound_number` (+ shared `vapi_assistant_id`) to the `clients` row with a **new
     `provision_status='staged'`** column — NOT live yet.
- **One-click Activate:** alert the operator (SMS/email + an admin-ui button); tapping Activate flips
  `provision_status`→`active`. **NEVER set `clients.active` here** — that flag is owned solely by
  `recomputeActive`. Provisioning tracks its own `provision_status`.
- **Idempotent + partial-failure safe:** never buy a second number if `inbound_number` is set; if
  Twilio succeeds but Vapi wiring fails, leave a clear retryable state + alert.
- **`/welcome` shows the real number:** add a tokenized read endpoint the page calls; update
  `web/app/welcome/page.jsx` to display the assigned/forwarding number instead of "we'll text you
  shortly." Ensure the whole pay → SignWell Terms → Stripe → `/welcome` flow reads with no `REPLACE`
  filler (Calio-style).
- New secrets: `VAPI_PRIVATE_KEY`, Twilio number-purchase config. Vapi REST rejects the default
  python-urllib UA (Cloudflare 1010) — use a browser UA/curl; PATCHing `model` needs the whole object.

**Files:** `supabase/functions/billing/index.ts` (+ new `provisioning` module), a migration for
`provision_status`/`fallback_number`, `web/app/welcome/page.jsx`, admin-ui Activate button.

**Verify (Stripe test mode, end-to-end):** pay → a number is purchased → appears in Vapi with correct
server URL + token + fallback → `clients` row gets `inbound_number` + `provision_status='staged'` →
Activate flips it → a smoke-test `assistant-request` to that number resolves the right shop. Confirm
**replaying the Stripe event buys nothing new**. Confirm a forced Vapi-failure leaves a clean retryable
state. Then **`/deep-review`** (payments + live call path), fix must-fix, re-review, commit + merge +
deploy per the autonomy rule.

**Branch:** `feat/provisioning`.
