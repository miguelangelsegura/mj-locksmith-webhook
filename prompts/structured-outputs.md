# Voice Agent — Structured Outputs (live)

The assistant has **8 Vapi Structured Output objects** (referenced via
`artifactPlan.structuredOutputIds`). The webhook
([../supabase/functions/vapi-webhook/index.ts](../supabase/functions/vapi-webhook/index.ts))
reads them from `artifact.structuredOutputs` and keys each by its **`name`**,
lowercased with spaces → underscores, matching `STRUCTURED_FIELDS`.

## Live objects (verified via API)

| Vapi name | → webhook field | type | notes |
|---|---|---|---|
| `Caller Name` | `caller_name` | string | |
| `service_address` | `service_address` | string | city + cross-streets if exact withheld |
| `door_type` | `door_type` | string | free text; the specific item/fixture the job involves (trade-neutral — see below) |
| `damage_description` | `damage_description` | string | the problem/issue (trade-neutral); preferred for the SMS "Job" line |
| `urgency` | `urgency` | string | drives SMS header (HIGH/EMERGENCY/…) |
| `vehicle_info` | `vehicle_info` | string | filled only when a vehicle is involved |
| `outcome` | `outcome` | string | how the call ended |
| `summary` | (ignored — webhook uses `analysis.summary`) | string | |

All are **free strings with no enum**, which is why `door_type` produced the raw
`residential_key`. The webhook now **humanizes** that on the SMS (`_` → space) and
prefers `damage_description`, so no Vapi change is required.

## Trade-neutral descriptions (Phase 7 — applied 2026-07-20)

Launch is locksmith-only, but three descriptions were locksmith-shaped and would
mis-capture (or awkwardly shoehorn) a non-locksmith call. Their `description` **and**
extraction-driving `schema.description` were reworded to trade-neutral supersets — every
locksmith example is preserved, so locksmith capture doesn't regress; other trades now
return `null` instead of a forced value. Applied live via the Vapi API; `maxLength`
unchanged. Old → new:

- **`damage_description`** — was "damage or break-in indicators / signs of forced entry" →
  now "the problem or issue the caller needs help with (what's wrong, plus detail — damage,
  forced entry, a leak, a malfunction, or what they were trying to do)".
- **`door_type`** — was "the door or lock the caller needs help with" → now "the specific
  item, equipment, fixture, or location the job involves" (locksmith examples kept first;
  added e.g. water heater, breaker panel).
- **`vehicle_info`** — was "for car lockouts only" → now "only when the job involves a
  vehicle" (make/model/year, + colour/plate if given).

The field **names** stay locksmith-flavoured (`door_type`, `vehicle_info`) and the webhook's
SMS labels are unchanged — deliberate, since launch traffic is locksmith. This is *light*
groundwork (graceful degradation), not per-trade tuning.

## `outcome` enum (Phase 4 — applied)

The dashboard's spam/junk labeling + "jobs captured" count depend on a **controlled**
`outcome` vocabulary. The Vapi `outcome` Structured Output **description** is set to a
fixed set:

> `outcome` ∈ `lead` (a real job to dispatch/follow up) · `spam` (robocall / spam) ·
> `wrong_number` · `info_only` (just an inquiry, no job) · `abandoned` (caller hung up
> before completing). Emit exactly one of these.

The webhook's `NON_LEAD_OUTCOMES = {spam, wrong_number, info_only}` then correctly skips
the dispatch SMS for junk, and the dashboard (`web/lib/format.js`) maps legacy values
(`dispatched`/`unable_to_dispatch`→`lead`, `caller_hung_up`→`abandoned`) so old rows still
render. If you change the enum, update BOTH those places.

## Optional tightening (not required to ship)

If you want cleaner stored values, edit the `door_type` and `urgency` Structured
Output **descriptions** in Vapi to request plain words / a fixed set
(e.g. urgency ∈ emergency|high|normal|low; door_type ∈ house|car|business|safe|…).
