# Go-To-Market Plan — Commercializing the Locksmith Voice Agent

Plain-language plan to take the working product (multi-tenant call → SMS dispatch, shared
Vapi assistant, outreach engine) and turn it into a business we can sell — starting with
**cold calls**. Each item has a "**What we're doing**" (so anyone can pick it up and brief
their own helper) and a "**Why**". Work is split across Abdul, Miguel, and Jordan.

Status: ☐ not started · ◐ in progress · ☑ done.

---

## Friday gate (2026-06-26) — minimum to START cold calling

Goal: by end of Friday's meeting, be able to start cold calling. "Ready to cold call" is a
LOWER bar than "ready to charge a customer" — there's a lag of days/weeks between the first
call and the first signed customer, so the heavy items (legal, A2P/10DLC, billing,
onboarding automation) finish *during* the sales pipeline, not before the first dial.

Minimum to dial:
- ☐ **A price to quote** — Abdul + Miguel, **decided at the meeting** (the one hard blocker).
- ☐ **A v1 cold-call pitch + basic objection answers** — Abdul.
- ☑ **A working demo** — the live M&J line already proves the product (dedicated demo number
  is a nice-to-have, not a blocker).
- ☑ **A booking link to send prospects** — Calendly ready
  (https://calendly.com/miguel-dispango/30min); Jordan embeds it in the landing page.
- ☑ **A target call list** — already in `outreach/contacted.csv` (Calgary shops).
- ◐ **Basic credibility** — one-page site (Jordan) ideal; not strictly blocking first calls.

NOT required to start calling (must land before the first *close/switch-on*, not before the
first dial): incorporation, legal docs, A2P/10DLC, billing, onboarding automation, monitoring.

Discipline: don't cold-call faster than we can onboard. Start with a **small pilot batch** so
the first "yes" isn't left unserved while we finish contracts + SMS registration.

## Near-term: test the setup at the next meeting

- ☐ **Dry-run the full onboarding with Jordan playing a customer.** Walk Jordan through the
  entire setup as if he just signed up, start to finish.
  - **What we're doing:** rehearsing the real customer experience to find every confusing
    or broken step *before* a paying customer hits it.
  - **Why:** the fastest way to discover gaps in the setup process is to actually run it on
    a "fake customer." Output = a punch-list of what to fix/automate.

---

## Abdul

- ☐ **Incorporate the company.**
  - **What we're doing:** registering a corporation (federal, ~$200, protects the name
    Canada-wide) so the *company* holds the contracts, money, and risk — not us personally.
  - **Why:** once we take payments and handle people's call data, an unincorporated setup
    leaves our personal assets exposed if anything goes wrong.
- ☐ **GST/HST registration + business bank account.**
  - **What we're doing:** registering for HST (required over $30k/yr, fine to do early) and
    opening a dedicated business bank account.
  - **Why:** needed to invoice correctly and to keep the "company vs personal" wall real.
- ☐ **Uptime monitoring + alerting (incl. Vapi balance safety).**
  - **What we're doing:** a watcher that pings the live webhook and alerts us fast if it
    breaks, plus a **Vapi low-balance alert + auto-reload**.
  - **Why:** all customers run off the system; if the webhook dies or the prepaid balance
    hits $0, lines go silent and we must know before a customer does.
- ☐ **Cold-call pitch / script.**
  - **What we're doing:** write the actual pitch used on calls — opener, the value in one
    line, answers to the common objections, and the ask (book a demo).
  - **Why:** this is what turns a cold dial into a booked demo; Abdul is doing the calling,
    so Abdul owns the script. Needed for the Friday gate.
- ☐ **Pricing** (with Miguel — see Decisions).

## Miguel

- ◐ **Privacy Policy.**
  - **What we're doing:** a public document stating how we collect/store/delete caller data
    (names, numbers, addresses, transcripts).
  - **Why:** legally required under Canadian privacy law (PIPEDA) because we handle real
    people's personal information.
- ◐ **Data Processing terms.**
  - **What we're doing:** the contract clause saying the locksmith owns their callers' data
    and we only process it on their behalf.
  - **Why:** clarifies legal responsibility for the data and is expected by privacy law.
- ◐ **Terms of Service.**
- ◐ **Customer contract (MSA)** with a **liability cap + SLA disclaimer**.
  - **What we're doing:** the agreement the customer signs, explicitly stating we do NOT
    guarantee zero missed calls and capping our liability.
  - **Why:** if our system hiccups and a locksmith misses a big emergency job, this is what
    protects us from being blamed for the lost revenue.
- ◐ **Billing wired to service state.**
  - **What we're doing:** Stripe subscription + the "sign-contract-then-pay" flow, plus the
    rule for what happens on a failed payment (suspend vs keep serving).
  - **Why:** this is how we actually collect money and stop serving non-payers.
- ☐ **SMS deliverability / A2P registration** *(provisional owner — confirm)*.
  - **What we're doing:** checking with Twilio whether our Messaging Service + number need
    A2P/10DLC registration, and registering if so.
  - **Why:** carriers silently filter/block *unregistered* automated business texts. Our
    whole product is "we text you the lead" — if texts don't deliver, the product is broken.
    Our number is a US number (`+1 651`), so US sending rules apply.
- ☐ **Pricing** (with Abdul — see Decisions).

## Jordan

- ☐ **One-page website** (Bengal/Dispango domain).
  - **What we're doing:** a single page — what it does, a demo number to call, "book a demo"
    button.
  - **Why:** a cold-called locksmith Googles us; no site = no trust = no deal.
