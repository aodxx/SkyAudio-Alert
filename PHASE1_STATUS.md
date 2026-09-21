# Phase Status

## Phase 1 — Foundation (done)
PRD, repository structure, decisions, API contract.

## Phase 2–6 — Implemented this session
- Weather engine (fetch, normalize, WMO codes, deterministic analyzer)
- Forecast layer (advice sentences, Thai TTS script, hourly-slot formatter)
- Flex engine (theme palette, components, full bubble builder)
- Audio (Google Cloud TTS adapter, validation, zero-cost storage via repo + jsDelivr)
- LINE adapter (push Flex + Audio)
- Core orchestration (pipeline, retry, structured logger, entry point)
- GitHub Actions: daily 06:00 Asia/Bangkok schedule + manual test workflow with dry-run
- Fixtures (sunny, rainy-evening) + zero-dependency test suite (`node --test`), all passing

## Next — Phase 7/8
- Replace the audio-duration heuristic in `src/audio/validate.js` with exact MP3 frame parsing.
- Run the manual test workflow against real test LINE credentials + a real Google TTS key.
- Watch a few real daily runs in test mode before switching `LINE_GROUP_ID_PROD` to the real group.
- Optional later: multiple villages/groups, rain-nowcasting, LLM rewriting layer with deterministic fallback (PRD section 25).
