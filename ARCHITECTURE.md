# SkyAudio-Alert — Architecture

> 🔒 **DOCUMENT LOCK — FLOOD-FIRST — 2026-10-04**
>
> Production architecture is flood-first. Market/news are historical and are not runtime stages.

## Runtime flow

GitHub Actions → src/index.js → src/core/pipeline.js

1. src/flood/phatthalungCenter.js → FloodSituation → normalize + freshness + severity
2. src/weather/openMeteo.js → WeatherData → normalize + deterministic analysis
3. src/presentation/facts.js → FactsSnapshot → fixed four-card Flex renderer + lint
4. src/content/narrator.js → four distinct narration topics from flood/weather facts → safety firewall
5. src/audio/tts.js → one Gemini TTS call with the joined narration script
6. src/audio/validate.js → MP3 validity + ffprobe-measured 180–300 second gate; storage.js exposes a validated public HTTPS URL
7. src/line/messagingApi.js → LINE Flex first; Audio is an optional second message

## Domain boundaries

Flood is authoritative for water facts. The current Phatthalung source is a strict HTML adapter, not a guaranteed API.

Weather provides supporting forecast facts. It must never promote forecast rainfall into a confirmed flood event.

Gemini receives normalized safe facts only. It is not a source of truth and must not browse for facts.

Flex renders a deterministic four-card carousel directly from FactsSnapshot: a text-only daily-weather card, then three user-specified images with footer buttons. It does not depend on a severity-specific VisualPlan or generated narration text. Only the forecast facts on card 1 are updated dynamically; the three image assets are static repository files.

Audio narration is generated independently from the same source facts, then safety-checked, synthesized once, validated, stored and exposed. It does not consume Flex cards or their text. The measured-duration gate is 180–300 seconds inclusive. If narration, TTS, validation or storage fails, the Audio message is withheld while a lint-passed Flex remains deliverable; the run is marked degraded rather than fully successful.

LINE sends Flex first and, when available, sends Audio in a separate second request so an Audio push failure cannot undo Flex delivery. Test/dry-run validates and stores a local MP3 but never sends LINE; no public URL is expected in dry-run.

## Safety invariants

1. No unsupported factual claim reaches TTS.
2. Unknown flood data is represented as unknown, not normal.
3. Forecast does not equal observed flood.
4. Market/news content cannot enter the production report.
5. Audio failure cannot suppress a valid Flex; an audio-withheld run is visible as degraded/non-zero and is not reported as full success.
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
