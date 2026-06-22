# Dispango — Locksmith Voice Agent: System Overview

*Team onboarding doc. Read this to understand the whole system in ~5 minutes.*

## What it is

An **AI phone receptionist for locksmiths**. A customer calls a number; an AI agent
("Mike") answers, figures out their locksmith problem, captures the lead, and instantly
**texts it to the locksmith**. It also **remembers returning callers** by their phone number.

- Brand: **Dispango**. First customer: **M and J** (a locksmith).
- One-liner: *never miss a call — the AI answers, gets the job details, and texts you the lead.*

---

## The platforms (who does what)

| Platform | Role in a call |
|---|---|
| **Vapi** | The phone line + conductor. Owns the number, runs the live conversation, wires together speech ↔ text ↔ AI. |
| **OpenAI** | **Speech-to-text** — turns the caller's voice into text (`gpt-4o-mini-transcribe`). |
| **Anthropic** | **The brain** — Claude (Haiku 4.5) plays "Mike" and decides what to say. |
| **Vapi voice ("Elliot")** | **Text-to-speech** — turns Mike's words back into a voice. |
| **Supabase Edge Function** | **OUR code** (the "webhook"). The *only* custom software we wrote. Runs **twice per call**. |
| **Supabase Postgres** | **OUR database.** Tables: `clients` (the locksmiths) and `calls` (every call = leads **and** memory). |
| **Twilio** | Sends the **lead text** to the locksmith. |

> **Key idea:** Vapi is the conductor. The only code *we* wrote is the Supabase webhook.
> Everything else (STT / LLM / TTS / SMS) is a swappable vendor.

> **"Supabase" is two things:** (1) **Edge Functions** = where our webhook *code* runs;
> (2) **Postgres** = our *database*. The webhook (code) reads/writes the database.

---

## The full call flow (dial → hang-up → text)

```
BEFORE THE CALL
  Customer dials +1 651-444-4875
        │
        ▼
  VAPI answers → "which agent + who's calling?"  ──(assistant-request)──▶  OUR WEBHOOK
        │                                                                      │
        │                                            reads SUPABASE `calls` (caller's past visits)
        ▼                                                                      │
  VAPI loads "Mike", filled with the business name + the caller's memory ◀─────┘

DURING THE CALL  (loops every turn)
  caller speaks ──▶ OPENAI (speech→text) ──▶ ANTHROPIC "Mike" decides ──▶ VAPI voice (text→speech)
  Mike gathers: the problem · lock/door type · address · name · callback number

ENDING
  Mike: "…Take care!"  ──▶  VAPI hangs up

AFTER THE CALL
  VAPI analyzes the call (transcript + extracted fields + summary)
        │
        ▼ (end-of-call-report)
  OUR WEBHOOK ──▶ saves the call to SUPABASE `calls`
              └──▶ composes the lead ──▶ TWILIO ──▶ 📱 locksmith's phone
```

**Step by step:**
1. **Customer dials** the Vapi number. Vapi answers.
2. **Pre-call lookup:** the number has no fixed assistant, so Vapi asks our webhook *"who is this?"* (`assistant-request`). Our webhook looks the caller up by phone in `calls`, builds a personalized greeting + their history, and hands it back to Vapi.
3. **Mike is assembled:** Vapi loads the shared agent and fills in the business name, agent name, and the caller's memory.
4. **The conversation loop** (each turn): caller speaks → **OpenAI** transcribes → **Anthropic (Mike)** decides the reply → **Vapi voice** speaks it.
5. **Ending:** Mike says "Take care!" → Vapi hangs up.
6. **Post-call:** Vapi transcribes the call, extracts the structured fields + a summary, and POSTs an `end-of-call-report` to our webhook.
7. **Our webhook** saves the call to Supabase `calls`, then texts the labeled lead to the locksmith via **Twilio**.
8. **Locksmith** gets the text and calls the customer back.

---

## Memory — the clever part

There is **no special "memory" feature**. The **`calls` table is both the lead record AND the memory store**:

- **After** every call, the webhook **writes** the call to `calls`.
- **Before** the next call from that number, Vapi asks the webhook, which **reads** `calls` for that phone and tells Mike who they are.

So a repeat caller hears:
> *"Hi Abdul, it's Mike at M and J — is this the same situation with the front door over at Walden, or did something new come up?"*

**Vapi remembers nothing between calls.** All the intelligence and memory live in *our* Supabase database. Vapi just triggers a **write after** the call and a **read before** the next one.

---

## Where everything lives

| Thing | Where |
|---|---|
| The webhook (our code) | GitHub `miguelangelsegura/mj-locksmith-webhook` → `supabase/functions/vapi-webhook/index.ts` (~250 lines) |
| The agent's prompt | same repo → `prompts/system-prompt.md` (versioned; snapshots in `prompts/versions/` + `prompts/CHANGELOG.md`). Runs live inside the Vapi assistant. |
| Database | Supabase project `yqyvybukyfokyfsjzyso` → tables `clients`, `calls` |
| Voice agent config (models, voice, phone number) | Vapi dashboard (dashboard.vapi.ai), assistant `c7a40f5b…`, number `+16514444875` |
| Lead texts | Twilio (paid account) |
| Repo learnings / conventions | `CLAUDE.md` in the repo |

---

## Current status

- ✅ Full pipeline **live and working**: call → capture → text → memory.
- ✅ Agent tuned through prompt **v12** (lean, natural, ends cleanly).
- ✅ **Multi-tenant ready** — one shared agent serves many locksmiths via per-client name/number (`clients.inbound_number`, `business_name`, `agent_name`).
- ⏳ **To do:** one fresh verification call; merge the `feat/edge-function-port` branch to `main`; (recommended) upgrade the LLM Haiku 4.5 → **Sonnet** for sharper conversation.
- **Brand/sales:** dispango.com secured; Calendly + Google Workspace set up; locksmith cold-outreach is a separate tool (the `/locksmith-outreach` Claude skill).

---

## Gotchas (don't break these)

- **The Vapi server URLs must point at our Supabase function** (with the `?token`). They've silently reverted to a dead old host before — which broke saving + texting **with no error**. If leads stop arriving, check this first.
- **The number must stay on "dynamic routing"** (no fixed assistant on the phone number), or the memory/personalization breaks.
- **Agent quality is mostly the model + voice, not the prompt.** Resist stuffing the prompt with rules — it's deliberately lean and versioned. Most "smartness" problems are solved by a better *model*.
