# Standard Customer Onboarding Process

**For:** every new locksmith customer · **Owner of the runbook:** Jordan (this is a starting
draft to build on) · **Goal:** the same repeatable flow every time — sign → set up → verified
live — so onboarding is fast, consistent, and eventually near-automated.

The golden rule: **never tell a customer "you're live" until the go-live test passes** (Step 6).
Setup has several silent failure points; a missed emergency lead on day one is the worst way
to find one.

---

## The process (today — mostly manual)

### Step 0 — Sign + pay (precedes setup)
- Contract signed (company name) + payment/trial started (Stripe). Don't provision before this.
- Capture from the customer: **business name**, the **agent name** they want callers to hear,
  their **dispatch cell** (where lead texts go), their **existing business number**, **service
  area / hours**, and **timezone**.

### Step 1 — Provision a phone number
- Get/assign a dedicated **Vapi number** for this customer (the number their calls forward to).
- This number is the routing key — it maps the call to this customer in the system.

### Step 2 — Create the customer record
- Add a `clients` row with: `business_name`, `agent_name`, `dispatch_phone`, `inbound_number`
  (the Vapi number from Step 1), `timezone`, `answer_mode`, `business_hours`. `active = true`.

### Step 3 — Point their calls at us (call forwarding)
- The customer keeps their own number; they set **call forwarding** to the Vapi number.
- Give them the exact **dial codes for their phone type** (cell vs landline vs VoIP) — these
  differ by carrier. Conditional forwarding (no-answer/busy → us) is the usual "after-hours /
  overflow" setup; forward-all is "AI answers everything."

### Step 4 — Confirm the agent identity
- Verify the shared assistant greets in **their** business + agent name (driven by the
  `clients` row via template variables) — not a default and not literal `{{business_name}}`.

### Step 5 — Brief the customer
- One-pager: how leads arrive (a text per call), what the AI captures, how to turn forwarding
  on/off, and who to contact for help.

### Step 6 — Go-live verification (the gate)
Call their forwarded number posing as a customer and confirm **all four**:
1. The AI answers with **their** business + agent name.
2. The **dispatch SMS actually lands** on their phone with the lead details.
3. The **callback number** in the text is correct.
4. No literal `{{...}}` leaks into the greeting.
Only after all four pass → mark **live** and tell the customer.

### Step 7 — Handoff
- Confirm billing is active, log the customer as onboarded, set a check-in for ~1 week to
  review the first leads (and gather a testimonial if it's going well).

---

## Automation ideas (future sprint)

Today Steps 1–6 are hand-done. The target is **sign → pay → auto-provision → forwarding steps
sent → auto-verify → live**, with a human only watching. Building blocks, roughly in order of
value:

1. **Self-serve intake form** (admin UI) — captures the Step 0 fields and creates the `clients`
   row automatically (no hand-editing the DB). *The `feat/admin-ui` + admin API branches are
   the foundation; merge + deploy them first.*
2. **API number provisioning** — buy/assign the Vapi/Twilio number from the form via API, so
   Step 1 is automatic.
3. **Auto-generated forwarding instructions** — detect the customer's carrier and output the
   exact dial codes (we can't change their phone, but we can hand them the precise steps; email
   them automatically).
4. **Automated go-live test** — a script that checks the `clients` row is complete and fires a
   synthetic dispatch SMS, then flips `active = true` and notifies us. (A real audio test call
   still adds value, but most of Step 6 can be automated.)
5. **Stripe + e-signature chaining** — contract signed → payment captured → provisioning
   kicked off automatically (Step 0 → Step 1 with no manual handoff).
6. **Onboarding status tracker** — a simple per-customer status (signed → provisioned →
   forwarding-set → verified → live) so nothing stalls silently, surfaced in the admin/Jordan
   dashboard.
7. **Customer self-service forwarding wizard** — a guided page that walks them through turning
   on call forwarding for their specific carrier, with a "test it now" button.

**Sequencing suggestion:** ship #1 + #2 first (they remove the most manual work and unlock a
clean intake → provision flow), then #4 (the verification gate), then #5/#6 to make it
genuinely hands-off. #3 and #7 are polish that cut support load as volume grows.

---

## Related docs
- Roles + Friday gate: [GO-TO-MARKET.md](GO-TO-MARKET.md)
- System architecture: [SYSTEM-OVERVIEW.md](SYSTEM-OVERVIEW.md)
- Admin dashboard spec (ops/health + onboarding UI): [ADMIN-DASHBOARD-SPEC.md](ADMIN-DASHBOARD-SPEC.md)
