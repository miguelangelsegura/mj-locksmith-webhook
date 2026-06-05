# Voice Agent — Model Stack

Configured in the **Vapi dashboard** / via API per assistant. Assistant: **Riley**
(`c7a40f5b-ee2b-41ea-ba70-10ee214418fb`), persona "Sarah" for M and J Enterprises.

## Current live config (verified via API)

| Layer | Live setting | Status vs plan |
|---|---|---|
| **Transcriber (STT)** | Deepgram **Nova-3**, endpointing 150 | ✅ already the recommended pick |
| **Model (LLM)** | OpenAI **gpt-5-mini** | Keep — newer/cheaper than the GPT-4o we'd planned |
| **Voice (TTS)** | Vapi **"Emma"**, speed 1.1 | Optional A/B vs Cartesia Sonic / ElevenLabs Flash |

## Optional A/B (only if you want to tune)

- **Voice:** current Vapi "Emma" vs **Cartesia Sonic** (lower latency) vs **ElevenLabs
  Flash v2.5** (more expressive). Pure preference — listen to a few calls.
- **LLM:** gpt-5-mini is a good default. Only test alternatives (Gemini 2.5 Flash,
  Claude Haiku 4.5) if latency or cost becomes a problem.

No changes needed here to ship — STT and LLM are already solid.

## Cost reference

Balanced stacks run ~$0.12–0.16/min all-in; at $199/mo a 300-min/mo locksmith ≈ $42
cost (~78% margin). Validate with real Vapi usage after a week of calls.
