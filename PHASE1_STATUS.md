# Phase Status

> **Status correction — 2026-10-03:** รายการ Phase 1/2–6 ด้านล่างคือสิ่งที่ legacy weather + market/news เคยทำได้ ไม่ใช่สถานะของ flood-first product ใหม่ ปัจจุบันอยู่ที่ pre-implementation scope review; ให้ยึด [`docs/SCOPE_REVIEW_REPORT.md`](docs/SCOPE_REVIEW_REPORT.md) และปิด B1–B4 ก่อนเริ่มรื้อ runtime

## Phase 1 — Contract-first implementation (started 2026-10-04)

- [x] Added `FloodSituation` normalization, freshness, unknown state, and validation contract
- [x] Added `ReportDraft` structured-output parser/validator for Gemini content
- [x] Added flood fixtures for normal/watch/affected/critical/unknown
- [x] Added contract tests; all tests pass
- [x] Added flood/Gemini/profile environment contract to config and `.env.example`
- [ ] Select and verify the machine-readable flood source
- [ ] Verify Gemini content/TTS model IDs and response contracts with the active API key
- [ ] Wire contracts into the pipeline after B1–B3 are resolved

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


## Phase 1 — Audio content expansion (current)
- Gemini TTS remains the primary audio channel at approximately 2–3 minutes.
- Palm and rubber latest published prices are spoken in the audio with their source date.
- Local-news headlines are fetched conservatively from the Phatthalung Provincial Public Relations Office and spoken with source attribution.
- Flex remains unchanged in this phase; compact Flex redesign is Phase 2.
- If market/news parsing fails, the system omits that section rather than inventing or repeating stale data.
