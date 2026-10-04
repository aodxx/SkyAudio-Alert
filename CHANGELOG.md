# Changelog

## Unreleased — Flood-first Document Lock (2026-10-04)

- Locked PRD, architecture, API, repository structure, checklist, context and phase status to the flood-first product.
- Explicitly removed market prices, rubber prices and general news from current production scope.
- Replaced fixed 2–3 minute audio and fixed spoken order with adaptive Gemini narrative and Gemini TTS.
- Recorded male/female TTS profiles with male as default.
- Standardized runtime order: flood → weather → Gemini content → Flex → Gemini TTS → LINE.
- Kept production schedule NO-GO until B1–B4 acceptance gates pass.
- Marked legacy acceptance evidence as historical rather than current product approval.
- Updated environment configuration and workflow wording to match the flood-first runtime.

## Phase 3 — Fixtures/Test Acceptance (2026-10-04)\n\n- Added normal/watch/affected/critical/unknown/stale flood fixtures.\n- Replaced machine-local `/tmp` source fixtures with committed deterministic HTML fixtures.\n- Fixed FloodSituation validation to fail closed instead of crashing when freshness is missing.\n- Added GitHub Actions unit-test acceptance; final Phase 3 run passed 35/35 tests.\n- Set documented Gemini content model to `gemini-3.8-flash` and TTS model to `gemini-3.8-flash-tts`.\n- Applied the configured TTS pacing preference through Gemini speech style.\n\n## Historical changes

Entries below this section are retained for audit/history only. They must not be interpreted as current production requirements.
