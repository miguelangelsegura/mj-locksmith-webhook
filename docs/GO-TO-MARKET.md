# Go-To-Market Plan — Commercializing the Locksmith Voice Agent

Plain-language plan to take the working product (multi-tenant call → SMS dispatch,
shared Vapi assistant, outreach engine) and turn it into a business we can sell —
starting with **cold calls**. Work is split across Abdul, Miguel, and Jordan.

Status legend: ☐ not started · ◐ in progress · ☑ done.

---

## Abdul

- ☐ **Incorporate the company.** Create a legal company (corporation) so the business,
  not us personally, carries the risk. We're in Ontario → federal incorporation (~$200,
  protects the name Canada-wide) is the cleaner choice. *Why: once we take money and
  handle people's call data, this shields our personal assets if something goes wrong.*
- ☐ **GST/HST registration + business bank account.** Register for HST (required over
  $30k/yr revenue; fine to do early) and open a separate business bank account.
  *Why: required to invoice properly and to keep the "company vs personal" wall real.*
- ☐ **Uptime monitoring + alerting.** A watcher that tells us fast if the webhook stops
  working — plus a **Vapi low-balance alert + auto-reload**. *Why: Vapi is prepaid off
  ONE shared balance; if it hits $0, every customer's AI line goes dead at once. We can't
  find out from an angry customer.*

## Miguel

- ◐ **Privacy Policy** — how we collect/store/delete caller data (names, numbers,
  addresses, transcripts). Required under Canadian privacy law (PIPEDA).
- ◐ **Data Processing terms** — the clause saying the locksmith owns their callers' data
  and we only process it on their behalf.
- ◐ **Terms of Service.**
- ◐ **Customer contract (MSA).** Must include a **liability cap + SLA disclaimer** — we do
  NOT guarantee zero missed calls. *Why: if our system hiccups and a locksmith misses a
  big emergency job, this is what protects us.*
- ◐ **Billing wired to service state.** Stripe subscription (price TBD — see Decisions),
  the "sign-contract-then-pay" flow, and what happens on a failed payment (suspend vs keep
  serving). *Why: this is how we actually get paid and stop serving non-payers.*

## Jordan

- ☐ **One-page website** on the Bengal/Dispango domain: what it does, a demo number to
  call, and a "book a demo" button. *Why: a cold-called locksmith Googles us; no site = no
  trust = no deal.*
- ☐ **Demo asset** — a dedicated demo number/persona (NOT M&J's real line, so demo calls
  don't pollute a real customer's lead data).
- ☐ **Defined sales motion** — the step-by-step from cold call → demo → pitch + price →
  contract → payment → onboard. The front (outreach) and back (onboarding) exist; this is
  the missing middle.
- ☐ **Calendar integration** — embed the booking link into the site/sales flow.
  - Abdul's Calendly link: `<PENDING — Abdul to provide>`
  - Miguel's existing link (for reference): https://calendly.com/miguel-dispango/30min
- ☐ **New-customer onboarding runbook** — the repeatable checklist to set up a locksmith:
  1. Provision/assign a Vapi number for them.
  2. Create their `clients` row (`business_name`, `agent_name`, `dispatch_phone`,
     `inbound_number`, `timezone`).
  3. Send them the **call-forwarding setup guide** (the dial codes differ by phone type —
     cell vs landline vs VoIP).
  4. **Go-live verification** (see below) before declaring them live.

---

## What "Go-Live Verification" means (the test before switch-on)

Before we tell a new locksmith "you're live, your AI is answering," we run **one test call
that proves the whole chain works for THAT customer**:

1. Call their forwarded/Vapi number ourselves, posing as a customer.
2. Confirm the AI answers with **their** business name + agent name (not "M and J", and not
   a literal `{{business_name}}`).
3. Confirm the **dispatch SMS actually lands on the locksmith's phone** with the lead
   details.
4. Confirm the **callback number** in that text is correct.

**Why it matters:** setup has several moving parts (number, the `clients` row, call
forwarding on their phone, the prompt variables) and any one can be silently wrong. If we
skip the test, the customer's first sign of failure is a **real missed emergency lead** —
the worst possible moment. In plain terms: *don't hand someone the keys without starting
the car first.* This is a ~2-minute gate; it lives inside Jordan's runbook.

---

## Unassigned — needs an owner

- **SMS deliverability check (A2P / 10DLC).** The specific *10DLC registration system* is a
  US carrier thing — but our Twilio number is actually a **US number** (`+1 651…` =
  Minnesota), so US sending rules apply to us, and carriers filter unregistered "business"
  texts. Action: confirm with Twilio whether our Messaging Service needs A2P/10DLC
  registration for our number + destinations, and register if so. *Risk if ignored:
  dispatch texts get silently filtered as we add customers.* **Recommend: Abdul (ops) or
  Miguel (owns Twilio/billing).**
- **Merge + deploy the onboarding tooling.** The admin onboarding API is on `main`; the
  **admin UI** (`feat/admin-ui`) and **billing onboarding** (`feat/billing-onboarding`)
  branches are unmerged. Someone owns getting these reviewed, merged, and deployed.
  **Recommend: Jordan (admin UI) + Miguel (billing).**

## Decisions needed (founders)

- **Price / offer.** What we charge (e.g. $199/mo?). The sales motion can't be built
  without it. — Abdul + Miguel.

## Deferred (not needed for launch)

- **Customer-facing call log / dashboard.** Locksmiths get an SMS per lead, which is enough
  to launch; a dashboard is a retention nice-to-have for later.

---

## Are we ready to commercialize once this is done?

**Yes — to *start*, via cold calls, with discipline.** Completing the above clears the real
blockers: legal entity + contracts (insulation), SMS deliverability, a repeatable
onboarding + go-live check, billing, monitoring, and a credible website/demo. With those
done we can legally and operationally take a paying customer.

Two conditions on "ready":
- **Start with a small pilot (1–3 customers), not a blast.** Use the first few to shake out
  onboarding bugs and prove reliability before scaling outreach.
- **Monitoring + Vapi balance safety must be solid first** — we're handling other people's
  *emergency* calls; downtime is lost leads and a trust/liability hit.

"Ready" = ready to begin selling and onboard a controlled first batch — not "finished."
