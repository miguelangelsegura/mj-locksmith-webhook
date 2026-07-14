# Phase 7 kickoff — Trade-neutral future-proofing + launch config + go-live

Paste into a fresh Claude Code window. This is the final go-live gate.

---

Read `docs/LAUNCH-ROADMAP.md` (Phase 7), `docs/DISPANGO-STATUS.md` (config placeholders), and
`CLAUDE.md` first.

**Task:** Light trade-neutral groundwork, then flip every launch switch and do a full dry run.

1. **Trade-neutral (light — no per-trade tuning build; locksmith-only launch):**
   - Store `trade` on the `clients` row (signup already collects it; a small migration).
   - Make the Vapi structured-output **descriptions** trade-neutral (address / urgency / problem)
     rather than locksmith enums, so a non-locksmith call degrades gracefully. Keep the prompt **LEAN**;
     fix lead quality in the structured outputs, not by piling rules into the prompt. Version any prompt
     change under `prompts/` per project protocol.
2. **Launch config checklist:**
   - Real Cal.com booking link (replace `CONFIG.book`).
   - `PUBLIC_SITE_URL` → `https://dispango.com` after the GoDaddy DNS flip (A `@` + CNAME `www`).
   - Mailing address, contact phone, legal name — final values in every CONFIG (page, terms, privacy).
   - "Sign In" (`CONFIG.portal`) → the Phase 4 customer dashboard.
   - Confirm Stripe is in the intended (test vs live) mode.
   - Final OG/domain metadata.
3. **Full end-to-end dry run (test mode):** signup → sign Terms → pay → provision → **Activate** →
   `/welcome` shows the number → place a test call → lead texts the dispatch phone → the lead appears
   in the customer dashboard → admin health shows green.

**Files:** migration for `trade`, Vapi structured-output edits (via API), `web/app/page.jsx` CONFIG,
`terms`/`privacy` CONFIG, DNS (you/Miguel).

**Verify:** the dry run passes end-to-end with no `REPLACE` filler anywhere. Surface anything not
launch-ready **instead of** flipping DNS. `/code-review` + the dry run, then commit + merge + deploy per
the autonomy rule. Go live only when the dry run is green.

**Branch:** `feat/launch-config`.
