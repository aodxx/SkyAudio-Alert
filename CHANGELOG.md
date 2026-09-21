# Changelog

## 0.2.0 — Phase 2–6 implementation
- Implemented deterministic weather engine (`src/weather`): Open-Meteo adapter, normalization, WMO code mapping, rule-based analyzer (temperature categories, rain windows, advice signals, theme resolution).
- Implemented forecast layer (`src/forecast`): Thai advice sentences, dynamic Thai TTS script, hourly-slot formatter.
- Implemented Flex layer (`src/flex`): theme palette with day/night modifier, reusable components, full bubble builder matching the reference screenshot layout (header, hero temperature, quick indicators, hourly row, daily summary, advice box, footer).
- Implemented audio layer (`src/audio`): Google Cloud TTS adapter, size/duration validation (duration is a heuristic estimate — see `validate.js` for the documented limitation), zero-cost storage via committing to this repo and serving through jsDelivr pinned to the commit SHA.
- Implemented LINE layer (`src/line`): push adapter for Flex + Audio messages.
- Implemented orchestration (`src/core`): pipeline with per-stage structured logging, retry with backoff for transient errors, entry point supporting `RUN_MODE` and `DRY_RUN`.
- Added GitHub Actions workflows: daily 06:00 Asia/Bangkok schedule, manual test workflow with a dry-run toggle.
- Added fixtures (`sunny`, `rainy-evening` — matching the reference screenshot's weather) and a zero-dependency test suite using Node's built-in test runner (`node --test`).
- Known limitation to revisit: audio duration is estimated from script length rather than parsed from the MP3 file. Acceptable for V1; flagged for Phase 7 hardening.

## 0.1.0 — Phase 1 (prior session)
- PRD, architecture decisions, API contract, repository structure.
