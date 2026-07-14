# Dispango — Launch Roadmap (Phases 0–7)

_The step-by-step map from current state to a Calio-equivalent, launch-ready product. Companion to
[DISPANGO-STATUS.md](DISPANGO-STATUS.md) (state), [SPRINT-PLAN.md](SPRINT-PLAN.md) (superseded by this
for sprints 2–6), and [ADMIN-DASHBOARD-SPEC.md](ADMIN-DASHBOARD-SPEC.md). Ready-to-run per-phase
prompts live in [prompts/](prompts/). Last updated: 2026-07-14._

## PLAIN-ENGLISH SUMMARY

Goal: a **Calio-equivalent, launch-ready** Dispango — polished website, near-automated onboarding
(pay → sign terms → get a working number), a **premium customer dashboard** (their leads + analytics),
a **revamped admin back office** that's intuitive for a non-technical operator with built-in
troubleshooting, real spam/abuse protection, and **your own monitoring** plus a small external
watchdog. Sprint 1 (abuse rails) is already live. This covers the rest, built **one phase per fresh
chat window** so quality never rots.

**The order (your priority):**
0. **Website perfection** — make the marketing site feel like it cost $100k; kill every placeholder.
1. **Reconcile the stranded monitoring** — already built on old branches, never merged; fold into
   `main` cleanly (it collides with the ban feature shipped in Sprint 1).
