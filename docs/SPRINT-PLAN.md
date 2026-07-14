# Dispango — Full Sprint Plan (Sprints 1–6)

_Thorough plan for the remaining commercialization work. Companion to
`docs/DISPANGO-STATUS.md` (current state) and `docs/ADMIN-DASHBOARD-SPEC.md` (provisioning detail).
Last updated: 2026-07-13._

## PLAIN-ENGLISH SUMMARY

The website and self-serve sign-up (form → e-sign → pay → branded welcome) are **done and live**.
What's left is the **back office** — the parts that make Dispango run itself and scale safely:

1. **Safety limit** — stop one bad caller from draining your prepaid AI balance. Small, do first.
2. **The provisioning robot** — the big one: when someone pays, automatically buy their phone number
   and wire up the AI, so *you* do nothing. This is the "type a name, they're live" dream.
3. **Live demo number** — a real number on the site people can call to hear the AI (needs #1 first).
4. **Customer login + data lock** — customers manage their own account; the database is walled off so
   one customer can never see another's data. Needed before you have many paying customers.
5. **Serve every trade properly** — today the AI's script is locksmith-shaped; make it fit plumbers,
   HVAC, etc. so the *product* is as broad as the *marketing*.
6. **Polish & protect** — spam protection on the sign-up form, an analytics/leads dashboard for you,
   and finishing the "something's broken" alerts.

Each sprint below has: why it matters, what exists today, the plan, files, risks, and how to verify.
**Recommended order: 1 → 2 → 3, then 4/5/6 as the business needs them.** Deploys are always
human-gated (`supabase functions deploy` / `db push` / Vercel). Backend sprints should each get a
`/code-review` (or `/deep-review` for anything touching payments or the live call path) before going live.

---

## Sprint 1 — Per-caller abuse rails (safety rail) — DONE (branch `feat/abuse-rails`, not deployed)

**Why:** Vapi is prepaid and AI minutes are ~90% of per-call cost. A robocaller or prankster spinning up
the assistant repeatedly can burn your loaded balance. Small change, protects real money, and is a
prerequisite for the public demo number (Sprint 3).

**Correction (what code review actually found):** the per-caller rate limit the "KNOWN GAP" described
**already existed** — `RATE_LIMIT_PER_DAY = 10` + `countRecentCalls` in `handleAssistantRequest`, which
declined over-limit callers via `Response.json({ error })` before spending AI minutes. The genuinely open
gap was the **`banned_callers` list, which the webhook never checked** — admin `/banned` routes + UI
wrote to it, but banning a number did nothing. Also: `banned_callers`/`calls`/`clients` existed only in
the live DB, not captured in any migration.

**Delivered:**
1. **Ban enforcement** — added `isBanned(phone)` and a check at the top of `handleAssistantRequest`'s
   `try` (before rate-limit/memory) that declines a banned caller with `Response.json({ error })`. Fails
   open on DB error.
2. **Hourly cap** — added `RATE_LIMIT_PER_HOUR = 5` alongside the existing `RATE_LIMIT_PER_DAY = 10`;
   `isRateLimited` blocks a caller at ≥5 completed calls in the last hour **or** ≥10 in the last day.
3. **Migration** — `supabase/migrations/20260714000000_banned_callers.sql` captures the table
   (`create table if not exists`, safe no-op live). A full `calls`/`clients` baseline via `supabase db
   pull` was attempted but blocked by a remote migration-history mismatch (repair mutates remote state →
   human-gated); left as a follow-up.

**Deferred:** counting **in-flight/simultaneous** calls (only completed calls are counted — a burst of
concurrent calls from one number can still slip through); auto-banning repeat limit-trippers (risks
banning a legit heavy caller — bans stay a deliberate admin action).

**Files:** `supabase/functions/vapi-webhook/index.ts`; `supabase/migrations/20260714000000_banned_callers.sql`.

**Invariants kept:** returning-caller memory + multi-tenant resolution untouched; fail *open* on DB error;
decline shape spends no AI minutes; `clients.active` still owned by billing's `recomputeActive`.

**Verification:** type-check passes; ban + hourly cap + fail-open smoke-tested via local serve; run
`/code-review` on the webhook diff before deploy.

**Size / sensitivity:** Small. Touches the **live call path** → `/code-review` before deploy.

---

## Sprint 2 — 🌟 Auto-provisioning robot (hands-off onboarding)

**Why:** This is the biggest lever and the "minimize my input" goal. Today, after a customer signs +
pays, **a human manually buys a Twilio number and wires the Vapi assistant** — the step that "silently
broke the live system twice." Automating it makes onboarding instant and fully self-serve, and makes the
`/welcome` page able to show the customer their real number immediately.

**Current state / gap:** No code anywhere calls the Twilio or Vapi APIs to *create* numbers/assistants —
it's all read/consume. On payment, `billing`'s Stripe webhook (`checkout.session.completed`) currently
just emails ops "provision now." The shared Vapi assistant (`VAPI_ASSISTANT_ID`) serves everyone; per-shop
identity is injected per call via `assistantOverrides.variableValues` in `handleAssistantRequest`. Numbers
are BYO Twilio imported into Vapi. Spec for this work: `docs/ADMIN-DASHBOARD-SPEC.md` §B.

**Plan (the provisioning routine):**
1. **Buy a Twilio number** via the Twilio REST API (`AvailablePhoneNumbers` → `IncomingPhoneNumbers`),
   using `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`. Pick area code near the shop where possible.
2. **Register it with Vapi** as a phone-number resource (provider `twilio`, the BYO credentials),
   attaching **no static assistantId** — it must use **dynamic/server routing** (a `server.url` on the
   number pointing at the vapi-webhook `?token=<VAPI_SECRET>`), plus a `fallbackDestination`. (If the
   number has no assistant *and* no server URL, calls don't connect — see `CLAUDE.md`.)
3. **Write the row:** set `inbound_number` (+ `vapi_assistant_id` = the shared assistant) on the client's
   `clients` row so the webhook resolves them. Keep `active` governed solely by `recomputeActive`.
4. **Trigger:** run this routine when `subscription_status` + `contract_status` both reach done — cleanest
   is inside the `checkout.session.completed` handler in `billing` (replace the "email ops" step), or a
   small queued/admin-triggered job the ops email links to. Make it **idempotent** (don't buy a second
   number if `inbound_number` is already set) and safe to retry.
5. **Store forwarding-ready info** and surface the number on `/welcome` (pass the token, look it up) and in
   the welcome email, replacing the "we'll text your number shortly" placeholder.
6. **Gotchas from `CLAUDE.md`:** the Vapi REST API rejects the default python-urllib User-Agent
   (Cloudflare 1010) — use a browser UA / curl-style client; PATCHing the model requires sending the whole
   model object back.

**Files:** `supabase/functions/billing/index.ts` (provisioning routine + trigger); a new shared module for
Twilio/Vapi API calls; likely new secrets (`VAPI_PRIVATE_KEY` if not present, Twilio number config);
possibly `clients` columns for `provision_status` / `fallback_number` (small migration).

**Invariants / risks:** **HIGH sensitivity — touches the live call path and spends money (buys numbers).**
Must be idempotent (Stripe can replay webhooks — reuse the existing `stripe_events` idempotency).
Never flip `active` outside `recomputeActive`. Never wipe an existing `inbound_number`. Handle partial
failure (number bought but Vapi wiring failed) with a clear retryable state + ops alert. Test against a
Twilio subaccount / Vapi test setup first if possible.

**Verification:** End-to-end in test mode: pay → confirm a number is purchased, appears in Vapi with the
correct server URL + token + fallback, the `clients` row gets `inbound_number`, and a smoke-test
`assistant-request` to that number resolves the right shop. Confirm replaying the Stripe event buys nothing
new. Confirm a forced Vapi-failure leaves a clean retryable state.

**Size / sensitivity:** Large + **`/deep-review`** before deploy. Give it its own session.

---

## Sprint 3 — Live "call our AI" demo number

**Why:** The website's "See It in Action" section is built with a placeholder call-in tile. A real number
visitors can call to talk to the AI is the most convincing demo. **Depends on Sprint 1** (a public number
without a rate limit is an open door to draining the balance).

**Current state / gap:** `/welcome` and the home "See It in Action" section already have the UI; `CONFIG.demoLine`
in `web/app/page.jsx` is empty and the tile shows "launching shortly" until set.

**Plan:**
1. Provision one dedicated **demo number** (via Sprint 2's routine or manually) pointed at the shared
   assistant with **demo `variableValues`** (e.g. business_name "Dispango Demo").
2. Apply **tight caps** on the demo path: short `maxDurationSeconds`, aggressive per-caller rate limit
   (Sprint 1), and ideally a daily cap on total demo minutes.
3. Set `CONFIG.demoLine` (and redeploy) so the site shows the number as a clickable `tel:` link.

**Files:** `web/app/page.jsx` (`CONFIG.demoLine`), reuse Sprint 1 + 2. Optional: a demo-specific branch in
`handleAssistantRequest` for stricter caps.

**Invariants / risks:** Cost/abuse — do NOT ship before Sprint 1. Keep the demo assistant clearly labelled
so demo calls aren't mistaken for a real shop's leads (skip SMS dispatch for the demo number).

**Verification:** Call the number, confirm the AI answers as the demo persona, confirm caps trigger,
confirm no lead SMS is sent for demo calls.

**Size / sensitivity:** Small (given 1 + 2). Touches live call path → `/code-review`.

---

## Sprint 4 — Customer login dashboard + RLS (multi-tenant isolation)

**Why:** Makes the "Sign In" button real (today it's a Stripe-portal/mailto stub) and lets customers see
their leads / manage their subscription. **RLS (Row-Level Security)** walls the database so one customer's
queries can never read another's rows — mandatory before you have many paying customers. Currently the
only auth is a single shared admin token; there is no customer-facing login and no RLS.

**Plan:**
1. **Auth:** use Supabase Auth (email magic-link or password) to give each customer a login tied to their
   `clients` row (add a `user_id`/`auth_uid` link).
2. **RLS:** enable Row-Level Security on `clients` and `calls`; add policies so a signed-in customer can
   read only rows where `client_id` matches their own. Keep the service-role paths (webhook, billing,
   admin) working (service role bypasses RLS).
3. **Dashboard:** a customer area (in the Next app or a separate authed app) showing their recent leads
   (`calls`), their number/forwarding status, and a link to the Stripe **customer portal** to manage
   billing. Wire the site's "Sign In" to this.

**Files:** new authed routes in `web/`; Supabase Auth config; a migration enabling RLS + policies + the
`clients.auth_uid` link; possibly a small read API or direct Supabase client with RLS.

**Invariants / risks:** **Security-sensitive.** Enabling RLS can silently break the existing webhook/admin
paths if they don't use the service role — verify each. Get the policies right (default-deny). Don't expose
the service-role key to the browser.

**Verification:** Two test customers can each see only their own leads; the webhook + billing + admin still
function; a logged-out user sees nothing. `/deep-review` (security + credentials).

**Size / sensitivity:** Medium-large + **`/deep-review`**.

---

## Sprint 5 — Per-trade backend generalization

**Why:** The shared Vapi assistant's prompt and the structured lead schema are **locksmith-shaped**. The
site now markets to plumbers, HVAC, electricians, etc., but to *serve* those callers well the AI needs
trade-appropriate questions and lead fields. (Lead-data quality is fixed in the Vapi **structured outputs**,
not by piling rules into the prompt — see `CLAUDE.md`.)

**Current state / gap:** One shared assistant + one lead schema. The signup already captures `trade`
(currently only in the ops email). Per-trade behaviour would key off the client's trade.

**Plan:**
1. Decide the mechanism: per-trade **variableValues** injected per call (lean, one assistant) vs. per-trade
   structured-output variants. Prefer the lean route — inject trade-specific guidance + expected fields via
   `assistantOverrides` in `handleAssistantRequest`, keyed off a stored `trade` on the `clients` row.
2. Store `trade` (and maybe `services_offered`) on `clients` (small migration; signup already collects it).
3. Tune the structured-output **descriptions/schema** via the Vapi API to be trade-agnostic but complete
   (address/urgency/problem), not locksmith-specific enums. Keep the prompt LEAN.
4. Version the prompt changes under `prompts/` (canonical + `versions/` + CHANGELOG) per project protocol.

**Files:** `supabase/functions/vapi-webhook/index.ts` (inject trade context), a migration to store `trade`,
`prompts/` updates, Vapi structured-output edits via API.

**Invariants / risks:** Keep the prompt lean (over-stacking rules caused question-stacking/nonsense before).
Fix lead quality in the structured outputs, not the prompt. Test per trade.

**Verification:** Smoke-test calls for 2–3 trades; confirm the AI asks trade-appropriate questions and the
lead SMS contains the right fields.

**Size / sensitivity:** Medium. Touches the live call path + prompt → `/code-review` + careful prompt testing.

---

## Sprint 6 — Polish & protect (follow-ups)

Smaller items; do as the business needs them.

- **Turnstile / CAPTCHA on the signup form** (from the Sprint B security review): the public `/signup`
  endpoint's only strong abuse control is the email-dedupe; the per-IP limit is spoofable, and each signup
  triggers a billable SignWell doc + email. Add Cloudflare Turnstile (free) to `web/app/get-started` and
  verify the token server-side in `handleSignup` **before** driving paid ad traffic.
- **Admin analytics / leads views:** extend the admin-ui + `admin` function with leads and simple
  call/lead analytics per client (volume, after-hours, lead sources). Partially specced in
  `docs/ADMIN-DASHBOARD-SPEC.md`.
- **Finish monitoring/alerting:** attack detection + "calls not connecting for a customer" alerts. There's
  a `heartbeat-monitor` function, an admin `/health` endpoint, and branch `feat/monitoring-alerting` —
  reconcile and finish.
- **Config cleanup for launch:** real Cal.com booking link, switch `PUBLIC_SITE_URL` to `dispango.com`
  after DNS flips, mailing address, contact phone, Stripe customer-portal link for "Sign In", and confirm
  Stripe is in the intended (test vs live) mode.

**Sensitivity:** Turnstile touches the public endpoint (`/code-review`); the rest are lower-risk.

---

## Cross-cutting notes

- **Branch discipline:** website/onboarding lives on `feat/marketing-site-nextjs` (not yet merged to
  `main`). Backend sprints should each get their own short-lived branch; merge to `main` via PR; deploy is
  a separate human step. See `CLAUDE.md`.
- **Deploys are human-gated:** `supabase functions deploy <fn>`, `supabase db push --linked`, Vercel.
- **Review tiers:** live call path / payments / credentials / RLS → `/deep-review`; other executable
  changes → `/code-review`.
- **Preserve the load-bearing invariants:** signature/token auth gates, `active = signed && paid`
  (`recomputeActive` only), SMS idempotency, `active=false` on client create, dynamic/server routing on
  every number, lean prompt + structured-output-driven lead quality.
