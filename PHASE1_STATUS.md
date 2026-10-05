# Phase Status — Flood-first

> DOCUMENT LOCK — 2026-10-04
>
> Legacy Phase entries are historical only.

## Phase 1 — Document Lock
- [x] Flood-first + supporting weather scope
- [x] Market/news explicitly out of production scope
- [x] Adaptive Gemini narrative replaces fixed script/duration
- [x] Gemini TTS male/female configuration
- [x] Production pipeline order
- [x] Acceptance gates
- [x] Production schedule remains NO-GO

## Phase 2 — Contracts
- [x] FloodSituation contract
- [x] Flood unknown/freshness semantics
- [x] Gemini ReportDraft contract
- [x] deterministic validation/fallback
- [x] flood fixtures
- [ ] final stable flood source contract

## Phase 3 — Runtime
- [x] flood -> weather -> Gemini content -> Flex -> Gemini TTS -> LINE runtime
- [x] market/news imports removed from runtime
- [x] dry-run path
- [x] duplicate guard
- [ ] real Gemini acceptance
- [ ] TEST LINE acceptance

## Phase 4 — Production
- [ ] B1 resolved/accepted
- [ ] B2 resolved/accepted
- [ ] B3 resolved/accepted
- [ ] B4 resolved/accepted
- [ ] production schedule enabled

**Current release state: NO-GO**

## Milestone 4A / Current Status — 2026-10-04

- [x] Real Gemini content acceptance
- [x] Real Gemini TTS acceptance
- [x] Generated audio validation
- [ ] TEST LINE acceptance — Milestone 4B
- [ ] Human Flex + Audio review

**Current release state: NO-GO**. Gemini live acceptance and real TEST LINE delivery are complete; human Flex/audio review and remaining flood/release gates are still open.


## Milestone 4B Delivery Update — 2026-10-04

- Real Flood-first pipeline reached the LINE TEST send stage.
- Flex Message was delivered to the TEST group.
- Audio Message was delivered to the TEST group.
- **Delivery gate: PASS ✅**
- Audio playback, mobile rendering/content review, and human acceptance remain pending.


## V1.5 — Phase 0 Baseline & Design Lock — 2026-10-04

- [x] Runtime inventory completed
- [x] Invariants locked
- [x] Five severity + stale baseline fixtures identified
- [x] Acceptance matrix committed
- [x] V1.5 change boundary committed
- [x] Phase 0 complete

**Reference:** `docs/V1_5_PHASE0_BASELINE.md`

**Production: NO-GO.** Phase 1 requires explicit review of the locked baseline before implementation begins.


## V1.5 — Phase 1 Visual Design System — 2026-10-04
- [x] Visual tokens defined
- [x] Five severity themes defined
- [x] Carousel/card hierarchy defined
- [x] Mobile/accessibility rules defined
- [x] CTA scope locked
- [x] Stale/unknown treatment defined
- [x] Phase 1 complete

**Reference:** `docs/V1_5_PHASE1_VISUAL_SYSTEM.md`

**Production: NO-GO.** Phase 2 requires review of this visual system before presentation-contract implementation.


## V1.5 — Phase 2 Presentation Contract — 2026-10-04
- [x] PresentationPlan 1.0 documented
- [x] Gemini presentation-only boundary locked
- [x] Adaptive audio freedom preserved
- [x] Flex Card 1 and carousel safety rules encoded
- [x] Severity/stale/unknown validation rules encoded
- [x] Runtime behavior unchanged

**Phase 2: COMPLETE. Next: Phase 3 — Adaptive Flex Carousel.**


## V1.5 — Phase 5 Safety + Quality Firewall — 2026-10-04
- [x] Deterministic safety firewall before TTS/LINE
- [x] Unsupported certainty and forbidden topic rejection
- [x] Forecast-only flood-claim protection
- [x] Generated numeric fact leakage detection
- [x] Severity consistency gate
- [x] factsUsed trace requirement
- [x] Internal quality score separated from safety authorization
- [x] Phase 5 regression tests
- [x] PR #17 merged to main

**Phase 5: COMPLETE. Next: Phase 6 — End-to-End LINE Acceptance.**
**Production remains NO-GO.**


## Runtime Simplification — 2026-10-05

- [x] Removed the shared PresentationPlan runtime contract.
- [x] Flex renders directly from verified FactsSnapshot, independently of narration; the former severity-specific VisualPlan runtime was removed in the later four-card refactor.
- [x] Narration is generated independently and safety-checked before TTS.
- [x] Kept the ten-section narration and measured >600-second audio gate unchanged.
- [x] Preserved Flex-first then Audio LINE ordering and DRY_RUN behavior.
- [x] Added pipeline integration coverage for separation and safety fallback.
- [ ] Human review of Flex/audio and remaining release gates.

**Production remains NO-GO.** The compact-card visual details were subsequently set by Decision 024 below.

## Flex Four-Card Layout — 2026-10-05

- [x] Replaced the severity-driven visual plan renderer with a fixed four-card carousel.
- [x] Card 1 is image-free and displays the date, community hall, and available forecast by time band.
- [x] Cards 2–4 use the requested image assets and each has its own allow-listed footer button.
- [x] Added structural lint and regression tests for card count, order, assets, buttons, and missing forecast data.
- [ ] Human review in LINE mobile client.

**Known asset caveat:** the user approved the provided CCTV image even though the infographic labels locations outside Phatthalung; the repository images are static and are not refreshed by the weather/flood adapters. Production remains NO-GO pending existing release gates and human review.
