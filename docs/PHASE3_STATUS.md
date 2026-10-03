# Phase 3 Status — Flood-first Runtime Pipeline

**วันที่:** 2026-10-04  
**สถานะ:** Implemented and verified in local dry-run; real Gemini/LINE production send remains gated by credentials and human acceptance

## Runtime flow

```text
Flood center HTML
  → weather Open-Meteo
  → Gemini structured content (fallback only in test/dry-run without key)
  → compact flood-first Flex
  → Gemini TTS
  → audio validation/storage
  → LINE Flex + Audio
```

The production pipeline no longer imports or calls market or news modules.

## Implemented changes

`src/core/pipeline.js` now fetches and normalizes flood status first, fetches and analyzes Open-Meteo weather second, generates a validated report through `src/content/geminiReport.js`, renders the new Flex, synthesizes `report.spokenText`, validates/stores audio, and sends LINE messages. A flood-source failure uses the configured `FLOOD_DEGRADED_MODE=unknown-weather` behavior and never turns missing data into normal conditions.

`src/flex/components.js` and `src/flex/builder.js` now render a compact flood-first card. The card shows flood severity, summary, station highlights, freshness, weather context, and the three approved user-facing actions. The weather action is omitted in the critical compact variant so water actions remain primary.

Market/news source directories, fixed Thai market/news script, and their legacy tests were removed from the runtime repository. Workflows no longer install OCR or pass market/news-oriented TTS instructions.

## Gemini behavior

With `GEMINI_API_KEY` and `GEMINI_CONTENT_MODEL`, the content adapter requests JSON structured output and validates it through `ReportDraft`. In local test/dry-run mode without a key, it uses a deterministic flood/weather safety fallback. Production without a Gemini key fails at `content.generate` rather than silently using fallback content.

`GEMINI_TTS_MODEL` and the selected voice profile are used by the existing Gemini TTS adapter. `TTS_PROVIDER=mock` is available only as a local/CI dry-run aid and reads an existing MP3; it is not a production provider.

## Verification

The test suite passes **17/17** tests. A read-only end-to-end dry-run against the live flood center and Open-Meteo completed all stages through `line.send: skipped` without calling LINE. The run observed 6 flood stations, aggregate severity `watch`, fresh station data, generated a 302-character fallback report, validated MP3 audio, and did not commit audio because `DRY_RUN=true`.

## Remaining release gates

| Gate | Status |
|---|---|
| Flood source adapter and freshness | Implemented; HTML source remains structurally brittle |
| Open-Meteo weather | Implemented |
| Gemini content model ID/API key | Must be configured and verified |
| Gemini TTS model/voice | Must be configured and verified with real API response |
| Flex JSON and local tests | Passed |
| LINE test-group delivery | Pending real credentials and human review |
| Production schedule | Must remain gated until Gemini + LINE acceptance passes |
