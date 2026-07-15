# Voice-Agent Prompt — Changelog

The live/canonical prompt is [system-prompt.md](system-prompt.md). A frozen snapshot
of every released version lives in [versions/](versions/) so we can always revert.
Git history is the other safety net (`git show <commit>:prompts/system-prompt.md`).

To revert: copy the wanted `versions/system-prompt-vN.md` over `system-prompt.md`,
then push it to the Vapi assistant.

## v14 — 2026-07-15 (current)
Snapshot: [versions/system-prompt-v14.md](versions/system-prompt-v14.md)

Legal/consent hardening. Adds one "Situations to handle" bullet: if a caller objects to
being recorded or to speaking with an AI, don't argue — offer a direct human callback,
confirm the number, and wrap up (the recording can't be toggled mid-call, so a callback is
the honest fallback). Pairs with the new **recording + AI disclosure folded into the opening
greeting** — returning-caller greeting in `vapi-webhook` (`handleAssistantRequest`), new-caller
greeting in the Vapi assistant `firstMessage` ("your AI assistant, on a recorded line"). This is
the notice that makes recording consent valid in two-party-consent jurisdictions and satisfies
bot-disclosure law. Keeps the prompt lean — one bullet, no new scripts.

## v13 — 2026-07-15
Snapshot: [versions/system-prompt-v13.md](versions/system-prompt-v13.md)

Wire per-shop business info into the agent (Phase 4 dashboard). The "About {{business_name}}"
block now injects the customer-editable `{{service_area}}` / `{{services_offered}}` / `{{pricing_notes}}`
(blank-safe: unset lines fall back to the generic 24/7-locksmith picture). Pricing rule relaxed per
Abdul: the agent may quote a price **when it's listed in pricing_notes**, and falls back to "technician
confirms on-site" when it isn't (never invents a price). Also a one-line nudge so wrong-number/robocall
exits read as spam/wrong-number, paired with the `outcome` structured-output enum change
(see [structured-outputs.md](structured-outputs.md)). Keeps the prompt lean.

## v12 — 2026-06-04
Snapshot: [versions/system-prompt-v12.md](versions/system-prompt-v12.md)

Make the callback question non-paraphrasable. "Speak in your own words" let the model
drift "Is the number you're calling from the best one?" into an open "what's the best
number to reach you?" — which makes the caller repeat a number we already have from
caller ID. Now: confirm that exact number, almost word-for-word; never ask it open.

## v11 — 2026-06-04
Snapshot: [versions/system-prompt-v11.md](versions/system-prompt-v11.md)

