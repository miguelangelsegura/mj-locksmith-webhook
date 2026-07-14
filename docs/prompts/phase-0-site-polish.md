# Phase 0 kickoff — Website perfection

Paste into a fresh Claude Code window. Parallel-safe (frontend only).

---

Read `docs/LAUNCH-ROADMAP.md` (Phase 0) and `CLAUDE.md` first.

**Task:** Polish the `web/` marketing site to a premium, Calio-level feel and kill every ready
placeholder.

- Design polish: typography/spacing/motion consistency, tasteful hover + scroll micro-animations,
  dark/light parity, mobile 390px audit (no overflow), a real OG image. Make it feel hand-crafted, not
  templated.
- Fill every ready `CONFIG` placeholder in `web/app/page.jsx` (phone, address, legal name, email).
  Leave `portal` (→ customer dashboard, Phase 4) and `demoLine` (→ Phase 3) as clearly tracked TODOs.
- Final read-through of `terms`/`privacy` pages.

**Do not touch** the backend, Supabase functions, or the `clients`/`calls` schema — frontend only.

**Files:** `web/app/page.jsx`, `web/app/globals.css`, `web/app/layout.jsx`, `web/app/components/*`,
`web/app/terms/page.jsx`, `web/app/privacy/page.jsx`.

**Verify:** clean `next build`, mobile 390px no-overflow, 0 console errors; take before/after
screenshots and confirm the polish landed. Then `/code-review`. Fix must-fix findings, re-review the
fixes, and commit + merge to `main` + deploy (Vercel) per the `CLAUDE.md` autonomy rule.

**Branch:** `feat/site-polish`.
