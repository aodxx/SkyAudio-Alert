# SkyAudio-Alert — Repository Structure

> DOCUMENT LOCK — FLOOD-FIRST — 2026-10-04

Historical market/news files may remain temporarily for audit history, but must not be imported by the production pipeline.

Current runtime areas:
- src/flood/ — water source, contract, normalization
- src/weather/ — supporting forecast
- src/content/ — Gemini narrative
- src/flex/ — compact flood-first presentation
- src/audio/ — Gemini TTS, validation, storage
- src/line/ — LINE delivery
- src/core/ — orchestration, retry, status
- tests/flood, tests/weather, tests/content, tests/flex, tests/audio, tests/line
- docs/ and fixtures/

Runtime rule: flood -> weather -> Gemini content -> Flex -> Gemini TTS -> LINE.

No market/news stage belongs in the production path.

## Current Release Status — 2026-10-04

Milestone 4A Gemini live acceptance: **PASS**.

Next milestone: **4B LINE Test Acceptance**.

Production remains **NO-GO** until LINE delivery/human review and the documented B1/B2/B4 release gates are closed.
