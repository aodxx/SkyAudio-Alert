# V1.5 Phase 6 — End-to-End LINE Acceptance

**Status:** implementation complete; requires real LINE TEST execution and human visual/audio sign-off. Production remains NO-GO.

## Purpose
Verify the complete production-shaped path after Phase 5:

Flood → Weather → Gemini → Presentation Plan → Safety Firewall → Flex Carousel → Gemini TTS → Audio validation/storage → LINE TEST

## Automated acceptance gates
- Pipeline reaches LINE delivery only after the Phase 5 safety gate passes.
- Flex is the first LINE message.
- Audio is the second LINE message.
- Flex uses carousel contents and flood-first Card 1.
- Card 1 is self-contained.
- Critical action is immediate.
- Unknown explicitly communicates uncertainty.
- No forbidden market/news topic reaches presentation output.
- Audio is validated as MP3 before delivery.
- Dry-run never calls LINE.
- Production duplicate guard remains unchanged.

## Human LINE TEST review
For each state, review the actual LINE message on a small Android phone and record:
- [ ] Card 1 immediately communicates flood status
- [ ] Text is readable without zoom
- [ ] Carousel swipe is obvious and usable
- [ ] No card has uncomfortable vertical height
- [ ] Critical information is not hidden only on later cards
- [ ] Buttons open the expected source
- [ ] Alt text is flood-first
- [ ] Audio starts after Flex and is understandable
- [ ] Thai pronunciation/numbers/places are acceptable
- [ ] No long silence, clipping, or obvious TTS artifact
- [ ] Audio detail is sufficient for the day's information density

## Five-state acceptance
Run/review: normal, watch, affected, critical, unknown. Also review stale data at least once.

## Evidence required before Phase 6 PASS
- GitHub Actions run succeeds.
- LINE TEST receives Flex then Audio.
- Human confirms all visual/audio checks.
- No safety failure or unexpected content.
- Acceptance evidence is recorded in this document or an attached test report.

**Important:** a successful API delivery alone is not Phase 6 PASS. Human visual/audio review is required.