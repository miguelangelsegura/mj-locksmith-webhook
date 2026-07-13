# Dispango — Commercialization Revamp Plan (locksmith AI receptionist)

> Approved plan of record for getting Dispango commercialization-ready. Living document.

## PLAIN-ENGLISH SUMMARY

**What we're doing:** get Dispango to the point where we can sign a paying locksmith in the next
few days — a real website, a $199/mo payment that just works, and an onboarding process where you
type a company's name and the system does everything else (gives them a phone number, sets up their
AI agent with their name/location, starts billing).

**The single most important finding:** we already have far more built than a first look suggests.
Miguel built a *complete, working* payment + contract system, and there's a polished website.
State of each piece, in plain terms:

- **Website** — ✅ A real, good-looking one-page Dispango site exists. It just has placeholder
  contact info, no domain attached, and isn't the Calio-style design we want yet.
- **Payment ($199/mo)** — ✅ Fully built and working. A customer clicks one link, e-signs a
  contract, pays by card, and their account switches on automatically. If they stop paying, it
  switches off automatically. Remaining: plug in the real $199 price, add the 14-day free trial,
  flip out of "test mode."
- **Onboarding automation** — ⚠️ **The real hole.** Today, when someone pays, the system emails
  *you* saying "now go buy their phone number and set up their AI by hand." The part specifically
  asked for — *type a company name → it generates their number and stands up their agent* — is the
  piece that doesn't exist yet. Very buildable (Twilio + Vapi both have APIs); the "swap in company
  name/location" part already works.
- **Admin dashboard** — ✅ Works (add clients, send onboarding links, ban abusive callers, health
  readout). Plain-looking and not hosted anywhere yet.
- **Monitoring** — ⚠️ Alerts for "a lead text failed" or "one number is being spammed," but
  system-wide. It **cannot** yet tell you "Customer X's calls stopped coming through." Also stranded
  on an un-merged branch, so `main` doesn't have it.
- **Code health** — ⚠️ Code split into two branches that each have half the picture (one has
  billing+website, the other has monitoring). Merging them back is step zero.

**Analogy:** a car with a working engine, a working payment meter, and a decent paint job — but the
key-cutting robot that should make each customer's key automatically still needs a human to do it by
hand, and the two halves of the car are in two different garages.

**Recommended order:** website-first is tempting, but the website is the *least* revenue-blocking
piece because a good one already exists. Critical path to a paying, live customer is:
(0) merge the code back together, (1) put the existing site online today so calls have a URL,
(2) build number-provisioning automation, (3) finalize billing. The prettier Calio-style website is
polish that runs in parallel and shouldn't block the first sale.

---

## Context

Dispango is a multi-tenant AI phone receptionist for locksmiths (Vapi voice agent → captures lead →
Twilio SMS to the shop). The call engine is production-grade. Goal: commercialization readiness —
public website on **dispango.com**, seamless $199/mo billing, and **fully automated onboarding**
(operator adds a company → number provisioned + agent wired + billing started). Locked decisions:
**Next.js + Tailwind on Vercel** for the site; **auto-buy a new Twilio number the customer forwards
to** for connectivity. Payment is operator-driven (admin generates a sign+pay link, emails it);
customer self-serve signup is deferred.

### Verified current state (on `origin/main` unless noted)
- **Website:** `website/index.html` (single static file, inline CSS/JS, scroll-reveal animations,
  Calendly popup, phone mockup, JSON-LD SEO) + `website/privacy.html` (PIPEDA template). Branded
  Dispango, palette `--brand:#2f6bed`. Placeholders: Calendly link, email, phone, legal name/address
  (`window.DISPANGO` config), testimonials, `dispango.com` (`REPLACE-WITH-YOUR-DOMAIN`). No pricing
  figure shown. Intended host in README = Netlify drag-drop.
- **Billing (complete):** `supabase/functions/billing/index.ts` — SignWell e-contract + Stripe
  **subscription** Checkout. Routes: `POST /onboarding`, `POST /onboarding/send`, `GET
  /onboarding/:token/pay` (→ Stripe Checkout 302), `GET /onboarding/:token/done`, `POST
  /webhooks/signwell`, `POST /webhooks/stripe`. `active = (contract_status==='signed' &&
  subscription_status==='active')` via `recomputeActive()`. Full webhook lifecycle + idempotency
  (`stripe_events`). **No trial** currently. Price = `STRIPE_PRICE_ID` (test placeholder).
  `SIGNWELL_TEST_MODE` defaults `"true"`. On payment: `notifyOps("New paying customer — provision
  now …")` — a manual handoff.
- **Billing schema:** `20260624000000_clients_billing.sql`, `20260624000100_stripe_events.sql`,
  `20260626000000_clients_owner_phone.sql`.
- **Admin UI:** `admin-ui/index.html` — login (admin token), clients list w/ lifecycle pills,
  onboarding-link generate/copy/email-to-client, Test SMS, activate/deactivate, banned-numbers,
  health panel. `admin-ui/done.html` = styled confirmation page. Not deployed.
