# Phase 6 kickoff — Spam / abuse polish

Paste into a fresh Claude Code window. Mostly independent; do before driving paid ad traffic.

---

Read `docs/LAUNCH-ROADMAP.md` (Phase 6) and `CLAUDE.md` first.

**Task:** Protect the paid public surfaces.

- Add **Cloudflare Turnstile** (free CAPTCHA) to the `web/app/get-started` form (a `cf-turnstile`
  widget + token field). Verify the token **server-side** at the **top of `handleSignup`** in
  `supabase/functions/billing/index.ts` — after the honeypot check, before any DB work — by calling
  Cloudflare's `siteverify`. Reject on missing/invalid token.
  - Why: today the email-dedupe is the only strong control; the per-IP limit is spoofable, and each
    signup triggers a billable SignWell doc + emails.
- Confirm the shipped abuse rails (bans + hourly/daily per-caller cap) and the demo-number caps are all
  active.
- New secrets: `TURNSTILE_SECRET_KEY` (server), the site key in `web/` env.

**Files:** `web/app/get-started/page.jsx`, `supabase/functions/billing/index.ts`.

**Verify:** a signup with a missing/invalid Turnstile token is rejected before any SignWell/DB action;
a valid token passes through the existing guards. `/code-review` (public endpoint), fix must-fix,
re-review, commit + merge + deploy per the autonomy rule.

**Branch:** `feat/turnstile`.
