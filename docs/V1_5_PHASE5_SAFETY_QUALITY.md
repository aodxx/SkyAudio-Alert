# V1.5 Phase 5 — Safety + Quality Firewall
**Status:** implementation complete on feature branch; production remains NO-GO.

## Goal
Final deterministic firewall after Gemini Presentation Planning and before TTS/LINE.

`verified flood/weather facts → Gemini narrative/presentation → safety firewall → Flex/TTS → LINE`

## Safety gates
- Reject unsupported certainty.
- Reject market/news leakage.
- Forecast-only language cannot establish actual flooding.
- Generated numeric facts must exist in supplied verified facts.
- Presentation severity must equal deterministic flood severity.
- `factsUsed` must be present for traceability.
- Any safety failure stops before TTS and LINE.

## Quality score
Diagnostic checks: flood visibility, freshness, action clarity, source visibility, compactness, carousel completeness, accessibility, audio consistency, audio sufficiency, weather context. The score never overrides safety.

## Regression matrix
Firewall tests cover all five severities and fresh/unknown conditions plus long-text, no-weather and safety-negative cases. Existing unit tests remain required.

## Exit criteria
- [x] no-fabrication/certainty firewall
- [x] severity consistency
- [x] stale/unknown coverage
- [x] quality score separated from safety
- [x] regression tests
- [ ] Phase 6 real LINE visual/audio acceptance