- ☐ **Demo asset** — a dedicated demo number/persona, separate from M&J's real line.
  - **What we're doing:** a "show-off" number a prospect can call to hear the AI, that
    doesn't pollute a real customer's lead data.
  - **Why:** the live demo is the strongest part of the pitch; it needs its own sandbox.
- ☐ **Defined sales motion.**
  - **What we're doing:** writing the exact step-by-step from cold call → demo → pitch +
    price → contract → payment → onboard.
  - **Why:** we have the front (outreach) and back (onboarding); the middle (how a call
    becomes a paying customer) is undefined.
- ☐ **Calendar integration on the landing page.**
  - **What we're doing:** embed the Calendly booking widget into the landing page so a
    potential customer can schedule a meeting in one click.
  - **Why:** turns a website visitor into a booked demo with no back-and-forth.
  - Booking link to embed: https://calendly.com/miguel-dispango/30min
- ☐ **Step-by-step setup document + new-customer runbook.**
  - **What we're doing:** one clear document with the EXACT setup steps (below), used both
    as our internal checklist and as the customer's guide.
  - **Why:** setup must be repeatable by anyone, not just whoever built it. This is what we
    rehearse at the meeting.
  - Steps: (1) provision/assign a Vapi number → (2) create their `clients` row
    (`business_name`, `agent_name`, `dispatch_phone`, `inbound_number`, `timezone`) →
    (3) give them the **call-forwarding setup guide** (dial codes differ by phone type:
    cell vs landline vs VoIP) → (4) **go-live verification** (see below).
- ☐ **Kanban board to present at Friday's meeting.**
  - **What we're doing:** a visual board (columns like To-Do / In-Progress / Done) showing
    this whole plan and who owns what, ready to demo Friday.
  - **Why:** gives the team a shared, at-a-glance view of progress to run the meeting from.
- ☐ **Merge + deploy the onboarding tool** (with Miguel).
  - **What we're doing:** reviewing the `feat/admin-ui` (admin page) and
    `feat/billing-onboarding` (billing) branches, merging them into `main`, and deploying
    them so they actually run.
  - **Why:** that onboarding software is built but only exists as draft code on GitHub —
    pushing to GitHub does NOT make it live. Merging + deploying turns it into a usable tool.

---

## Automate the setup (target: near-hands-off onboarding)

Goal: *sign contract → pay → number auto-assigned → forwarding steps sent → test passes →
live*, with a human only watching. What's needed:

1. **Admin onboarding tool live** (merge + deploy, above) — a form that creates the
   customer's row instead of hand-editing the database.
2. **Auto-provision the phone number** via the Twilio/Vapi API (buy + assign a number from
   the form, no manual step).
3. **Auto-generate forwarding instructions** for the customer's specific carrier (we can't
   change their phone, but we can hand them the exact dial codes automatically).
4. **Automated go-live test** — a script that confirms the row is correct and the dispatch
   SMS fires, then flips the customer to "active."
5. **Stripe + e-signature** (Miguel's billing branch) so contract → payment → provisioning
   chains automatically.

Build owners: items 1–2, 4 sit with Jordan + Miguel (onboarding tool); item 5 with Miguel.

---

## What "Go-Live Verification" means (the test before switch-on)

Before we tell a new locksmith "you're live," we run **one test call that proves the whole
chain works for THAT customer**:

1. Call their number ourselves, posing as a customer.
2. Confirm the AI answers with **their** business name + agent name (not "M and J", not a
   literal `{{business_name}}`).
3. Confirm the **dispatch SMS actually lands on the locksmith's phone** with the lead.
4. Confirm the **callback number** in that text is correct.

**Why:** setup has several moving parts (number, the `clients` row, call forwarding on their
phone, the prompt variables) and any one can be silently wrong. Skip the test and the
customer's first sign of failure is a **real missed emergency lead**. Plain version: *don't
hand someone the keys without starting the car first.* Lives inside Jordan's runbook.

---

## Decisions needed (founders)

- **Price / offer** (Abdul + Miguel). The sales motion and the balance/cap plan both depend
  on it. If flat $199/mo, a high-volume customer could cost more than that in AI minutes →
  we need per-customer caps. If usage-based, we must meter usage anyway.
- **Per-customer balance approach** (Abdul + Miguel). One shared Vapi balance is a risk
  (empty it and every line dies). Two ways to fix:
  - *Option A:* a separate Vapi account per customer — true separate balances, but breaks
    the "one shared assistant" simplicity; heavy to operate.
  - *Option B (recommended):* one account + **per-customer usage metering + spend caps +
    auto-reload** — same protection (no customer drains the others, clear per-customer cost)
    without the overhead.

## Deferred (not needed for launch)

- **Customer-facing call log / dashboard.** Locksmiths get an SMS per lead, which is enough
  to launch; a dashboard is a retention nice-to-have for later.

---

## Are we ready to commercialize once this is done?

**Yes — ready to *start*, via cold calls, with two conditions:**
- **Start with a small pilot (1–3 customers), not a blast** — use the first few to shake out
  onboarding bugs and prove reliability before scaling outreach.
- **Monitoring + the Vapi balance safety net must be solid first** — we're handling other
  people's *emergency* calls; downtime = lost leads + trust/liability hit.

The tech (the hard part) is essentially done. The gap to revenue is the **legal wrapper +
SMS deliverability + a repeatable/automated onboarding + billing**. Land the assigned items
and we can confidently take our first paying locksmith. "Ready" = ready to begin and onboard
a controlled first batch — not "everything finished."

### Still worth a thought (not blockers)
- **Customer support / who responds** when a customer says "my calls stopped" (even an
  informal channel + response-time expectation).
- **Data deletion mechanism** — the privacy policy will promise we can delete a customer's
  data; the button/script to actually do it should exist.
- **Cancellation / refund handling** (part of billing).
