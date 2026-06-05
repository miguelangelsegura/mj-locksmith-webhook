# Voice-Agent Prompt — Changelog

The live/canonical prompt is [system-prompt.md](system-prompt.md). A frozen snapshot
of every released version lives in [versions/](versions/) so we can always revert.
Git history is the other safety net (`git show <commit>:prompts/system-prompt.md`).

To revert: copy the wanted `versions/system-prompt-vN.md` over `system-prompt.md`,
then push it to the Vapi assistant.

## v3 — 2026-06-04 (current)
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
