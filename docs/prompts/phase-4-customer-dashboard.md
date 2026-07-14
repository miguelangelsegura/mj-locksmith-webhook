# Phase 4 kickoff — Customer login + dashboard

Paste into a fresh Claude Code window. Sequential (before Phase 5). Security-sensitive (auth + RLS).

---

Read `docs/LAUNCH-ROADMAP.md` (Phase 4), `docs/ADMIN-DASHBOARD-SPEC.md` §C/§D/§G, and `CLAUDE.md` first.

**Task:** Give each customer an email/password login and a premium dashboard where they see **only
their own** data.

1. **Design-research FIRST** (in this session, fresh context): pull Calio's public dashboard preview +
   2–3 best-in-class SaaS dashboards; agree a visual direction (layout, motion, information density)
   before writing UI. Target: looks like it took 10,000 hours — clean details, smooth unique
   animations, efficient at surfacing info.
2. **Auth:** Supabase Auth **email + password** (+ a password-reset flow). Link each auth user to their
   `clients` row via a new `clients.auth_uid`.
3. **RLS:** enable Row-Level Security on `clients` + `calls` with **default-deny** policies so a
   signed-in customer reads only rows where the client matches their own. **Verify the
   webhook/billing/admin service-role paths still work** (service role bypasses RLS). Do not expose the
   service-role key to the browser — the browser uses the anon key under RLS.
4. **Dashboard** (new authed routes, e.g. `web/app/dashboard/**` + `web/app/login/**`):
   - Leads list + call detail: captured fields, summary, transcript (recording link only if enabled).
   - Analytics/ROI: calls answered, leads captured, after-hours catches, estimated $ saved vs a human.
   - **Editable settings** (approved): business hours + timezone; lead-delivery cell number (with
     validation + a test-text confirm); business info (service area, services offered, pricing notes).
     Writes go through a safe authed API — NOT direct service-role writes from the browser.
5. Wire the site's "Sign In" (`CONFIG.portal`) to this dashboard.

**Files:** `web/app/dashboard/**`, `web/app/login/**`, a Supabase browser client, an authed read/write
API (Edge Function or route), a migration enabling RLS + policies + `clients.auth_uid`.

**Verify:** two test customers each see ONLY their own leads/analytics; a logged-out user sees nothing;
the webhook + billing + admin still function (service role). Then **`/deep-review`** (auth +
credentials + RLS), fix must-fix, re-review, commit + merge + deploy per the autonomy rule.

**Branch:** `feat/customer-dashboard`.
