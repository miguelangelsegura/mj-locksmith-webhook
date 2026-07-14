# Phase 3 kickoff — Live "call our AI" demo number

Paste into a fresh Claude Code window. Small. Depends on Phase 2 (provisioning) + the shipped Sprint 1
rate limit.

---

Read `docs/LAUNCH-ROADMAP.md` (Phase 3) and `CLAUDE.md` first.

**Task:** Put a real, callable demo number on the site.

- Provision one dedicated **demo number** (via Phase 2's routine, or manually) pointed at the shared
  assistant with **demo `variableValues`** (e.g. business_name "Dispango Demo").
- Apply tight caps on the demo path: short `maxDurationSeconds`, the existing per-caller rate limit,
  and **skip lead-SMS dispatch** for the demo number so demo calls aren't mistaken for real leads.
- Set `CONFIG.demoLine` in `web/app/page.jsx` to the number (clickable `tel:`) and redeploy the site.

**Invariants:** do NOT ship without the Sprint 1 rate limit active (a public number with no cap is an
open door to draining the balance). Keep the demo assistant clearly labelled.

**Verify:** call the number → AI answers as the demo persona; confirm caps trigger; confirm no lead SMS
is sent for demo calls. `/code-review`, fix must-fix, re-review, commit + merge + deploy per the
autonomy rule.

**Branch:** `feat/demo-line`.
