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
- [ ] real Gemini end-to-end test
- [ ] real TTS playback test
- [ ] TEST LINE acceptance
- [ ] human review of Flex + Audio

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