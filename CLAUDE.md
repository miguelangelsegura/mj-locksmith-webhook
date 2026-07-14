# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Backend for a Vapi voice-agent dispatch app (locksmith use case). A Vapi assistant answers inbound calls and extracts structured lead data; when the call ends, Vapi POSTs an `end-of-call-report` to a **Supabase Edge Function** ([supabase/functions/vapi-webhook/index.ts](supabase/functions/vapi-webhook/index.ts)) that authenticates the request, persists the call to Supabase, and texts the full lead to the locksmith via Twilio SMS.

Stack: **Vapi → Supabase Edge Function (Deno/TypeScript) → Supabase Postgres + Twilio SMS** — this is the **live call path** (the deployed webhook). Client onboarding now runs through the **`admin` Edge Function + `admin-ui/` static page** (see [Admin / onboarding tooling](#admin--onboarding-tooling)), not raw SQL. Note: `main.py` is a **legacy** FastAPI service — it carries an old duplicate of *both* the webhook and the `/admin` API, and is **not** deployed for either; the Edge Functions are live. Don't confuse them.

**Telephony & billing:** the phone number (`+16514444875`) is a **BYO Twilio number** (`provider: twilio`) imported into Vapi — *not* a Vapi-provided number. One Twilio account does double duty: it **receives the inbound calls** and **sends the dispatch SMS**. Cost splits two ways — **Twilio** = the number + call carriage + SMS (cheap, mostly fixed); **Vapi** = the AI minutes (STT + LLM + TTS, ~90% of per-call cost — the "call credits"). Live voice stack (tuned in the Vapi dashboard, not the repo): STT OpenAI `gpt-4o-mini-transcribe`, LLM Anthropic **Claude Haiku 4.5** @ temp 0.6, TTS Vapi voice "Elliot".

## Team workflow & git protocol (Abdul, Jordan, Miguel)

Shared multi-dev repo. To avoid the branch-divergence that duplicated work early on,
everyone — and every Claude Code instance working here — follows this:

- **`main` is the single source of truth and the deploy source.** Keep it working; never
  commit experimental work straight to `main`.
- **One task = one short-lived branch** (`feat/…`, `fix/…`, `docs/…`); two people never
  edit the same branch.
- **Push your branch freely/continuously** — it's a backup + lets the team see progress,
  and changes nothing live (a push is *not* a deploy).
- **Merge to `main` via a quick PR**, once sanity-checked; delete the branch after.

**Instruction to Claude Code on this repo** (Abdul granted full autonomy 2026-07-14 —
"auto deploy and push automatically, everything, no asking"; this overrides any
"don't commit/push/deploy unless asked" *global* rule, for this project only):
- **Auto-commit + push to the current working branch** at natural checkpoints (a finished,
  verified unit of work) — back progress up without asking first.
- **Auto-merge to `main` via PR AND auto-deploy** — including `supabase functions deploy`
  (any function, **incl. `billing`/payments**), `supabase db push --linked` (migrations),
  and Vercel — **without asking**, once the change is **verified and passes its required
  review tier** (`/code-review`, or `/deep-review` for the live call path / payments /
  credentials / RLS — see Verification in the global rules). Verification + review is the
  gate; a human OK is not.
- **Still non-negotiable:** never skip hooks, never force-push to `main`, never expose/commit
  secrets. Deploy only *after* the QA gate passes; if verification or review fails, fix first
  — don't deploy a red change. If on `main`, **create a branch first** before changing anything.

## Local development

- Requires the Supabase CLI (`supabase`) and Deno (for local `supabase functions serve` / type-check).
- Type-check: `deno check supabase/functions/vapi-webhook/index.ts`
- Serve locally: `supabase functions serve vapi-webhook --no-verify-jwt --env-file supabase/functions/.env.local`
- Smoke-test commands are in [README.md](README.md). No unit-test suite — verify with `curl`.
- **The agent prompt is versioned:** canonical [prompts/system-prompt.md](prompts/system-prompt.md), frozen snapshots in [prompts/versions/](prompts/versions/), notes in [prompts/CHANGELOG.md](prompts/CHANGELOG.md). Revert by copying a `versions/system-prompt-vN.md` over the canonical file and pushing it to Vapi.

## Deployment

- Deploy: `supabase functions deploy vapi-webhook` (`verify_jwt = false` is set in [supabase/config.toml](supabase/config.toml), so the endpoint is public; the `x-vapi-secret` check is the auth gate).
- Live webhook URL: `https://<project-ref>.supabase.co/functions/v1/vapi-webhook` — paste into the Vapi assistant Server URL.
- Secrets: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the Edge runtime (you cannot set `SUPABASE_`-prefixed secrets). Set the rest with `supabase secrets set VAPI_SECRET=… TWILIO_ACCOUNT_SID=… TWILIO_AUTH_TOKEN=… TWILIO_MESSAGING_SERVICE_SID=… OPS_PHONE=…`.
- Schema changes live in [supabase/migrations/](supabase/migrations/); apply with `supabase db push --linked`.
- **CLI "Cannot find project ref":** restore `supabase/.temp/project-ref` containing just the ref string (`config.toml`'s `project_id` is a display name, not the ref). The DB password is cached, so `--linked` then connects without a prompt.
- **Ad-hoc prod data read/write (no DB password needed):** fetch the service_role key with `supabase projects api-keys --project-ref <ref> --output-format json` (shape `{"keys":[{api_key,name}]}`), then hit PostgREST at `https://<ref>.supabase.co/rest/v1/<table>`. PostgREST can't run DDL — column adds still go through a migration + `db push`.
- **Driving the Vapi REST API** (`api.vapi.ai`, bearer `VAPI_PRIVATE_KEY` from `.env.local`): it rejects the default python-urllib User-Agent with Cloudflare error 1010 — use `curl`, or set a browser `User-Agent` header. PATCHing `model` requires sending the whole model object back (GET it, swap the system message, PATCH) so other settings aren't wiped.
- **Smoke-test routing without a real call:** `POST` an `assistant-request` payload (`message.type`, `call.phoneNumber.number`) to the deployed webhook with `?token=$VAPI_SECRET`; the response's `variableValues` should carry the right `business_name`/`agent_name`.
- **Vapi server URLs have silently regressed to dead Render before — always verify them.** The **assistant** `server.url` receives post-call messages (end-of-call → persist + SMS); **`assistant-request` (per-call routing/memory) uses the PHONE NUMBER's `server.url`** (or org). Both must point at `https://<ref>.supabase.co/functions/v1/vapi-webhook?token=<VAPI_SECRET>`. A number with no assistant **and** no server URL = calls don't connect. If persistence/SMS goes quiet, check neither URL points at `*.onrender.com`.
- **`VAPI_SECRET` is unreadable after the fact** (Supabase shows only a digest). To put it in a `?token=` URL, **rotate** it to a value you generate (`supabase secrets set VAPI_SECRET=…` → redeploy → update the Vapi URLs).

## Design constraints to preserve

- **Signature verification is the security gate.** When `VAPI_SECRET` is set, every webhook must present the matching secret either as the `x-vapi-secret` header or as a `?token=` query param on the Server URL (the token form is used because the current Vapi UI has no plain secret field). Mismatches are rejected (200 `{"received": false}`) before any DB write or SMS. Do not remove or weaken this without an explicit ask.
- **The webhook always returns 200**, even on JSON parse failure. The `try`/`catch` exists so a malformed payload can never crash the worker.
- **Only `end-of-call-report` events persist + dispatch.** Other Vapi event types emit a one-line ack (`[vapi] <type> call=<id> bytes=<n>`). Do not expand other event types to full handling without an explicit ask.
- **SMS dispatch is idempotent** via the `notified_at`/`notified_phone` conditional claim on the `calls` row — never send two texts for one call. A stale guard skips calls ended more than an hour ago. Preserve both.
- **SMS sends the full lead** (multi-segment, paid Twilio account). Do not reintroduce the old single-segment truncation.
- **Multi-tenant by phone number.** `handleAssistantRequest`/`persistCall` resolve the locksmith by `inbound_number` (the number the call arrived on, `call.phoneNumber.number`), falling back to `vapi_assistant_id`. **One shared Vapi assistant serves every locksmith** — per-shop identity (`business_name`, `agent_name`) lives on the `clients` row and is injected per call via `assistantOverrides.variableValues`. Keep the assistant prompt and `firstMessage` templatized with `{{business_name}}`/`{{agent_name}}`; never hardcode a shop name. New-caller greeting = the assistant's `firstMessage` field; returning-caller greeting is built in `handleAssistantRequest` — both must use the variables.
- **The Vapi number must be on dynamic/server routing** (a Server URL on the phone-number resource, no static `assistantId`/`squadId`), or `{{...}}` template vars render literally on live calls.
- **Returning-caller memory** (`handleAssistantRequest`/`lookupCallerMemory`): look up by `caller_phone`, **coalesce each field across the last ~20 calls** (a thin/incomplete call must not wipe history) and **filter junk values** (`unknown`/`null`/empty). Don't revert to a single most-recent-row lookup.
- **Lead-data quality is fixed in the Vapi structured outputs, not the prompt.** Past bugs were schema bugs: `service_address` said "return null if not fully collected" (dropped partials like a neighbourhood); `door_type` was a machine enum (`residential_key`). Fix the structured-output **description/schema** via the Vapi API; don't pile rules into the prompt.
- **Keep the agent prompt LEAN.** Over-engineering it (stacking required steps/scripts) caused question-stacking, repetition, and nonsense answers. The levers for "smart + natural" are the **model and voice**, not more prompt rules.

## Cost & abuse failsafes

- **Per-call caps (Vapi assistant):** `maxDurationSeconds = 600` (10-min hard stop), `silenceTimeoutSeconds = 300` (ends on 5 min of dead air), plus idle check-in messages. One call therefore maxes out at ~$1.40.
- **Vapi is prepaid** — billing can't exceed the loaded balance, so the **loaded balance is the hard total ceiling** (no debt possible). Keep it modest; set auto-reload conservatively, or skip it so abuse simply stops at $0.
- **Junk calls:** the agent ends wrong-number/robocalls quickly, and `sendDispatchSms` skips texting for `wrong_number`/`spam`/`info_only` outcomes — no SMS spam to the locksmith.
- **KNOWN GAP — no per-number rate limit.** Many short calls from one number can still drain the loaded balance. Planned fix: rate-limit in `handleAssistantRequest` — count recent calls per `caller_phone` in `calls` and refuse to spin up the assistant past a threshold (e.g. >5/hour), so abuse is stopped *before* it costs AI minutes.

## Data model

- `clients`: `id`, `vapi_assistant_id`, `active`, `dispatch_phone`, plus routing columns `inbound_number` (the dedicated Vapi number a locksmith forwards to — primary routing key, with `vapi_assistant_id` as fallback), `cell_number`, `answer_mode` (`human_first | ai_first | scheduled`), `ring_timeout_seconds`, `business_hours`.
- `calls`: keyed by `vapi_call_id` (upsert), stores structured fields, transcript, summary, `raw_payload`, and the `notified_at`/`notified_phone` dispatch markers.

## Admin / onboarding tooling

Onboarding a locksmith = getting a correct `clients` row. This is done through a small admin app, not raw SQL (manual inserts silently broke the live system twice).

- **`admin` Edge Function** ([supabase/functions/admin/index.ts](supabase/functions/admin/index.ts)) — token-authed JSON API: `GET`/`POST /clients`, `PATCH /clients/:id`, `POST /clients/:id/test-sms`. Validates E.164 `dispatch_phone`, rejects a duplicate `vapi_assistant_id`, and the test-SMS confirms the dispatch number end-to-end before a real call ever comes in. Reuses the webhook's `clients` table + Twilio REST send.
- **Auth gate = `ADMIN_API_TOKEN`** presented as the `x-admin-token` header (constant-time compare). `verify_jwt = false`; **fails closed** (503) when the secret is unset. Set it with `supabase secrets set ADMIN_API_TOKEN=…`. Separate trust boundary from `VAPI_SECRET` — do not conflate.
- **`admin-ui/index.html`** — a single self-contained static page (clients table, validated new-client form, test-SMS button, active toggle) that calls the `admin` API with the token entered at runtime and kept **only** in the browser's localStorage. The page holds no secrets. See [admin-ui/README.md](admin-ui/README.md).
- **Supabase CANNOT serve the UI.** It rewrites `text/html` → `text/plain` on **both** Edge Functions and Storage (anti-phishing on the shared `*.supabase.co` domain), so the page renders as raw text from any Supabase URL. Host `admin-ui/` on an external static host (Netlify Drop / Vercel / etc.). The API base URL is hard-coded in the page so it works from any origin (the `admin` function returns `Access-Control-Allow-Origin: *`).
- **Defunct to delete:** the deployed Edge Functions `admin-ui` and `admin-ui-publish` (from the abandoned attempt to serve HTML from Supabase) are inert no-ops — remove them from the dashboard. The legacy `/admin` endpoints in `main.py` are superseded.
- **Not yet built** (see [docs/ADMIN-DASHBOARD-SPEC.md](docs/ADMIN-DASHBOARD-SPEC.md)): Vapi number/assistant provisioning automation, leads/analytics views, billing, and Supabase RLS for multi-tenant isolation.

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

Telegram/WhatsApp/email dispatch channels and a switch away from Vapi are deferred — wait for an explicit request. (The Vapi assistant prompt is **actively maintained**, versioned under [prompts/](prompts/), so iterating on it is in scope.)
