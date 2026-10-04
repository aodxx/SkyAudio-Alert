# SkyAudio-Alert — Verification Checklist

> DOCUMENT LOCK — FLOOD-FIRST — 2026-10-04
>
> Legacy weather + market/news acceptance is historical evidence only.

## Stage 1 — Document Lock
- [x] Flood-first scope declared
- [x] Market/news removed from production requirements
- [x] Fixed 2–3 minute audio removed
- [x] Adaptive Gemini narrative recorded
- [x] Gemini TTS male/female configuration recorded
- [x] Flood-first runtime order recorded
- [x] Source-of-truth hierarchy recorded
- [x] Production remains NO-GO

## Stage 2 — Contracts
- [x] FloodSituation contract
- [x] Unknown/stale semantics
- [x] ReportDraft contract
- [x] Gemini no-fabrication validation
- [ ] Real Gemini content model verified
- [ ] Real Gemini TTS model/voice verified
- [ ] Flood source contract accepted as stable

## Stage 3 — Fixtures/tests
- [x] normal/watch/affected/critical/unknown flood fixtures
- [x] stale/source-unavailable fixtures verified against final policy
- [x] Gemini structured-output contract tests complete
- [x] male/female TTS configuration values documented and validated at config/contract level
- [x] Flex compact/button/priority tests complete
- [x] legacy market/news assertions are rejected by the current ReportDraft contract

## Stage 4 — Runtime acceptance
- [x] flood-first pipeline exists
- [x] dry-run can stop before LINE send
- [x] duplicate guard remains
- [x] real Gemini end-to-end test
- [ ] real TTS playback test
- [x] TEST LINE delivery verified
- [ ] human review of Flex + Audio

## V1.5 — Phase 0 Baseline & Design Lock
- [x] Runtime inventory locked
- [x] Flood/Weather/Gemini/Flex/TTS/LINE invariants locked
- [x] normal/watch/affected/critical/unknown/stale baseline fixtures identified
- [x] V1.5 acceptance matrix committed
- [x] V1.5 change boundary committed
- [x] Production remains NO-GO

## Stage 5 — Production gate
- [ ] B1 flood source resolved/accepted
- [ ] B2 degraded mode explicitly accepted
- [ ] B3 Gemini contract verified
- [ ] B4 docs/tests/workflows migration complete
- [ ] production schedule enabled

**Stage 3 test gate: PASS — GitHub Actions verified 35/35 tests.**

**Milestone 4A test gate: PASS — GitHub Actions verified 40/40 tests after Gemini 503 resilience changes.**

**Gemini live diagnostic:** minimal requests returned 200 for both comparison models; shaped JSON requests returned 503 `UNAVAILABLE` during high demand. The runtime now keeps structured output as the primary path and has a lightweight JSON recovery path after 503 retries.

**Current release state: NO-GO**

## Milestone 4A — Live Acceptance Update — 2026-10-04

- [x] Real Gemini content generation verified
- [x] Real Gemini TTS generation verified
- [x] Real generated audio passed MP3/duration validation
- [x] Gemini content → TTS live path verified
- [x] Gemini 503 resilience remains covered by deterministic tests
- [ ] TEST LINE acceptance — next: Milestone 4B
- [ ] Human review of Flex + Audio

### Current gates
- **Gemini live gate: PASS ✅**
- **Milestone 4A: PASS ✅**
- **Milestone 4B LINE Test: PENDING 🟡**
- **Production: NO-GO 🔴**

B1 (stable flood source) and B2 (degraded-mode acceptance) remain open. B4 documentation/test migration is being updated by this documentation milestone.


## Milestone 4B — LINE Test Acceptance — DELIVERY VERIFIED / HUMAN REVIEW PENDING

- [x] Dedicated LINE TEST workflow created
- [x] TEST destination is selected through *_TEST secrets
- [x] Workflow runs the complete flood-first pipeline with DRY_RUN=false
- [x] Gemini Content + TTS configuration included
- [x] LINE TEST delivery verified — Flex + Audio received in TEST group
- [ ] Flex rendering verified on real mobile LINE
- [ ] Audio Message playback verified
- [ ] Flex arrives before Audio
- [ ] No market/rubber/news content observed
- [ ] Unknown/degraded flood wording verified if exercised
- [ ] Human acceptance recorded

**Current result:** The latest real LINE TEST run successfully delivered both the Flex Message and Audio Message to the TEST group. Audio playback and human visual/content acceptance are still pending confirmation.

**Important:** this workflow is TEST-only. It does not authorize production and does not use PROD LINE secrets.


## V1.5 — Phase 1 Visual Design System — 2026-10-04
- [x] Five severity themes defined
- [x] Carousel/card hierarchy locked
- [x] Card 1 self-contained rule locked
- [x] Dynamic card-count rule locked
- [x] Mobile readability rules locked
- [x] Accessibility/altText rules locked
- [x] CTA scope locked
- [x] Stale/unknown treatment locked
- [x] No production runtime changed

**Phase 1: COMPLETE. Next: Phase 2 — Presentation Contract.**


## V1.5 — Phase 2 Presentation Contract — 2026-10-04
- [x] PresentationPlan contract locked
- [x] Gemini cannot change verified facts/severity
- [x] Card 1 self-contained rule locked
- [x] Critical action placement locked
- [x] Adaptive audio selection policy locked
- [x] Spoken-text safety gate defined before TTS
- [x] Deterministic fallback policy defined
- [x] No production runtime changed

**Phase 2: COMPLETE. Next: Phase 3 — Adaptive Flex Carousel.**
