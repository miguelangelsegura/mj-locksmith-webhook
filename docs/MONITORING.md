# Monitoring, Alerting & Caller Bans

Reliability layer for the live system. **Lean hybrid:** a free external uptime monitor for
"is it down," plus a scheduled `heartbeat-monitor` Edge Function for deeper checks, plus a
caller-ban blocklist. Alerts go to `OPS_PHONE` (SMS) and optionally email (Resend).

The two DB health signals (unsent leads, abuse burst) are computed in one place —
[`supabase/functions/_shared/monitoring.ts`](../supabase/functions/_shared/monitoring.ts) —
and used **both** by the on-demand admin `/health` card and the scheduled heartbeat, so the
two never drift.

**Live public status page (share with the team):** https://stats.uptimerobot.com/hML4iaFnfz

---

## Why an EXTERNAL watchdog (not a self-built one)

The whole value of this layer is **independence**: it must catch the case where our own
Supabase stack is down. A monitor we host on Supabase would die with the thing it's watching
and stay silent — useless exactly when it's needed. So the "is it up?" pinger and the cron that
runs the heartbeat both live on a free third-party (UptimeRobot). The `heartbeat-monitor`
function IS our own deeper monitor; UptimeRobot is the outside pair of eyes that pokes it.

**Leanest setup: one free [UptimeRobot](https://uptimerobot.com) account, two monitors, no code.**

## 1. Uptime monitor (catches "Function down")

Monitor A — point a free HTTP(s) monitor at the webhook **GET** health URL:

```
https://yqyvybukyfokyfsjzyso.supabase.co/functions/v1/vapi-webhook
```

It returns `{"status":"ok"}` (HTTP 200) **without auth**, so it's a clean probe (keep it
unauthenticated — it's the external watchdog's only door in). Configure:
- Type: HTTPS, interval 5 min, alert if not 200 / keyword `ok` missing.
- Notify Abdul by email/SMS.

(Project ref for this system: `yqyvybukyfokyfsjzyso`.)

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

Both DB checks **fail open**: a query error is treated as "nothing wrong" rather than throwing,
so a monitoring hiccup never masquerades as an outage.

**Auth:** the function checks `HEARTBEAT_TOKEN` (falls back to `VAPI_SECRET` if unset),
presented as `?token=` or the `x-vapi-secret` header. A dedicated `HEARTBEAT_TOKEN` is already
set as a secret, so the external cron URL carries that token — **not** the webhook's
`VAPI_SECRET`.

**Scheduling (lean):** Monitor B — a second UptimeRobot monitor that hits the heartbeat URL on
a schedule IS the "external cron" (the function runs its checks on any HTTP method, so a plain
GET monitor triggers it — no separate cron service needed):

```
https://yqyvybukyfokyfsjzyso.supabase.co/functions/v1/heartbeat-monitor?token=<HEARTBEAT_TOKEN>
```

- Type: HTTPS, interval 15 min (or 5 min — the checks are cheap), keyword `"ok":true` optional.
- The token goes in the URL query string. It is a **secret** — do NOT commit it; paste it from
  wherever it was handed to you when creating the monitor.

Prefer a true POST cron instead? [cron-job.org](https://cron-job.org) or a GitHub Actions
scheduled workflow POSTing the same URL works identically. One UptimeRobot account doing both
monitors is the leanest (avoids pg_cron + a token in the DB, and one fewer service to manage).

---

## 3. Caller bans (blocklist) — already live

A `banned_callers` table (migration `20260714000000_banned_callers.sql`);
`handleAssistantRequest` rejects a banned number **before** spinning up the assistant, so a
banned caller costs **zero AI minutes**. The admin-ui has a Ban / Unban panel wired to the
admin API (token `x-admin-token`):

```
GET    /functions/v1/admin/banned                 # list
POST   /functions/v1/admin/banned                 # body: {"caller_phone":"+1...","reason":"..."}
DELETE /functions/v1/admin/banned/<phone>         # unban
```

---

## 4. Deploy steps

Bans + the admin `/health` and `/banned` endpoints are already on `main`. This reconcile adds
the scheduled heartbeat and folds the health queries into the shared module:

```bash
# deploy the functions (admin now imports the shared monitoring module; new heartbeat)
supabase functions deploy admin
supabase functions deploy heartbeat-monitor

# (optional) email alert channel — needs a Resend account + verified sender domain
supabase secrets set RESEND_API_KEY=… ALERT_EMAIL=you@dispango.com ALERT_FROM_EMAIL=alerts@dispango.com
```

Then: set up the two UptimeRobot monitors (§1, §2) and Vapi dashboard auto-reload.

**Alert channels (current status):**
- **SMS → `OPS_PHONE`: LIVE and verified** — a forced unsent-lead + abuse-burst run fired a real
  alert text that landed on the ops phone. This is the reliable channel.
- **Email → Resend: deliberately DEFERRED** (SMS-only for now). `ALERT_EMAIL` is unset, so
  `sendEmail` no-ops. Resend also needs the sending domain verified first — enable both once the
  Dispango domain DNS is set up (Phase 7): `supabase secrets set ALERT_EMAIL=you@dispango.com
  ALERT_FROM_EMAIL=alerts@dispango.com` (RESEND_API_KEY is already set).

---

## 5. Verify

- **Uptime:** pause the Function (or point the monitor at a bad path) → alert fires; restore → recovery.
- **Heartbeat:** `curl -X POST "https://<ref>.supabase.co/functions/v1/heartbeat-monitor?token=$HEARTBEAT_TOKEN"`
  → returns a JSON summary. Force a branch: insert a `calls` row with `notified_at = NULL` and
  `ended_at` ~5 min ago and a lead `outcome` → next run reports it + texts `OPS_PHONE`. (Done on
  reconcile: 1 unsent + 6-call abuser inserted → `ok:false` with both problems + SMS to ops, then
  test rows deleted.)
- **Ban:** `POST /admin/banned` a test number, then POST an `assistant-request` for it to the
  webhook → confirm it's rejected (`{"error":"Sorry, we can't take your call."}`) before any
  assistant spin-up; `DELETE /admin/banned/<phone>` → works again.
