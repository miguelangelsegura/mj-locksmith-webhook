# Pricing Model — Locksmith AI Receptionist

**Owners:** Abdul + Miguel · **Decision:** lock a price at Friday's meeting · **Status:** prep
for decision. All cost figures are estimates to validate; they're conservative (rounded up).

---

## 1. What it costs us to serve one locksmith / month

**Inputs (from research + our config):**
- **Our per-minute voice cost ≈ $0.16/min** all-in — Vapi hosting (~$0.05) + STT
  `gpt-4o-mini-transcribe` + LLM **Claude Haiku 4.5** + TTS + Twilio carriage. (Industry: a
  basic stack runs $0.14–0.15/min; premium ElevenLabs/Sonnet is $0.25–0.33. We're on the
  lean end.)
- **Avg call length ≈ 3 min** (lockout intake; hard cap 10 min ≈ $1.40/call).
- **Volume:** a mid-metro locksmith gets **~40 calls/week ≈ 173/month**. ~**two-thirds are
  after-hours** ≈ 115/month.
- **Twilio:** number ~$1.15/mo + dispatch SMS (~3 segments × $0.0079 ≈ $0.024/lead) → ~$3–5/mo.

**Cost per customer / month:**

| Usage scenario | Calls/mo | Voice cost (×$0.16×3min ≈ $0.50/call) | + Twilio | **Total cost** |
|---|---|---|---|---|
| AI answers **everything** (24/7) | ~173 | ~$87 | ~$5 | **~$92/mo** |
| AI = **after-hours / overflow** only | ~115 | ~$58 | ~$4 | **~$62/mo** |

> Takeaway: serving one shop costs us roughly **$60–$95/month** depending on whether the AI
> takes all calls or just after-hours. Outliers (very high volume) are the margin risk → see
> the fair-use cap.

---

## 2. Margin at candidate price points

| Price/mo | Margin (full 24/7, ~$92 cost) | Margin (after-hours, ~$62 cost) |
|---|---|---|
| **$99** | ~$7 (8%) ⚠️ too thin | ~$37 (37%) |
| **$149** | ~$57 (38%) | ~$87 (58%) |
| **$199** | ~$107 (54%) | ~$137 (69%) |
| **$249** | ~$157 (63%) | ~$187 (75%) |

> $99 flat is dangerous for a high-volume 24/7 shop (margin collapses). **$199 is the safe
> healthy flat price**; $149 works if positioned as after-hours/overflow only.

---

## 3. Competitor landscape (AI receptionists for trades)

| Provider | Entry price | Notes |
|---|---|---|
| Numa | $49/mo | "unlimited" |
| Goodcall | $59/mo | unlimited minutes, CRM integrations |
| Rosie / My AI Front Desk | $49–$65/mo | low minute caps (250 min) → overage |
| AgentZap | $109/mo | 150 min included |
| CallBird | $49 / $249 / $499 | 50 calls / unlimited / enterprise |
| Smith.ai | $$$ (per-call) | premium, human+AI |
| **voice.ai (our target competitor)** | **hidden** | enterprise-style, "350+ shops", no public price |

**Read:** a cluster of cheap tools at **$49–$65** (but with low caps + overage that push real
cost to ~$67+), a mid band at **$109–$299**, and premium/enterprise above. Hidden costs are
common: setup fees ($0–$500), per-call overage ($0.65–$11), bilingual/after-hours add-ons.

---

## 4. Recommendation (for the Friday decision)

**Launch at a simple flat $199/mo**, positioned in the mid band — above the race-to-bottom
tools (we're not the cheapest, we're the one that actually catches your after-hours money) and
well below premium. Reasons:
- Healthy ~54–69% margin even before per-customer caps.
- One job recovered usually pays for the month → easy ROI story in the pitch.
- Round, simple, easy to quote on a cold call.

**Levers to decide Friday:**
- **Flat vs tiered.** Simplest: flat $199. Alternative: **$149 "After-Hours"** (overflow only)
  / **$249 "Always-On"** (full 24/7 + priority) — captures both the cautious and the all-in.
- **Trial / guarantee** to kill friction: a 7–14 day free trial or a "first month, cancel if
  it doesn't catch you a lead" guarantee. Strong on cold calls.
- **No setup fee** as a differentiator (many competitors charge $0–$500).
- **Fair-use cap** (ties to balance decision D2): cap ~250–300 calls/mo per customer; beyond
  that, overage or bump tier — protects margin from outliers and prevents one customer
  draining the shared Vapi balance.
- **Annual option** (e.g. 2 months free) for cash flow + lock-in, once billing is live.

**Suggested starting offer to test on calls:**
> **$199/month, no setup fee, keep your own number, cancel anytime — free for the first 14 days
> so you can see the leads it catches before you pay.**

---

## Sources
- AI-receptionist pricing: [AgentZap pricing guide](https://agentzap.ai/blog/ai-receptionist-pricing-complete-cost-guide-2025), [NextPhone](https://www.getnextphone.com/blog/ai-receptionist-pricing-guide), [CallBird](https://www.callbirdai.com/blog-best-ai-receptionist-contractors)
- Vapi per-minute cost: [CloudTalk — Vapi pricing](https://www.cloudtalk.io/blog/vapi-ai-pricing/), [Vapi pricing](https://vapi.ai/pricing)
- Locksmith call volume + after-hours share: [AgentZap — Locksmith Phone Statistics](https://agentzap.ai/blog/locksmith-phone-statistics)
