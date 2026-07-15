# Dispango — Manual "turn-on" checklist

_The running list of things **only you can do** (they need external accounts, keys, DNS, or a
decision) to fully switch on everything that's already built and deployed. Code-side work is done and
gated OFF safely — nothing here is broken while these sit undone; each item just unlocks a capability.
Grouped so you can knock them out in one sitting. Last updated: 2026-07-14._

Project ref for all `supabase secrets set …` commands: **`yqyvybukyfokyfsjzyso`**.

---

## ⭐ The single biggest unlock — set `VAPI_PRIVATE_KEY`

One key turns on **two** finished features at once:
- **Phase 2** — auto-buy + wire a phone number when a customer pays (today it falls back to emailing you to do it by hand).
- **Phase 5** — the admin console's "Check a shop" **routing test** and the **Repair routing** button (today they show "Can't check — key not set").

**Do:** grab your **Vapi Private Key** from the Vapi dashboard (Settings → API Keys), then:
```
supabase secrets set VAPI_PRIVATE_KEY=<the key> --project-ref yqyvybukyfokyfsjzyso
```
That's it — no redeploy needed. (`VAPI_SECRET`, `VAPI_ASSISTANT_ID`, and the Twilio keys are already set.)

> After setting it: open the admin console → **Check** a real shop → the Vapi rows should go green instead of "can't check". Watch the **first real paid onboarding** in the logs, since auto-provisioning has only been proven against Twilio test credentials.

---

## Admin console (Phase 5) — hosting ✅ DONE + optional polish

- ✅ **Hosted on Vercel:** **https://admin-ui-two-rho.vercel.app** (separate project `admin-ui`, holds no secrets — the operator token is typed in at runtime). Serves proper HTML (unlike Supabase, which garbles it to plain text).
- ☐ **Optional — put it on a subdomain** once your domain lands in Vercel: add e.g. `ops.dispango.com` to the `admin-ui` project (Vercel → Project → Domains).
- ☐ **Optional — extra lock:** enable **Vercel Authentication** on the `admin-ui` project (Settings → Deployment Protection) so only your Vercel team can even load the page, on top of the operator token.
- ☐ **Optional — auto-deploy:** connect the `admin-ui` project to the GitHub repo with **Root Directory = `admin-ui`** so future edits to `admin-ui/index.html` publish on push. Until then, re-publish manually after any change:
  ```
  cd admin-ui && vercel deploy --prod    # pick the existing "admin-ui" project when asked
  ```

---

## Spam protection (Phase 6) — set the Cloudflare Turnstile keys

CAPTCHA on the signup form is built and deployed but **off** (signups work fine without it; it just isn't
checking yet). Turn on **before** running paid ads, since each signup costs you a billable contract doc + emails.

1. ☐ Cloudflare dashboard → **Turnstile** → create a widget → copy the **Site key** + **Secret key**.
2. ☐ `supabase secrets set TURNSTILE_SECRET_KEY=<secret> --project-ref yqyvybukyfokyfsjzyso` (live immediately).
3. ☐ In **Vercel** (the `web` marketing-site project) → set env var `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>` → redeploy `web`.

---

## Monitoring (Phase 1) — two loose ends

- ☐ **Confirm the UptimeRobot "is it up?" monitor has an alert contact** (your email/phone) attached — otherwise a real outage won't page you. (The second monitor, the heartbeat runner, already texts `OPS_PHONE` itself, so it's fine.)
- ☐ **Email alerts are off** until the domain is set up — see the DNS section below.

---

## Domain + DNS flip (Phase 7) — do these together once GoDaddy → Vercel is done

- ☐ Point the domain at Vercel (you're mid-move from GoDaddy).
- ☐ Set `PUBLIC_SITE_URL` → `https://dispango.com` (or your final domain) wherever it's configured, and update the marketing-site `CONFIG` (phone, mailing address, legal name) in `web/app/page.jsx`.
- ☐ **Turn on email alerts** (needs the domain's sending records verified in Resend):
  ```
  supabase secrets set ALERT_EMAIL=<you@dispango.com> ALERT_FROM_EMAIL=<alerts@dispango.com> --project-ref yqyvybukyfokyfsjzyso
  ```
  (`RESEND_API_KEY` is already set. Until this, SMS to `OPS_PHONE` is the only alert channel.)
- ☐ Real **Cal.com / booking link** into the site `CONFIG`.
- ☐ Confirm **Stripe** is in **live** mode (not test) for real payments.
- ☐ Final **OG image** + domain metadata.

---

## Not built yet (no action — tracked for later phases)

- **Phase 3 demo line** — a live "call our AI" number on the site. Shipped in code; needs a provisioned demo number once `VAPI_PRIVATE_KEY` is set.
- **Phase 4 customer dashboard + login** — customers logging in to see their own leads/analytics, editable business hours, and the business-hours call-forwarding window. Greenfield; not started.
- **Vapi low-balance alert** — no working balance endpoint via the API key; relying on Vapi dashboard auto-reload for now.

---

### One-glance "when I have 30 minutes" order
1. Set `VAPI_PRIVATE_KEY` (unlocks the most). ⭐
2. Turnstile keys (before ads).
3. Check the UptimeRobot alert contact.
4. …then the whole DNS block together when the domain lands.
