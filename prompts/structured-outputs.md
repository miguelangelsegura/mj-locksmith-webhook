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
| `door_type` | `door_type` | string | free text; model emits values like `residential_key` |
| `damage_description` | `damage_description` | string | preferred for the SMS "Job" line |
| `urgency` | `urgency` | string | drives SMS header (HIGH/EMERGENCY/…) |
| `vehicle_info` | `vehicle_info` | string | car jobs |
| `outcome` | `outcome` | string | how the call ended |
| `summary` | (ignored — webhook uses `analysis.summary`) | string | |

All are **free strings with no enum**, which is why `door_type` produced the raw
`residential_key`. The webhook now **humanizes** that on the SMS (`_` → space) and
prefers `damage_description`, so no Vapi change is required.

## Optional tightening (not required to ship)

If you want cleaner stored values, edit the `door_type` and `urgency` Structured
Output **descriptions** in Vapi to request plain words / a fixed set
(e.g. urgency ∈ emergency|high|normal|low; door_type ∈ house|car|business|safe|…).
