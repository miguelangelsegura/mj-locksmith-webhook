# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Backend for a Vapi voice-agent dispatch app (locksmith use case). A Vapi assistant answers inbound calls and extracts structured lead data; when the call ends, Vapi POSTs an `end-of-call-report` to a **Supabase Edge Function** ([supabase/functions/vapi-webhook/index.ts](supabase/functions/vapi-webhook/index.ts)) that authenticates the request, persists the call to Supabase, and texts the full lead to the locksmith via Twilio SMS.

Stack: **Vapi → Supabase Edge Function (Deno/TypeScript) → Supabase Postgres + Twilio SMS.** There is no Render/FastAPI host anymore.

## Local development

- Requires the Supabase CLI (`supabase`) and Deno (for local `supabase functions serve` / type-check).
- Type-check: `deno check supabase/functions/vapi-webhook/index.ts`
- Serve locally: `supabase functions serve vapi-webhook --no-verify-jwt --env-file supabase/functions/.env.local`
- Smoke-test commands are in [README.md](README.md). No unit-test suite — verify with `curl`.

## Deployment

- Deploy: `supabase functions deploy vapi-webhook` (`verify_jwt = false` is set in [supabase/config.toml](supabase/config.toml), so the endpoint is public; the `x-vapi-secret` check is the auth gate).
- Live webhook URL: `https://<project-ref>.supabase.co/functions/v1/vapi-webhook` — paste into the Vapi assistant Server URL.
- Secrets: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the Edge runtime (you cannot set `SUPABASE_`-prefixed secrets). Set the rest with `supabase secrets set VAPI_SECRET=… TWILIO_ACCOUNT_SID=… TWILIO_AUTH_TOKEN=… TWILIO_MESSAGING_SERVICE_SID=… OPS_PHONE=…`.
- Schema changes live in [supabase/migrations/](supabase/migrations/); apply with `supabase db push`.

## Design constraints to preserve

- **Signature verification is the security gate.** When `VAPI_SECRET` is set, every webhook must present the matching secret either as the `x-vapi-secret` header or as a `?token=` query param on the Server URL (the token form is used because the current Vapi UI has no plain secret field). Mismatches are rejected (200 `{"received": false}`) before any DB write or SMS. Do not remove or weaken this without an explicit ask.
- **The webhook always returns 200**, even on JSON parse failure. The `try`/`catch` exists so a malformed payload can never crash the worker.
- **Only `end-of-call-report` events persist + dispatch.** Other Vapi event types emit a one-line ack (`[vapi] <type> call=<id> bytes=<n>`). Do not expand other event types to full handling without an explicit ask.
- **SMS dispatch is idempotent** via the `notified_at`/`notified_phone` conditional claim on the `calls` row — never send two texts for one call. A stale guard skips calls ended more than an hour ago. Preserve both.
- **SMS sends the full lead** (multi-segment, paid Twilio account). Do not reintroduce the old single-segment truncation.

## Data model

- `clients`: `id`, `vapi_assistant_id`, `active`, `dispatch_phone`, plus routing columns `cell_number`, `answer_mode` (`human_first | ai_first | scheduled`), `ring_timeout_seconds`, `business_hours`.
- `calls`: keyed by `vapi_call_id` (upsert), stores structured fields, transcript, summary, `raw_payload`, and the `notified_at`/`notified_phone` dispatch markers.

## Cold outreach (the `/locksmith-outreach` skill)

A **separate subsystem** from the call→SMS pipeline above: a Claude Code skill that finds locksmith businesses by city, scrapes their published email, and creates ready-to-send Gmail drafts pitching the dispatch service. Lives in [.claude/skills/locksmith-outreach/SKILL.md](.claude/skills/locksmith-outreach/SKILL.md); email copy in [outreach/templates.md](outreach/templates.md); dedup ledger in `outreach/contacted.csv` (gitignored — scraped business PII). Built deliberately **lean** (no paid APIs, no DB, no LLM personalization, no agent fan-out) — keep it that way unless asked.

Invariants / traps (learned building it):
- **CASL implied-consent is the legal basis** (targets are Canadian): only email an address **conspicuously published on the business's own website**, and record its `email_source_url`. **Never guess `info@domain`** — a guessed address isn't "published" and weakens the CASL footing. Skip sites stating "no unsolicited email."
- **Every email carries the CASL footer** from templates.md (sender identity + physical mailing address + working unsubscribe). Preflight **refuses to draft while any `{{...}}` placeholder remains**.
- **Drafts only — never auto-send.** Output is Gmail drafts the user reviews and sends.
- **`WebSearch` is US-biased and does NOT see Google's Maps/local pack** — one query misses many local shops. Run several regional query variants AND mine directory/listicle pages for the roster of business *names*, then visit each shop's **own** site for the email.
- **Deep-find before marking `no_email`**: check privacy/terms/footer, raw-HTML obfuscation, sister/alt domains, and the Facebook "About" page. Surface obvious typos (e.g. `cantact@`) for human confirm — don't use them.
- **Dedup against `outreach/contacted.csv`** by email and by domain before drafting — reruns must never double-contact.
- **Write valid CSV**: quote any field with a comma (`hours`/`description` usually need it). Statuses: `found | drafted | no_email | skipped_dupe | replied | unsubscribed`.
- **Gmail connector** exposes only `authenticate`/`complete_authentication` until OAuth completes; the create-draft tool appears only after. Apollo enrichment is optional, key-gated (`APOLLO_API_KEY`), weaker-CASL — last resort only.
- Modes: `--collect`/`--no-draft` (build the sheet, no drafts), `--dry-run` (no writes at all), `--followup` (second-touch template).

## Out of scope (do not add unprompted)

Voice-agent conversation design (Vapi assistant prompt/script), Telegram/WhatsApp/email dispatch channels, and a switch away from Vapi are deferred. Wait for an explicit request.