- **Provisioning:** **absent.** No Twilio `availablePhoneNumbers`/`incomingPhoneNumbers`, no
  `api.vapi.ai` calls in `billing`/`admin`. `vapi_assistant_id`/`inbound_number` hand-typed.
  Identity swap works: `vapi-webhook` `handleAssistantRequest` injects `business_name`/`agent_name`
  via `assistantOverrides.variableValues` per call.
- **Monitoring (on `feat/monitoring-alerting`, NOT `main`):** `heartbeat-monitor/index.ts` (needs
  external cron; alerts unsent-lead + abuse-burst via Twilio SMS / optional Resend email),
  `banned_callers` migration (`20260627…`), rate-limit (10 calls/day/caller) + ban check in
  `vapi-webhook`. **Global only — no per-customer "calls not arriving" detection.**
- **Branch divergence:** local checkout `feat/monitoring-alerting`, **32 commits behind**
  `origin/main`. `main` has billing+website but not heartbeat/banned-callers; the monitoring branch
  has those but not billing+website. Overlap in `admin/index.ts` + admin-ui health/ban panels.

### Available keys/tools
Twilio ✅, Vapi (`VAPI_PRIVATE_KEY`) ✅, Supabase Edge Functions, Vercel (MCP present, needs OAuth),
Stripe (Miguel), SignWell (Miguel), Resend. Playwright available for pixel-comparing calio.ca.

---

## Sprint 0 — Unify the codebase (½ day) — **do first, unblocks everything**

One working `main` with billing + website + monitoring, and a current local checkout.
- Reconcile `feat/monitoring-alerting` into `main` via PR (human-gated merge). Resolve overlap in
  `admin/index.ts` and admin-ui health/ban panels. Ensure the `banned_callers` migration and
  `heartbeat-monitor` land on `main`, and `main`'s `/banned` endpoints have their backing table.
- Verify: `deno check` all functions; `supabase db push --linked` dry-run for migration ordering;
  smoke-test `assistant-request` routing. Delete stale branches after merge.

## Sprint 1 — Website live on dispango.com (1 day)

**1a — Ship the existing site TODAY (≈1 hr)** so sales calls have a URL:
- Fill `window.DISPANGO` config (Calendly, email, phone, legal name/address) in both HTML files;
  replace `REPLACE-WITH-YOUR-DOMAIN`/OG/JSON-LD. Deploy to Vercel (static), attach dispango.com.

**1b — Calio-style redesign in Next.js + Tailwind:**
- Playwright-screenshot calio.ca section-by-section (desktop + mobile); capture layout/animations.
- Rebuild in Next.js (App Router) + Tailwind + Framer Motion within ~5px, but with **original copy**
  (reuse existing locksmith copy), **Dispango's own colors/wordmark/assets**, and a real **$199/mo
  pricing section**. Structure-similarity is fine; copied text/images/branding is the liability —
  keep those original. *Not legal advice.*
- Screenshot-diff vs calio.ca to confirm ~5px intent, then differentiate branding. Deploy; keep
  `privacy.html` linked.
- **"Hear the AI" demo:** (1) **Recorded sample call** — audio player w/ a 30–45s locksmith call and
  synced transcript animation (cheapest, no live cost); (2) optional **live "Talk to our AI now"**
  in-browser via Vapi web-call SDK, guarded by existing rate-limit/abuse caps. Keep Calendly CTA.
- **Also add** a **missed-call cost calculator** (slider) + **honest-comparison section**.

## Sprint 2 — Fully automated onboarding / number provisioning (2–3 days) — **core ask**

Turn the manual "provision now" email into code (new `supabase/functions/provision/` or invoked
from the Stripe `checkout.session.completed` handler), auto-triggered on **signed+paid** and also
runnable via an admin **"Provision"** button (idempotent):
1. **Buy a Twilio number** — `availablePhoneNumbers/{country}/Local` by area code → `IncomingPhoneNumbers`.
2. **Import into Vapi** — register the BYO Twilio number, attach the **shared** assistant, set the
   phone-number resource's `server.url` = webhook `?token=<VAPI_SECRET>` + `fallbackDestination`
   (PATCH sends the full object back).
3. **Write the client row** — set `inbound_number`, mark `provisioned_at` (new column). Identity
   swap already works via `variableValues`.
4. **Notify the customer** — email their number + carrier call-forwarding dial codes (Resend).
5. **Idempotency + rollback** — never double-buy on webhook retries; on Vapi-wiring failure, don't
   orphan a paid Twilio number.
- **Go-live self-check:** verify the number resolves the right `business_name`/`agent_name` so
  `{{...}}` never leaks. Verify end-to-end on a real test area code.

## Sprint 3 — Billing finalization + trial (½ day)

- Create real **$199/mo** Stripe price; set `STRIPE_PRICE_ID`.
- Add **14-day trial** (`subscription_data.trial_period_days: 14`) — recommend card-on-file so it
  auto-converts. Map Stripe `trialing` → active in `handleStripeEvent`.
