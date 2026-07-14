# Phase 1 kickoff — Reconcile & finish monitoring

Paste into a fresh Claude Code window. Sequential (do before Phase 2). Run after Phase 0 or in parallel
with Phase 0 only (both are safe together; not with backend phases).

---

Read `docs/LAUNCH-ROADMAP.md` (Phase 1) and `CLAUDE.md` first.

**Context:** Monitoring is already built on `feat/monitoring-alerting` (a `heartbeat-monitor` function,
admin `/health`, Twilio-SMS + Resend-email alerts, admin-ui panels, `docs/MONITORING.md`) but never
merged. It **collides** with the Sprint 1 ban feature now on `main`: the branch has its own
`isBannedCaller` + `20260627000000_banned_callers.sql`, while `main` has `isBanned` +
`20260714000000_banned_callers.sql`.

**Task:** Bring the monitoring onto `main` cleanly.

- Rebuild the monitoring pieces on a fresh branch off current `main`, **dropping the branch's ban
  duplication** — keep `main`'s `isBanned` + `20260714…` migration; do NOT reintroduce
  `isBannedCaller` or `20260627…`.
- Consolidate the duplicated unsent-leads/abuser queries shared by `heartbeat-monitor` and admin
  `/health` into one place.
- Add `[functions.heartbeat-monitor]` to `supabase/config.toml` and deploy the function.
- Stand up the external watchdog: document + set up one free uptime pinger hitting the webhook `GET`
  `{status:"ok"}` probe, plus an external cron POSTing the heartbeat every ~15 min.
- Confirm alerts actually reach `OPS_PHONE` (SMS) and the alert email.

**Invariants:** don't touch the call-path logic on `main`; fail open on DB errors; keep the webhook GET
probe unauthenticated.

**Verify:** deploy heartbeat, trigger each check (unsent lead, abuse burst) against test data and
confirm an alert fires; confirm the external probe reports "up". `/code-review`, fix must-fix,
re-review, then commit + merge to `main` + deploy per the autonomy rule.

**Branch:** `feat/monitoring-reconcile`.
