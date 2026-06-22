# Locksmith Voice Agent — Webhook (Supabase Edge Function)

Receives Vapi voice-agent end-of-call webhooks, authenticates them, persists the call to Supabase, and texts the full lead to the locksmith via Twilio SMS.

Stack: **Vapi → Supabase Edge Function (Deno/TypeScript) → Supabase Postgres + Twilio SMS.**

## How it works (the call workflow)

> New to the project? Read the full onboarding doc: **[docs/SYSTEM-OVERVIEW.md](docs/SYSTEM-OVERVIEW.md).**

A customer calls → an AI agent ("Mike") answers, captures the locksmith lead, texts it to the locksmith, and **remembers returning callers**. **Vapi** runs the call; the **only custom code is our Supabase webhook** (it runs *twice* per call); **Supabase Postgres** stores leads *and* memory; **Twilio** sends the text.

| # | Phase | What happens | Platform(s) |
|---|---|---|---|
| 1 | Before | Customer dials the number; the line answers | **Vapi** |
| 2 | Before | No fixed agent → Vapi asks our server "who's calling, which agent?" | **Vapi → webhook** (`assistant-request`) |
| 3 | Before | Webhook finds the locksmith + looks the caller up by phone | **Webhook → Supabase** (`clients`, `calls`) |
| 4 | Before | Webhook returns the agent + personalized greeting + memory | **Webhook → Vapi** |
| 5 | During | Caller speaks → text | **OpenAI** (speech-to-text) |
| 6 | During | "Mike" decides the reply | **Anthropic** (Claude) |
| 7 | During | Reply spoken back; loops until details gathered | **Vapi voice** (text-to-speech) |
| 8 | Ending | Mike says "Take care!" → call ends | **Vapi** |
| 9 | After | Vapi transcribes + extracts the fields + summary, sends it to us | **Vapi → webhook** (`end-of-call-report`) |
| 10 | After | Webhook saves the call (the lead **and** the memory) | **Webhook → Supabase** (`calls`) |
| 11 | After | Webhook texts the labeled lead to the locksmith | **Webhook → Twilio → 📱** |
| ↺ | Next call | Same caller → step 3 reads the row saved in step 10 → Mike greets them by name | the **memory loop** |

**Platforms at a glance:** **Vapi** (phone + conductor) · **OpenAI** (ears / speech-to-text) · **Anthropic** (brain — "Mike") · **Supabase** (our webhook code + the database) · **Twilio** (texts the locksmith). Memory isn't a special feature — the `calls` table is *both* the lead record and the memory store.

## Behavior

- `GET` — health check, returns `{"status": "ok"}`.
- `POST` — verifies the `x-vapi-secret` header against `VAPI_SECRET`, then on an `end-of-call-report`: looks up the client by `assistantId`, upserts the call into Supabase `calls`, and sends a dispatch SMS to the client's `dispatch_phone`. Always returns 200.

## Local development

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) and [Deno](https://deno.com/).

```bash
# type-check
deno check supabase/functions/vapi-webhook/index.ts

# serve locally (provide secrets via an env file)
supabase functions serve vapi-webhook --no-verify-jwt --env-file supabase/functions/.env.local
```

Test:

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/vapi-webhook \
  -H "Content-Type: application/json" \
  -H "x-vapi-secret: <your-secret>" \
  -d '{"message":{"type":"end-of-call-report","call":{"id":"test-1","assistantId":"<assistant-id>"}}}'
```

## Deploy

```bash
# one-time: link the project and set secrets
supabase link --project-ref <project-ref>
supabase secrets set VAPI_SECRET=… TWILIO_ACCOUNT_SID=… TWILIO_AUTH_TOKEN=… \
  TWILIO_MESSAGING_SERVICE_SID=… OPS_PHONE=…

# apply schema + deploy the function
supabase db push
supabase functions deploy vapi-webhook
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by the Edge runtime — do not set them manually.

Webhook URL: `https://<project-ref>.supabase.co/functions/v1/vapi-webhook` → set this as the Vapi assistant **Server URL**, and set the matching **Server URL Secret** to `VAPI_SECRET`.

## Call routing (per client, in `clients.answer_mode`)

- `human_first` (default) — the locksmith's number rings first; carrier conditional-forwarding (busy/no-answer/unreachable) rolls unanswered calls to the Vapi number. Configured at the carrier + Vapi number level, not in code.
- `ai_first` — the AI answers, then transfers to `cell_number` via the Vapi assistant's `transferCall` tool.
- `scheduled` — time-based switch using `business_hours`.
