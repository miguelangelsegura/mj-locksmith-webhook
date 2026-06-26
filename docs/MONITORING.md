# Monitoring, Alerting & Caller Bans

Reliability layer for the live system. **Lean hybrid:** a free external uptime monitor for
"is it down," plus a scheduled `heartbeat-monitor` Edge Function for deeper checks, plus a
caller-ban blocklist. Alerts go to `OPS_PHONE` (SMS) and optionally email (Resend).

---

## 1. Uptime monitor (catches "Function down") — no code

Point a free monitor (UptimeRobot / Cronitor) at the webhook **GET** health URL:

```
https://<project-ref>.supabase.co/functions/v1/vapi-webhook
```

It returns `{"status":"ok"}` (HTTP 200) **without auth**, so it's a clean probe. Configure:
- Type: HTTPS, interval 5 min, alert if not 200 / keyword `ok` missing.
- Notify Abdul by email/SMS.

---

## 2. Heartbeat monitor (deeper checks) — `heartbeat-monitor` function

Runs our own checks against the DB and alerts on trouble:
- **Unsent dispatch** — leads that ended >2 min ago in the last hour but never got their SMS
  (Twilio/dispatch failing).
- **Abuse burst** — one `caller_phone` with ≥ `ABUSE_BURST_THRESHOLD` (default 6) calls in the
  last hour → suggests banning.
- **Vapi balance** — *disabled by default* (Vapi exposes no balance endpoint via the private
  key; all of `/account`,`/credits`,`/org` 404/401). Real safety net = **Vapi dashboard
  auto-reload** (set a conservative top-up there). If a working endpoint is found later, set
  `VAPI_BALANCE_URL` + `VAPI_BALANCE_MIN` to enable.

**Scheduling (lean):** an external cron POSTs the function every ~15 min. Use a free service
([cron-job.org](https://cron-job.org) or a GitHub Actions scheduled workflow):

```
POST https://<project-ref>.supabase.co/functions/v1/heartbeat-monitor?token=<VAPI_SECRET>
```

(We use the existing `VAPI_SECRET` as the gate — no new secret. Avoids pg_cron + a token in
the DB.)

---

## 3. Caller bans (blocklist)

A `banned_callers` table; `handleAssistantRequest` rejects a banned number **before** spinning
up the assistant, so a banned caller costs **zero AI minutes**. Manage via the admin API
(token `x-admin-token`):

```
GET    /functions/v1/admin/banned                 # list
POST   /functions/v1/admin/banned                 # body: {"caller_phone":"+1...","reason":"..."}
DELETE /functions/v1/admin/banned/<phone>         # unban
```

Jordan's admin dashboard (`feat/admin-ui`) should add a **Ban / Unban button** that calls
these — backend is done here.

---

## 4. Deploy steps

```bash
# 1. schema (adds banned_callers)
supabase db push --linked

# 2. deploy the functions (webhook ban check, admin endpoints, new heartbeat)
supabase functions deploy vapi-webhook
supabase functions deploy admin
supabase functions deploy heartbeat-monitor

# 3. (optional) email alert channel — needs a Resend account + verified sender domain
supabase secrets set RESEND_API_KEY=… ALERT_EMAIL=you@dispango.com ALERT_FROM_EMAIL=alerts@dispango.com
```

Then: set up the uptime monitor (§1), the external cron (§2), and Vapi dashboard auto-reload.

> Email (Resend) needs the sending domain verified in Resend first — do this once the
> Dispango/Bengal domain is set up. Until then, alerts still go out via SMS to `OPS_PHONE`.

---

## 5. Verify

- **Uptime:** pause the Function (or point the monitor at a bad path) → alert fires; restore → recovery.
- **Heartbeat:** `curl -X POST "https://<ref>.supabase.co/functions/v1/heartbeat-monitor?token=$VAPI_SECRET"`
  → returns a JSON summary. Force a branch: insert a `calls` row with `notified_at = NULL` and
  `ended_at` ~5 min ago and a lead `outcome` → next run reports it + texts `OPS_PHONE`.
- **Ban:** `POST /admin/banned` a test number, then POST an `assistant-request` for it to the
  webhook → confirm it's rejected (`{"error":"This number has been blocked."}`) before any
  assistant spin-up; `DELETE /admin/banned/<phone>` → works again.
