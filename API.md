# SkyAudio-Alert — API & Contracts

> DOCUMENT LOCK — FLOOD-FIRST — 2026-10-04
>
> Legacy market/news API descriptions are historical and must not be implemented.

## FloodSituation
Normalized shape: status normal|watch|affected|critical|unknown; summary; stations; trend rising|falling|stable|unknown; observedAt; retrievedAt; freshness fresh|stale|unknown; source name/url.

Rules: parser failure is not normal; stale data must be marked stale; unavailable source produces explicit unknown state.

## WeatherData
Required concepts: current temperature, apparent temperature, rain/precipitation, rain probability, wind, weather code, forecast timestamps and source/retrieved time. Forecast signals are supporting context only.

## ReportDraft
Gemini structured output minimum: spokenText, shortSummary, priority normal|watch|affected|critical|unknown, actions[], factsUsed[], warnings[].

Validation rejects unsupported numbers/times/locations/events, market prices, rubber/palm content, general news, unsupported certainty and actual-flood claims derived only from forecast. Invalid generation uses deterministic safety fallback.

## Gemini configuration
Required: GEMINI_API_KEY, GEMINI_CONTENT_MODEL, GEMINI_TTS_MODEL, TTS_PROFILE, TTS_VOICE_NAME_MALE, TTS_VOICE_NAME_FEMALE. Model IDs and request/response shapes must be verified against the active key before production.

## TTS
Input is validated Thai spoken text. Output must pass supported audio format, positive duration, valid encoding, public HTTPS URL and HTTP 200/content-type verification. No fixed duration is required.

## Flex
Required: flood-first summary, freshness/update, source attribution, water-status actions, secondary weather/radar action where layout permits, compact mobile-safe structure and variants normal/watch/affected/critical/unknown.

## LINE
Delivery order: 1) Flex Message, 2) Audio Message. Test and production destinations are separate.

## Production
No production schedule may be enabled until docs/SCOPE_REVIEW_REPORT.md acceptance gates pass.


## Gemini Resilience / Live Acceptance Status — 2026-10-04

The Gemini content adapter keeps structured JSON as the preferred request. After exhausted transient 503 handling, a lightweight JSON recovery request may be attempted; recovered output is still validated by ReportDraft. This behavior is covered by deterministic tests.

Milestone 4A live acceptance has passed for Gemini Content, Gemini TTS, and generated-audio validation. LINE TEST remains the next acceptance boundary.
