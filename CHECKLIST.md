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
- [ ] stale/timeout fixtures verified against final policy
- [ ] Gemini structured-output fixtures complete
- [ ] male/female TTS configuration tests complete
- [ ] Flex compact/button/priority tests complete
- [ ] legacy market/news tests fully removed or archived

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

**Current release state: NO-GO**