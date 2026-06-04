# Locksmith Voice Agent — Webhook (Supabase Edge Function)

Receives Vapi voice-agent end-of-call webhooks, authenticates them, persists the call to Supabase, and texts the full lead to the locksmith via Twilio SMS.

Stack: **Vapi → Supabase Edge Function (Deno/TypeScript) → Supabase Postgres + Twilio SMS.**

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
