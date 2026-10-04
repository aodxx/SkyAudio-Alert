# V1.5 Phase 4 — Gemini Presentation Planner & Adaptive Audio

## Status
Implementation complete on feature branch; production remains NO-GO pending review.

## Runtime
Verified flood/weather facts -> Gemini narrative -> Gemini Presentation Planner -> validated PresentationPlan -> Adaptive Flex + Gemini TTS.

The planner may choose emphasis, ordering, wording, card count and audio detail, but it cannot change verified flood severity or introduce facts.

## Audio
- No fixed duration target or short cap.
- Detail level is adaptive: standard/detailed/high.
- TTS receives planner-selected tone, pacing, detail and emphasis.
- The final spokenText is the exact validated script sent to TTS.
- Existing MP3 validation and LINE audio delivery remain unchanged.

## Safety
- Severity/priority/visualVariant must equal the verified flood severity.
- Card 1 must be self-contained.
- Critical action must be on Card 1.
- Unknown must explicitly disclose uncertainty.
- Forbidden market/news topics and unsupported certainty are rejected.
- Weather remains supporting context; rain forecast cannot establish flooding.
- Planner failure must not silently fabricate data; deterministic fallback preserves verified facts.

## Acceptance
- PresentationPlan contract tests cover all five states and safety failures.
- Planner runtime tests verify successful Gemini output and severity-drift rejection.
- Existing Node CI and Phase 3 tests must remain green.
