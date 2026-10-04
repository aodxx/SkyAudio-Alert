# SkyAudio-Alert V1.5 — Phase 0 Baseline & Design Lock

**วันที่:** 2026-10-04  
**สถานะ:** PHASE 0 COMPLETE — baseline locked  
**Branch:** `docs/v1.5-phase0-baseline`  
**Production:** NO-GO

## 1. Purpose

Phase 0 establishes a frozen reference for the current Flood-first runtime before V1.5 presentation work begins.

The rule for the next phases is:

> **Change presentation, not the verified source facts or safety semantics.**

No production runtime behavior is changed by Phase 0.

## 2. Current runtime baseline

| Area | Current baseline | V1.5 treatment |
|---|---|---|
| Flood source | Strict server-rendered Phatthalung flood-center adapter | Keep source/normalization semantics |
| Flood contract | `FloodSituation v1.0` | Keep contract; add presentation layer later |
| Severity | normal / watch / affected / critical / unknown | Deterministic source of truth |
| Freshness | fresh / stale / unknown | Never hide stale/unknown |
| Weather | Open-Meteo + deterministic analyzer | Supporting context only |
| Report | Gemini structured narrative | Gemini presentation only; no fact invention |
| Flex | Current builder | Replace presentation architecture in Phase 3 |
| Audio | Gemini TTS + MP3 validation/storage | Detailed adaptive audio in Phase 4 |
| LINE | Flex first, Audio second | Preserve ordering |
| Dry run | Stops before LINE send | Preserve |
| Production duplicate guard | Present | Preserve |
| GitHub Actions | Test/live acceptance workflows | Preserve; extend only after design approval |
| Historical market/news | Out of production scope | Must not return |

## 3. Runtime path locked

Current production-shaped path:

`Flood → Weather → Gemini Content → Flex → Gemini TTS → Audio Validation/Storage → LINE`

The V1.5 target becomes:

`Verified Flood/Weather Facts → Presentation Plan → Flex Carousel + Detailed Audio → LINE`

The verified facts remain upstream of Gemini. Gemini cannot change flood severity, invent measurements, invent locations/roads/events, or turn forecast-only information into an actual-flood claim.

## 4. Invariants — MUST NOT REGRESS

1. **Flood-first** remains the primary report priority.
2. Weather remains supporting context.
3. Gemini is not a source of truth.
4. Forecast rain never becomes proof of actual flooding.
5. Unknown/stale conditions remain explicitly unknown/stale.
6. Flex is sent before Audio.
7. `DRY_RUN=true` never calls LINE.
8. Production duplicate guard remains active.
9. Market prices, rubber prices and general news remain outside production.
10. No PWA/chatbot/multi-village/minute-by-minute monitoring/OCR/database expansion is introduced by V1.5.
11. Audio may become more detailed, but may not become less truthful.
12. Flex may become a carousel, but Card 1 must still communicate the main situation immediately.
13. A critical fact required for understanding must not exist only on a later carousel card.
14. Color is never the sole severity signal; label/icon/text remain available.

## 5. Baseline fixtures

The locked baseline fixture set is:

### Flood states
- `fixtures/flood/normal.json`
- `fixtures/flood/watch.json`
- `fixtures/flood/affected.json`
- `fixtures/flood/critical.json`
- `fixtures/flood/unknown.json`
- `fixtures/flood/stale.json`

### Source fixtures
- `fixtures/source/chachoengsao-flood_phatthalung.html`
- `fixtures/source/chachoengsao-flood_phatthalung_weather.html`

These fixtures are deterministic test inputs. They are not claims about the live situation.

## 6. Baseline acceptance matrix

| Scenario | Flood state | Required baseline behavior | V1.5 must preserve |
|---|---|---|---|
| A | normal | Normal status is explicit | Yes |
| B | watch | Watch status is explicit | Yes |
| C | affected | Impact is explicit | Yes |
| D | critical | Critical status/action is explicit | Yes |
| E | unknown | Uncertainty is explicit | Yes |
| F | stale | Freshness limitation is explicit | Yes |
| G | forecast-only rain | Cannot establish actual flood | Yes |
| H | unsupported certainty | Must be rejected | Yes |
| I | dry run | No LINE send | Yes |
| J | real test delivery | Flex then Audio | Yes |
| K | forbidden legacy topics | Market/news content rejected | Yes |

## 7. Before-snapshot definition

The following are the Phase 0 reference surfaces:

- Flood domain contract: `src/flood/contract.js`
- Flood source adapter: `src/flood/phatthalungCenter.js`
- Report contract: `src/content/reportContract.js`
- Gemini content adapter: `src/content/geminiReport.js`
- Current Flex builder: `src/flex/builder.js`
- Gemini TTS: `src/audio/tts.js`
- Audio validation/storage: `src/audio/validate.js`, `src/audio/storage.js`
- LINE adapter: `src/line/messagingApi.js`
- Pipeline: `src/core/pipeline.js`
- Configuration: `src/config/index.js`
- Fixture acceptance: `tests/floodFirstFixtures.test.js`, `tests/source-adapters.test.js`

The baseline is the current `main` state at Phase 0 start. Runtime files above are **reference surfaces**, not permission to modify them in Phase 0.

## 8. Test gate

The latest accepted runtime baseline has:
- Stage 3 unit-test gate: **35/35 PASS**
- Gemini resilience/live acceptance test gate: **40/40 PASS**
- Gemini live acceptance: **PASS**
- LINE TEST delivery: **PASS** for both Flex and Audio

Human mobile/audio acceptance and production release gates remain open. Therefore:

> **Phase 0 complete does not mean production-ready.**

## 9. V1.5 change boundary

### Allowed from Phase 1 onward
- visual tokens
- severity themes
- short carousel cards
- presentation-plan fields
- adaptive audio selection/structure
- safety/QA for the new presentation layer
- visual/audio test fixtures

### Not allowed without a new decision
- changing flood severity rules
- changing source-of-truth semantics
- adding new external factual sources
- letting Gemini browse
- reintroducing market/news
- fixed short audio limits that remove important information
- hiding critical information behind later cards
- enabling production schedule

## 10. Phase 0 exit criteria

- [x] Runtime inventory completed
- [x] Flood/Weather/Gemini/Flex/TTS/LINE pipeline recorded
- [x] invariants locked
- [x] five severity + stale baseline fixtures identified
- [x] acceptance matrix defined
- [x] V1.5 change boundary defined
- [x] Production remains NO-GO

**Decision:** Phase 0 is complete. Phase 1 may begin only from this locked baseline.