2. **Provisioning + complete onboarding** — pay → sign Terms → number, one-click-you-confirm, no fillers.
3. **Live demo number** — a real number visitors can call (small; free after #2).
4. **Customer login + dashboard** — email/password, each customer sees only their own data, premium UI.
5. **Admin back-office revamp** — intuitive plain-language operator tool + troubleshooting + monitoring.
6. **Spam/abuse polish** — CAPTCHA on signup + finish the abuse rails.
7. **Trade-neutral future-proofing + launch config** — light groundwork, then flip every launch switch.

---

## Locked decisions

| Area | Decision |
|---|---|
| **Number provisioning** | **One-click, you confirm.** Robot preps the number + Vapi wiring on payment, alerts you; you tap "Activate" to go live. Human safety check every time. |
| **Customer dashboard shows** | Leads + call details; analytics/ROI; a few **editable settings**. |
| **Editable by customer** | Business hours + timezone; lead-delivery cell number (validation + test-text confirm); business info (service area, services, pricing notes). **NOT** voice/greeting or routing internals. |
| **Monitoring** | **Own admin dashboard + one tiny external probe** as an independent watchdog. |
| **Trades at launch** | **Locksmith only.** Per-trade generalization → light future-proofing (Phase 7). |
| **Customer login** | **Email + password** (incl. reset flow). |
| **Call recordings** | **Deferred** (surface Vapi's existing link later if wanted; no own-storage at launch). |
| **Email leads** | Optional cheap add (Resend already wired); include only if wanted. |

---

## Execution strategy — building without context rot

**The rule: one phase = one fresh chat window = one short-lived branch.** Paste that phase's prompt
from [prompts/](prompts/) into a new window; it runs the phase start-to-finish (verify → review →
commit → merge → deploy per the `CLAUDE.md` autonomy rule) with no dependence on prior chats.

**Sequential vs parallel:**
- **Backbone is sequential.** Phases 1→2→3 and 4→5 share the backend / `clients`/`calls` schema / the
  admin function. Running them as simultaneous branches recreates the "branch divergence that
  duplicated work" `CLAUDE.md` warns about. One at a time; merge first, branch next.
- **Safe to parallelize:** **Phase 0 (website polish)** is frontend-only (`web/`). Phase 6 (Turnstile)
  and Phase 7 (config) are mostly independent and can slot in flexibly.
- **Worktree/branch tool:** fine for the independent phases; for the sequential backbone, finish + merge
  before starting the next so each builds on a clean `main`.

---

## The phases

### Phase 0 — Website perfection
**Goal:** the marketing site (`web/`) feels premium and has **zero placeholders**.
**What exists:** solid one-page site (`web/app/page.jsx`, components `PhoneCall`/`Calculator`/
`ContactTab`), Terms/Privacy, but a `CONFIG` full of `REPLACE`/empty values (book, portal, demoLine,
phone, address, sampleAudio).
**Plan:** (1) Design polish — spacing/type/motion consistency, hover/scroll micro-animations, mobile
390px, dark/light parity, real OG image; make it feel hand-crafted. (2) Fill ready CONFIG placeholders
(phone, address, legal name, email); leave `portal`→dashboard (Phase 4) and `demoLine` (Phase 3) as
tracked TODOs. (3) Final Terms/Privacy review. (4) Verify: clean `next build`, mobile no-overflow, 0
console errors, screenshots before/after.
**Files:** `web/app/page.jsx`, `globals.css`, `layout.jsx`, components, `terms`/`privacy`.
**Branch:** `feat/site-polish`. **Review:** `/code-review`. **Parallel-safe.**

### Phase 1 — Reconcile & finish monitoring
**Goal:** get already-built monitoring onto `main` cleanly **without double-implementing bans**, and
stand up the external watchdog. Merge/reconcile job, not greenfield.
**What exists:** on `feat/monitoring-alerting`: `heartbeat-monitor` function (unsent-lead check, abuse
burst, alerts via Twilio SMS→`OPS_PHONE` + Resend email), admin `/health`, admin-ui panels,
`docs/MONITORING.md`. **Collision:** that branch's `isBannedCaller` + `20260627…banned_callers.sql`
duplicate Sprint 1's `isBanned` + `20260714…banned_callers.sql` now on `main`.
**Plan:** (1) Rebuild the monitoring pieces on a fresh branch off `main`, **dropping** the branch's ban
duplication (keep `main`'s `isBanned`). (2) Consolidate the duplicated unsent-leads/abuser queries
shared by `heartbeat-monitor` and admin `/health`. (3) Add `[functions.heartbeat-monitor]` to
`config.toml`; deploy. (4) Stand up the external watchdog: one free uptime pinger on the webhook `GET
{status:"ok"}` probe + an external cron POSTing the heartbeat every ~15 min (document setup). (5)
Confirm alerts reach your phone + email.
**Files:** `supabase/functions/heartbeat-monitor/index.ts`, `admin/index.ts` (`/health`),
`config.toml`, `docs/MONITORING.md`. **Branch:** `feat/monitoring-reconcile`. **Review:**
`/code-review`. **Sequential.**

### Phase 2 — Provisioning automation + complete onboarding
**Goal:** pay → sign Terms → **get a working number**, one-click-you-confirm, no fillers. The
"broke-it-twice" manual step becomes a prepared-then-confirmed robot step.
**What exists:** greenfield. Payment only emails ops (`billing/index.ts`:699–702). `/welcome` is static.
**Plan:** (1) New server-side provisioning module (Twilio buy + Vapi register) called from
`checkout.session.completed` **after** `recomputeActive`, reusing `stripe_events` idempotency so it
never double-runs. It buys/selects a Twilio number (area code near the shop where possible), registers
it with Vapi as a **dynamic/server-routed** number (server URL + `?token` + `fallbackDestination` = the
shop's real phone), and writes `inbound_number` (+ shared `vapi_assistant_id`) to the `clients` row as
**`provision_status='staged'`** (not live). (2) **One-click Activate:** alert you (SMS/email +
admin-ui button); tapping Activate flips `provision_status`→`active`. **Never touch `clients.active`
outside `recomputeActive`** — provisioning uses its own `provision_status`. (3) Idempotent +
partial-failure safe (Twilio ok but Vapi failed → clear retryable state + alert; never buy a second
number if `inbound_number` set). (4) `/welcome` shows the real number via a tokenized read endpoint,
replacing "we'll text you shortly." (5) Ensure pay → SignWell Terms → Stripe → `/welcome` reads
seamlessly, no `REPLACE`. (6) New secrets `VAPI_PRIVATE_KEY` + Twilio config; Vapi REST needs a browser
UA (Cloudflare 1010) + full-object PATCH.
**Files:** `billing/index.ts` (+ new `provisioning` module), migration for
`provision_status`/`fallback_number`, `web/app/welcome/page.jsx`. **Branch:** `feat/provisioning`.
**Review:** **`/deep-review`** (payments + live call path + spends money). **Dedicated session. Riskiest.**

> **STATUS (2026-07-14): SHIPPED — but gated OFF pending secrets. ⚠️ ACTION REQUIRED.**
> Provisioning + one-click Activate + the `/welcome` real-number display are built, reviewed,
> merged, and deployed. The migration is applied (existing clients kept live). BUT the robot
> **won't buy anything** until these secrets are set on the `billing` function (else it falls
> back to the old "provision now" email): **`VAPI_PRIVATE_KEY`, `VAPI_ASSISTANT_ID`,
> `VAPI_SECRET`, `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`** (+ optional `TWILIO_NUMBER_COUNTRY`,
> default CA). Full checklist + behavior: [billing README](../supabase/functions/billing/README.md#provisioning-secrets-phase-2--auto-buy-a-number-on-payment).
> Not yet proven with a real paid onboarding (Twilio-test-creds verification only) — **watch
> the first real one in logs.**

### Phase 3 — Live "call our AI" demo number
**Goal:** a real number on the site to hear the AI. **Depends on Phase 2 + the shipped rate limit.**
**Plan:** provision one demo number → shared assistant with demo `variableValues` ("Dispango Demo"),
tight caps (short max duration, per-caller limit, skip lead-SMS for it); set `CONFIG.demoLine` in
`web/app/page.jsx` and redeploy.
**Files:** `web/app/page.jsx`, small demo branch in `handleAssistantRequest`. **Branch:** `feat/demo-line`.
**Review:** `/code-review`. **Small.**

### Phase 4 — Customer login + dashboard
**Goal:** email/password login; each customer sees **only their own** data; a dashboard that looks like
it took 10,000 hours — clean, smooth, unique animations, effective at surfacing info.
**What exists:** greenfield — no auth, no RLS, no Supabase client in `web/`.
**Plan:** (1) **Design-research first** (this phase's session): Calio's public dashboard preview + 2–3
best-in-class SaaS dashboards; agree a direction before coding. (2) **Auth:** Supabase Auth
email+password (+ reset); link each auth user to `clients` via `clients.auth_uid`. (3) **RLS:**
default-deny policies on `clients` + `calls` so a signed-in customer reads only their rows; **verify
webhook/billing/admin service-role paths still work** (service role bypasses RLS). (4) **Dashboard**
(new authed `web/app/dashboard/**`): leads list + call detail (fields, summary, transcript), analytics/
ROI (calls answered, leads, after-hours, est. $ saved), and the approved editable settings via a safe
authed API (never expose the service-role key to the browser). (5) Wire "Sign In"; premium motion.

> **REQUIRED Phase 4 feature — business-hours forwarding window (documented so admins know the
> intended behavior).** Today forwarding is all-or-nothing at the carrier (the `/welcome` guide
> steers shops to "forward when unanswered"), and the `clients` columns `answer_mode='scheduled'`
> + `business_hours` + `timezone` exist but are **NOT wired into the vapi-webhook**. Build a
> real business-hours window: **inside** the shop's configured hours, a call to their Dispango
> number is handled by **our AI agent** (captures the lead as normal); **outside** those hours,
> the AI **bounces the call back to the shop's own number** (Vapi transfer to `fallback_number`)
> rather than answering. Make the window + timezone **customer-editable** in the dashboard, and
> surface the current mode in the **admin** view so we (as admins) can always see, per shop,
> whether calls are going to the AI or bouncing back right now. *(Confirm the exact in-hours vs
> out-of-hours mapping with Abdul before building — this note records the stated intent: AI
> in-hours, bounce-to-shop out-of-hours.)* Prompt stays LEAN; the hours check is webhook logic,
> not a prompt rule.

**Files:** `web/app/dashboard/**`, `web/app/login/**`, a Supabase browser client (anon + RLS), authed
API, migration (RLS + policies + `clients.auth_uid`). **Branch:** `feat/customer-dashboard`.
**Review:** **`/deep-review`** (auth + credentials + RLS). **Sequential.**

### Phase 5 — Admin back-office revamp
**Goal:** rebuild the operator tool to be **intuitive in plain language** for a non-technical operator,
with **troubleshooting** tools and the **monitoring dashboard** baked in.
**What exists:** `admin-ui/index.html` (vanilla, shared-token) — clients table, new-client form,
test-SMS, active toggle, banned panel, basic `/health` card. Functional but bare.
**Plan:** (1) Redesign to match the product's polish; plain-English labels + inline "what this means"
help. (2) **Monitoring dashboard:** leads flowing?, failed-SMS list, abuse, per-client "is this shop's
calls working?", low-balance note, last heartbeat. (3) **Troubleshooting:** a synthetic **"place a test
call"** end-to-end check (the unbuilt spec §F item that would have caught the two server-URL
regressions), "re-run provisioning", "resend a failed lead SMS", per-client drill-down + guided fixes.
(4) Keep token-auth (operator boundary, separate from customer auth).
**Files:** `admin-ui/index.html`, `admin/index.ts` (new troubleshooting endpoints), Phase 1 health
plumbing. **Branch:** `feat/admin-revamp`. **Review:** `/code-review`. **Sequential (after Phase 1).**

### Phase 6 — Spam / abuse polish
**Goal:** protect the paid, public surfaces.
**Plan:** (1) **Cloudflare Turnstile** (free) on `/get-started`; verify server-side at the **top of
`handleSignup`** (after the honeypot, before DB work) — the email-dedupe is the only strong control and
the per-IP limit is spoofable; each signup triggers a billable SignWell doc + emails. Do **before**
paid ad traffic. (2) Confirm abuse rails (bans + hourly/daily cap) + demo caps active.
**Files:** `web/app/get-started/page.jsx`, `billing/index.ts`. **Branch:** `feat/turnstile`.
**Review:** `/code-review`. **Mostly independent.**

### Phase 7 — Trade-neutral future-proofing + launch config + go-live
**Goal:** light groundwork so non-locksmith trades don't embarrass you later, then flip every switch.
**Plan:** (1) **Trade-neutral (light):** store `trade` on `clients` (signup already collects it); make
Vapi structured-output **descriptions** trade-neutral (address/urgency/problem) not locksmith enums, so
a non-locksmith call degrades gracefully. **No** per-trade tuning build. Prompt stays LEAN; fix lead
quality in structured outputs, not prompt rules. (2) **Launch config:** real Cal.com link,
`PUBLIC_SITE_URL`→`dispango.com` after DNS flip (GoDaddy A/CNAME), mailing address, contact phone,
"Sign In"→the Phase 4 dashboard, confirm Stripe live-vs-test mode, OG/domain final. (3) **Final dry run**
(test mode): signup → sign → pay → provision → activate → welcome shows number → place a test call →
lead texts → appears in customer dashboard → admin health green.
**Files:** migration for `trade`, Vapi structured-output edits (API), `web/app/page.jsx` CONFIG, DNS.
**Branch:** `feat/launch-config`. **Review:** `/code-review` + dry run. **Final gate before go-live.**

---

## Cross-cutting invariants (every phase must preserve — from `CLAUDE.md`)

- Signature/token auth gates on all webhooks; **fail open** on DB errors in the call path.
- `clients.active` is owned **only** by `recomputeActive` (signed && paid). Provisioning uses a separate
  `provision_status`, never `active`.
- SMS idempotency (`notified_at`/`notified_phone`); full-lead SMS; skip SMS for junk outcomes.
- Multi-tenant by `inbound_number`; one shared assistant + per-call `variableValues`; dynamic/server
  routing on every number or `{{vars}}` render literally.
- Returning-caller memory coalesced across ~20 calls; lead quality fixed in structured outputs, prompt
  stays LEAN.
- Stripe idempotency via `stripe_events`. Never expose the service-role key to the browser; RLS
  default-deny; service-role paths must keep working.

## Verification (per phase — end-to-end, not just tests)

`deno check` / `next build`; drive the real flow (curl, click through the site, place/simulate a call);
screenshot anything visual; then the phase's review tier (`/code-review`, or `/deep-review` for
payments/auth/live-call-path), fix must-fix findings, re-review the fixes. Then auto-commit → merge →
deploy per the autonomy rule. The **Phase 7 dry run** is the whole-system verification before go-live.
