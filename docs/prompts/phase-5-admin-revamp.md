# Phase 5 kickoff — Admin back-office revamp

Paste into a fresh Claude Code window. Sequential (after Phase 1 monitoring exists; best after Phase 2
so provisioning tools have something to act on).

---

Read `docs/LAUNCH-ROADMAP.md` (Phase 5), `docs/ADMIN-DASHBOARD-SPEC.md` §F, and `CLAUDE.md` first.

**Task:** Rebuild the operator back office (`admin-ui/index.html` + `supabase/functions/admin/`) to be
intuitive in **plain language** for a non-technical operator, with troubleshooting tools and the
monitoring dashboard baked in.

- **Redesign** the admin UI to match the product's polish; plain-English labels + inline "what this
  means" help on every panel.
- **Monitoring dashboard** (reuse Phase 1 health plumbing): leads flowing?, failed-SMS list, abuse
  callers, per-client "is this shop's calls working?", low-balance note, last-heartbeat time.
- **Troubleshooting / problem-resolution tools:**
  - A synthetic **"place a test call"** end-to-end check (the unbuilt spec §F item that would have
    caught the two past server-URL regressions).
  - **"Re-run provisioning"** for a stuck client (reuses Phase 2's routine).
  - **"Resend a failed lead SMS"** action.
  - Per-client health drill-down with clear, guided fixes ("this shop's number has no server URL — click
    to repair").
- Keep it **token-authed** (`x-admin-token`) — a separate trust boundary from customer auth (Phase 4).

**Files:** `admin-ui/index.html`, `supabase/functions/admin/index.ts` (new troubleshooting endpoints).

**Verify:** each tool works against a test client (test call runs, provisioning re-run is idempotent,
failed-SMS resend sends once); monitoring panel reflects real health; screenshots of the new UI. Then
`/code-review`, fix must-fix, re-review, commit + merge + deploy per the autonomy rule.

**Branch:** `feat/admin-revamp`.
