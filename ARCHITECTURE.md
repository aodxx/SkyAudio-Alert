# SkyAudio-Alert — Architecture

> 🔒 **DOCUMENT LOCK — FLOOD-FIRST — 2026-10-04**
>
> Production architecture is flood-first. Market/news are historical and are not runtime stages.

## Runtime flow

GitHub Actions → src/index.js → src/core/pipeline.js

1. src/flood/phatthalungCenter.js → FloodSituation → normalize + freshness + severity
2. src/weather/openMeteo.js → WeatherData → normalize + deterministic analysis
3. src/presentation/facts.js → FactsSnapshot → src/presentation/visualPlan.js → Flex V2 + lint
4. src/content/narrator.js → narration from flood/weather facts → safety firewall
5. src/audio/tts.js → Gemini TTS audio
6. src/audio/validate.js + storage.js → validated public HTTPS audio URL
7. src/line/messagingApi.js → LINE Flex → LINE Audio

## Domain boundaries

Flood is authoritative for water facts. The current Phatthalung source is a strict HTML adapter, not a guaranteed API.

Weather provides supporting forecast facts. It must never promote forecast rainfall into a confirmed flood event.

Gemini receives normalized safe facts only. It is not a source of truth and must not browse for facts.

Flex renders a deterministic flood-first visual brief directly from verified fact IDs; it does not consume generated narration text.

Audio narration is generated independently from the same source facts, then safety-checked, synthesized, validated, stored and exposed. It does not consume Flex cards or their text. The current measured-duration gate is >600 seconds.

LINE sends Flex first and Audio second.

## Safety invariants

1. No unsupported factual claim reaches TTS.
2. Unknown flood data is represented as unknown, not normal.
3. Forecast does not equal observed flood.
4. Market/news content cannot enter the production report.
5. Production success is not recorded if a required stage fails.
6. Test/dry-run must not send LINE.
7. Unsafe narration is replaced by a deterministic safe fallback or stopped before TTS.

## External services

| Service | Role |
|---|---|
| Flood source | Primary water facts |
| Open-Meteo | Supporting weather forecast |
| Gemini | Narrative + TTS |
| GitHub Actions | Scheduler/runner |
| LINE Messaging API | Delivery |
| jsDelivr/repository | Audio hosting if current storage adapter remains selected |

Provider adapters isolate external API details from domain logic.


## Acceptance Status — 2026-10-04

The live Gemini Content → Gemini TTS path has passed Milestone 4A. The architecture therefore treats Gemini live generation as an accepted runtime dependency for the next test stage, while preserving Gemini as a narrative layer only.

Next validation boundary is LINE delivery: Flex rendering, public audio URL accessibility, Audio Message playback, and delivery ordering. Production remains gated until those checks pass.
