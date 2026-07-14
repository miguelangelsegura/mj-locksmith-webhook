# Dispango — Commercialization Status & Roadmap

_Reference doc for continuing work in a fresh session. Last updated: 2026-07-13._

## Plain-English summary

Dispango (product brand; legal entity **Jam Works Inc.**) is an AI phone receptionist for the
**Canadian trades industry** — it answers calls 24/7 in the shop's name, captures the job, and texts
the lead to the owner. Priced flat **$199/mo**. We're modelling the go-to-market on competitor
**calio.ca**, on domain **dispango.com**.

The **storefront (website)** and the **sign-up desk (self-serve onboarding + payment)** are built and
live. What's left is the **back office**: the robot that auto-provisions each customer's phone number,
safety rails, and a customer login. See Roadmap.

## What's LIVE right now

- **Website (v3):** https://dispango.vercel.app (Vercel project `dispango`, team `00-yeah-baby`).
  Home, `/get-started`, `/welcome`, `/terms`, `/privacy`. Brighter indigo palette, animated live-call
  phone, 8 concrete USP cards, numbered How It Works, iconic Industries, animated pricing ($199
  count-up), cost-vs-human bar, See It in Action, integrations marquee + custom-work pitch, Contact
  section, floating Contact tab, Sign In + Get Started nav. Title-Case headings, Canadian OG preview.
  Verified: clean build, mobile 390px no overflow, 0 console errors.
- **Self-serve onboarding (Calio-style):** `/get-started` form (business, email, cell-for-leads, trade,
  voice, line-type, Terms/Privacy consent) → **public `POST /signup`** on the billing Edge Function →
  creates a `clients` row (`active=false`) → existing **SignWell e-sign** → **Stripe Checkout** →
  branded **`/welcome`** page with auto-generated **call-forwarding steps** (tabbed mobile/landline/VoIP
  + "we'll set it up with you" fallback). Human still does the ~5-min Vapi number wiring after payment.
- **Backend deployed:** billing function deployed to Supabase project `yqyvybukyfokyfsjzyso`; migration
  `20260713000000_clients_contact_email_unique.sql` applied; secrets `PUBLIC_SITE_URL` (→ vercel URL)
  and Vercel env `NEXT_PUBLIC_BILLING_URL` set. Endpoint guards verified live (validation, honeypot,
  dedupe). All Stripe/SignWell/Resend/OPS secrets were already configured.

## Security note (a real bug was caught + fixed)

A code review found that re-POSTing `/signup` with an already-**signed** email would have regenerated
the contract and **wiped the signature** (unauthenticated griefing vector). Fixed: signed-but-unpaid
now routes straight to `/pay`; added the unique-email index + 23505 catch (dedupe race), persist
resubmit edits, bounded the rate-limit map. **Outstanding recommendation:** the only strong abuse
control is the email-dedupe; the per-IP limit is spoofable — add **Cloudflare Turnstile/CAPTCHA** to
the form before driving paid ad traffic.

## Config placeholders to fill before real launch

- **Cal.com booking link** — the "Book a demo" buttons point at `https://cal.com/REPLACE/dispango-demo`
  (in `web/app/page.jsx` CONFIG). Cal.com individual plan is free.
- **`PUBLIC_SITE_URL`** secret currently = `https://dispango.vercel.app`; switch to `https://dispango.com`
  once DNS is flipped (then `/welcome` lives on the real domain).
- **dispango.com DNS at GoDaddy** (you/Miguel) — still points at the OLD site. Vercel alias is set; needs
  A `@` → `216.198.79.1` + `64.29.17.1` (or `76.76.21.21`), CNAME `www` → `cname.vercel-dns.com`.
- Mailing **address**, contact **phone**, and the **"Sign In"** target (Stripe customer portal URL).
- **Stripe mode:** confirm keys are test vs live. A test card (`4242...`) declines on live keys (safe).

## Test the workflow (no real money — test mode)

1. Go to `dispango.vercel.app/get-started` (or reuse a generated signing link).
2. Sign the agreement (SignWell test mode).
3. Pay with Stripe test card `4242 4242 4242 4242`, any future expiry/CVC/postal.
4. Land on `/welcome`. Delete the test `clients` row afterward via the admin-ui.

## Roadmap (remaining sprints, in recommended order)

1. **Per-caller abuse rails** (small, high value) — **DONE (branch `feat/abuse-rails`, not yet deployed).**
   The per-caller rate limit already existed (10/day); tightened it to add a **5/hour** cap, and — the
   real open gap — the `banned_callers` list was never enforced in the webhook, so **ban enforcement was
   added** to `handleAssistantRequest`. Both decline before any AI minutes are spent. Deferred: counting
   in-flight/simultaneous calls (only completed calls are counted today). Unblocks the public demo number.
2. **🌟 Auto-provisioning robot** (the big one, "minimize my input"): on payment, auto-buy a Twilio
   number → attach the shared Vapi assistant → set server URL + secret + fallback → write the row. Makes
   onboarding fully hands-off (number is instant on `/welcome`). Touches the live call path (broke it
   twice when done by hand) — needs a careful dedicated session + review. Spec: `docs/ADMIN-DASHBOARD-SPEC.md`.
3. **Live "call our AI" demo number** on the site (depends on #1).
4. **Customer login dashboard + RLS** (multi-tenant DB isolation) — makes "Sign In" real; needed before
   many paying customers.
5. **Per-trade backend generalization** — the shared Vapi prompt + lead schema are locksmith-shaped;
   generalize per trade to serve plumbers/HVAC/etc. well (not just market to them).
6. **Follow-ups:** Turnstile/CAPTCHA on signup; admin analytics/leads views; finish attack +
   "calls-not-connecting" monitoring (branch `feat/monitoring-alerting`).

## Key files & where things live

- Website: `web/app/page.jsx` (all sections + CONFIG), `web/app/globals.css` (palette/animations),
  `web/app/layout.jsx` (font + OG metadata), `web/app/components/{PhoneCall,Calculator,ContactTab}.jsx`,
  `web/app/{get-started,welcome,terms,privacy}/page.jsx`.
- Backend: `supabase/functions/billing/index.ts` (signup + Stripe + SignWell), `supabase/functions/admin/index.ts`
  (admin-token client CRUD), `supabase/functions/vapi-webhook/index.ts` (live call path).
- All website + onboarding work is on branch **`feat/marketing-site-nextjs`** (committed + pushed; not yet
  merged to `main`). Deploys are human-gated. See `CLAUDE.md` for git/deploy protocol.