**Callback number asked once** — don't bring the number up again after confirming it.
**Urgency sensing** — if the caller sounds rushed/stressed, speed up: skip small talk,
get just the essentials (problem, location, callback), reassure, and wrap up fast
(was only "reassure," didn't actually move faster).

## v10 — 2026-06-04
Snapshot: [versions/system-prompt-v10.md](versions/system-prompt-v10.md)

Lean pass (no behavior change): removed the redundant "What you're trying to do"
section (covered by the identity + "What you need before the call ends") and tightened
the returning-caller paragraph.

## v9 — 2026-06-04
Snapshot: [versions/system-prompt-v9.md](versions/system-prompt-v9.md)

Reverts the v7 city/province-assumption guard — the agent hadn't actually invented
"Calgary" (the caller had stated it earlier); removed to keep the prompt lean. The
`service_address` structured output reverted to the partial-capture version too.

## v8 — 2026-06-04
Snapshot: [versions/system-prompt-v8.md](versions/system-prompt-v8.md)

End-of-call + phone fixes. **Callback number:** ask "is the number you're calling from
the best one?" — yes = done (no readback), no = take + read back the alternate.
**Address:** confirm once when first given, never repeat (especially not at the end).
**Ending:** wrap up and end the call when concluded — sign-off ends with "Take care!",
which is added to `endCallPhrases` so Vapi hangs up deterministically (Haiku was lingering).

## v7 — 2026-06-04
Snapshot: [versions/system-prompt-v7.md](versions/system-prompt-v7.md)

Stop the agent inventing a city/province. Address handling now says: only repeat back
what the caller actually said — never add or assume a city/province/country they didn't
mention (Miguel's "652 Platts Lane" was being saved as "…Calgary, Alberta"). Paired with
the `service_address` structured output (Vapi), which now forbids inferring location parts.

## v6 — 2026-06-04
Snapshot: [versions/system-prompt-v6.md](versions/system-prompt-v6.md)

**Multi-tenant templatization.** Replaces the hardcoded "M and J" / "Mike" with
`{{business_name}}` / `{{agent_name}}` so one shared Vapi assistant can serve many
locksmiths. The webhook's `assistant-request` handler resolves the client (by
`inbound_number`, else the first active client) and injects `business_name` +
`agent_name` via `assistantOverrides.variableValues`, alongside the existing
returning-caller vars. Per-locksmith values live on the `clients` row
(`business_name`, `agent_name`). M&J's row sets them to "M and J" / "Mike", so
behavior is unchanged for the current number.

When pushing to Vapi: the assistant's **first message** field must also use
`{{business_name}}`/`{{agent_name}}` (not just the system prompt), or new-caller
greetings on a static first message won't personalize.

## v5 — 2026-06-04
Snapshot: [versions/system-prompt-v5.md](versions/system-prompt-v5.md)

Adds **returning-caller memory**. The webhook's `assistant-request` handler looks
up the caller by phone in `calls`, and injects `{{caller_name}}` + `{{caller_memory}}`
(last issue + address) plus a personalized greeting via Vapi `assistantOverrides`.
Requires the Vapi phone number to use **dynamic/server routing** (no static inbound
assistant) so Vapi asks our server per call. Do NOT push v5 to the live assistant
until the number is switched to dynamic, or `{{...}}` would render literally on a
static call.

## v4 — 2026-06-04
Snapshot: [versions/system-prompt-v4.md](versions/system-prompt-v4.md)

Tone/accuracy refinements on v3 (kept lean):
- **No company-name hallucination** — close must sign off simply, never thank for "scheduling," never name any company but M and J (the model had said "thank you for scheduling with Wellness Printers").
- **Don't repeat canned lines** — vary phrasing; for un-pin-downable questions (ETA), reassure naturally and differently each time.
- **Don't push for the exact address** — if they give just a street or hesitate, accept it and offer that they can give it to the locksmith on the callback; never insist.
- **Urgency reassurance** — if the caller sounds urgent, reassure them someone will be dispatched as fast as possible.

## v3 — 2026-06-04
Snapshot: [versions/system-prompt-v3.md](versions/system-prompt-v3.md)

Refinements on v2 after a strong test call ("by far the best one"):
- Mention dispatch **once**, not repeatedly (it was over-saying "the locksmith will be sent to you").
- **Brief** close — "you'll hear from us soon, hang tight" instead of repeating the dispatch spiel.
- Get the caller's **name earlier** in the call.
- **Stop signposting** remaining questions ("a couple more details I need") — it made the call feel like a long form; just ask the next thing.
- **House lockout:** ask which door (front/back/garage) and check for an easy way in (open window / unlocked garage) — scoped to homes only so it never asks a car about windows/glove box.

## v2 — 2026-06-04
Snapshot: [versions/system-prompt-v2.md](versions/system-prompt-v2.md)

Rewrote from scripted exact-Q&A to **natural, principle-based** guidance — the agent
speaks in its own words; examples are examples, not lines to read. Tone: always calm,
professional, human (reactions / light laughter / natural "um"s allowed); never mirrors
caller anger or panic. Fixes folded in:
- Removed the dead "emergency scenario" reference (it pointed to a section that no longer exists).
- Expectation is now the technician will **call** the customer when on the way (not "text"; resolves the call/text contradiction and matches reality — the webhook texts the *locksmith*, not the caller).
- **Read back the callback number** when the caller gives an alternate one.
- Added a **wrong-number / non-customer / robocall** exit so junk calls don't become leads.
- "**Don't re-ask what the caller already told you**" — stops the over-asking.
- Reconciled the pacing contradiction; dropped the hard 90-second rule and "not social."
- Added a **price-shopper off-ramp** (capture a callback lead) and an out-of-area note.
- Softened the unverifiable "a manager will call you back" promise to "I'll flag it for the team."
- Fixed intro/quote typos from v1.

## v1 — baseline
Snapshot: [versions/system-prompt-v1.md](versions/system-prompt-v1.md)

Miguel's original scripted dispatcher prompt (exact Q&A flow). Worked, but rigid and
contained the issues fixed in v2.
