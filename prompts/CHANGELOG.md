# Voice-Agent Prompt — Changelog

The live/canonical prompt is [system-prompt.md](system-prompt.md). A frozen snapshot
of every released version lives in [versions/](versions/) so we can always revert.
Git history is the other safety net (`git show <commit>:prompts/system-prompt.md`).

To revert: copy the wanted `versions/system-prompt-vN.md` over `system-prompt.md`,
then push it to the Vapi assistant.

## v7 — 2026-06-04 (current)
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