- Set `SIGNWELL_TEST_MODE="false"`, finalize contract template, set all prod secrets.
- Verify: full chain in test mode → sign → pay → trial → provision → live; then a live smoke.

## Sprint 4 — Monitoring & per-customer health (1–2 days)

- **Per-client health:** track `last_call_at` per client; flag zero-calls-in-N-days vs baseline;
  surface failed/anomalous outcomes per client. Group heartbeat metrics by `client_id`.
- **Active line check:** scheduled per-number probe (Vapi status API or low-frequency synthetic
  call) so a broken forward alerts before the customer complains.
- **Scheduling:** move heartbeat to Supabase **pg_cron** (or committed GitHub Actions cron).
- **Abuse view:** surface rate-limit hits + abuse-burst per client; keep manual-ban workflow.
- Verify: simulate a client going dark and a dispatch-SMS failure; confirm both alert.

## Sprint 5 — Admin dashboard polish + deploy (1 day)

- Deploy `admin-ui` to Vercel (access-protected), subdomain `admin.dispango.com`.
- Add the **Provision** button/status (S2) and **per-customer health** column (S4). Light cleanup.

## Sprint 6 — Launch hardening / go-live (½ day)

- Full dry-run with a pilot shop: sign → pay → auto-provision → forward line → live call → lead SMS
  → dashboard healthy.
- **A2P 10DLC** SMS registration check (Twilio). Secrets audit. Onboarding runbook. Confirm Vapi
  prepaid balance + conservative auto-reload.

## Sprint 7 — Calio feature parity (post-launch fast-follow, 3–5 days)

Calio is built for **appointment businesses**; Dispango serves **locksmiths** (mostly emergency
dispatch), so gaps are prioritized by locksmith value, not 1:1 copying. Calio charges **$499/$799** —
our $199 is a positioning strength.

| Feature | Dispango today | Priority |
|---|---|---|
| Customer-facing portal/dashboard | Data in `calls`; no customer view | **HIGH** |
| Call logs w/ transcript + AI summary + outcome | Operator-only | **HIGH** |
| Caller-facing SMS confirmation + reminders | Only dispatch SMS to shop | **MEDIUM** |
| Self-serve AI config (services, staff, tone) | Operator edits DB | **MEDIUM** |
| Voice picker (self-serve) | Fixed "Elliot" | **LOW–MED** |
| Live transfer to a human | None | **MEDIUM** |
| Real-time appointment booking + calendar | None | **LOW for locksmiths** |
| 3rd-party integrations (Jobber, Housecall Pro…) | None | **LOW–MED** |
| Missed-call cost calculator on site | None | **LOW** (do in 1b) |
| Two-tier pricing (self-serve vs done-for-you) | Single $199 | **DECISION** |
| Spam detection / filtering | ✅ have it | — |

**Build order:** (1) Customer portal + call logs — **mirror Calio's dashboard design** (Playwright
clone within ~5px, our branding; nav Overview · Jobs/Leads · Call Logs · Customers · SMS History ·
My AI Receptionist · Settings · Billing). (2) Self-serve AI settings + voice picker. (3) Caller SMS
confirmation. (4) Live transfer. (5) Marketing calculator + comparison. Defer booking + integrations
until a paying locksmith asks. *Fast-follow — does not block first customers.*

---

## Execution strategy — parallelization

**Sprint 0 is a hard sequential gate** (its whole purpose is to end the branch divergence; parallel
work before a unified `main` recreates the mess). After it, the clean split is **two tracks, not
seven**, on isolated branches/worktrees, integrated via PRs:
- **Track A — Frontend:** Sprint 1 (website) → Sprint 7 portal UI. Separate Next.js/Vercel codebase,
  ~zero overlap with backend.
- **Track B — Backend:** Sprints 2 → 3 → 4 → 5 → 6, largely **sequential** — 2/3/4 all edit
  `billing/index.ts` + `admin/index.ts` + the migration chain, so parallel agents there collide.

Not one-agent-per-sprint: shared files + 5/6 depending on 2/4's output = merge conflicts and wasted
tokens. Real bottleneck is human-gated anyway (deploys, live keys, buying numbers, DNS, OAuth, PR
merges). Cap at ~2–3 agents.

## Open items / decisions
- **Domain:** admin access is enough if it includes DNS-edit rights (add one CNAME/A record, or point
  nameservers at Vercel). No ownership/transfer needed. Else Miguel adds one DNS record.
- **Vercel authorization:** connector needs OAuth in an interactive session before deploy/domain.
- **Trial mechanics:** 14-day trial with card-on-file (recommended) vs no-card.
- **calio.ca:** https://www.calio.ca/ (JS SPA — capture via Playwright in Sprint 1b).

## Verification bar
After each sprint: `deno check` on changed functions; deploys human-gated per team protocol;
end-to-end smoke of the affected flow with real evidence (test call, screenshot, Stripe/SignWell
test event) before calling it done.
