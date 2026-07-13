# Pre-Friday (June 26th) Launch — Plain-English Summary

A simple walkthrough of everything we've built and prepared heading into the **June 26th**
goal: being ready to **start cold-calling locksmiths**. Written for everyone on the team — no
technical background needed.

---

## What the product is (in one breath)

A locksmith's phone rings at 2am, they're asleep or on a job, and the customer just calls the
next locksmith on Google. **We fix that.** Our service is an AI receptionist that answers the
locksmith's calls 24/7 in their own business name, finds out the lockout details and a callback
number, and instantly **texts the job to the locksmith** so they call back a warm lead. The
locksmith keeps their own phone number — nothing changes for their customers.

One shared "brain" serves every locksmith; each shop just has its own name, agent name, and
number plugged in. That's what lets us add new customers without rebuilding anything.

---

## What we prepared this round

### Sales (ready for Friday)
- **Cold-call pitch** — a ready-to-use phone script built from respected sales books, with an
  opener, the key value (two-thirds of locksmith calls come after hours = lost jobs), answers
  to the common pushbacks, and the ask (book a demo).
- **Pricing model** — the math on what each customer costs us (~$60–$95/month) vs. what
  competitors charge ($49–$499), landing on a recommended **$199/month, no setup fee, 14-day
  free trial**. The final number gets locked at Friday's meeting.

### Legal / business
- **Incorporation guide** — a first-timer, step-by-step on incorporating (a **parent AI
  company**, with the locksmith product as a brand under it), opening a bank account, and
  registering for tax — with the cost and how long each step takes. It also answers: yes, once
  incorporated we can start selling in the company name even before the bank account opens.

### Onboarding
- **Standard onboarding process** — the exact, repeatable steps to set up a new locksmith
  (give them a number, plug in their details, set up call forwarding, run a test call), plus
  ideas to automate it later so onboarding becomes nearly hands-off.

### Reliability — the safety net (this is the new technical work, and it's LIVE)
- **Caller ban list** — we can now block abusive/spam numbers. A banned caller is turned away
  **before** the AI even picks up, so they cost us nothing. *Built, deployed, and tested.*
- **Heartbeat monitor** — an automatic check that runs every few minutes and watches for two
  problems: (1) a lead that came in but never got texted to the locksmith (a delivery failure),
  and (2) one number hammering the line (abuse). If it spots either, it **texts/emails us**.
  *Built, deployed, and tested.*
- **UptimeRobot monitoring** — outside watchdogs (explained next).
- **Balance safety** — the AI runs on prepaid credit; we rely on the provider's auto-reload so
  the line can never silently go dead.

### Strategy
- **Go-to-market plan** split across Abdul, Miguel, and Jordan, and a **post-Friday list** of
  features to add to out-compete the main competitor (a customer dashboard, appointment
  booking, live call-transfer, etc.).

---

## The two UptimeRobot monitors (what they're for)

Think of these as two guards watching the system around the clock, so we hear about a problem
before a customer does.

- **Monitor A — the outside watchman.** Every 5 minutes it knocks on the front door of our
  system. If the system doesn't answer (it's down), UptimeRobot instantly alerts us. This is
  our "the whole thing is offline" alarm.
- **Monitor B — the inspector's timer.** Every 5 minutes it pokes our **heartbeat** check,
  which then looks at our own data for trouble (a lead that didn't get texted, or someone
  abusing the line) and texts us if something's wrong. UptimeRobot is basically acting as a
  free alarm clock that keeps the inspector doing its rounds.

**Live status page (share with the team):** https://stats.uptimerobot.com/hML4iaFnfz — anyone
can open this to see, at a glance, whether the system is healthy right now.

---

## Where we stand for Friday

**Ready:** the product works and is live, the reliability/monitoring is built and running, and
the sales pitch + pricing are prepared. The demo line works.

**To finish at/around Friday's meeting:**
- **Lock the price** (Abdul + Miguel) — the one hard blocker to start dialing.
- Quick review of the cold-call pitch.
- Kick off incorporation (it has the longest lead time).

The bigger items (full legal paperwork, billing, the competitor-parity features) finish during
the sales pipeline — i.e., before our *first signed customer*, not before our first call. Plan:
start with a small pilot of a few customers so the first "yes" gets great service.

---

## Where everything lives (for reference)
- Plan + roles: `docs/GO-TO-MARKET.md`
- Sales: `sales/cold-call-pitch.md`, `sales/pricing-model.md`
- Legal: `docs/INCORPORATION-GUIDE.md`
- Onboarding: `docs/ONBOARDING-PROCESS.md`
- Reliability/monitoring (how-to + deploy): `docs/MONITORING.md`
- This summary: `docs/PRE-FRIDAY-JUNE-26-LAUNCH.md`
