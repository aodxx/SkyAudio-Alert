# V1.6 P1 Foundation Implementation Plan

> **ผู้ปฏิบัติงาน:** ทำทีละ task ตาม checkbox และทดสอบก่อน/หลังทุกโมดูล

**Goal:** เพิ่ม pure contracts สำหรับ facts, visual layout และ narration ตลอดจนคลัง explainer เวอร์ชันร่าง โดยยังไม่เปลี่ยนพฤติกรรม production

**Architecture:** `buildFactsSnapshot()` แปลง normalized flood/weather/location เป็น facts ที่มี stable IDs และ allow-list; `buildVisualPlan()` และ `buildNarrationPlan()` อ้างอิง facts ด้วย ID เท่านั้น โมดูลทั้งหมดเป็น deterministic และไม่มีการเรียก Gemini, Flex renderer, TTS หรือ pipeline

**Tech Stack:** Node.js CommonJS, `node:test`, fixtures ปัจจุบันใน `fixtures/flood/*.json`; ไม่มี dependency ใหม่

**Spec:** `REVIEW_V1_6_PRESENTATION_REDESIGN.md` (sections F, H, I, J1; Implementation Plan P1)

## Global Constraints

- Severity มีค่า `normal`, `watch`, `affected`, `critical`, `unknown` และมาจาก FloodSituation ที่ normalize แล้วเท่านั้น
- ไม่อนุมานน้ำท่วมจาก weather; ไม่แต่งตัวเลข/ชื่อสถานี/ถนน/พื้นที่/เวลา
- P1 เป็น contract/foundation เท่านั้น: ห้ามต่อเข้า `src/core/pipeline.js`, Flex runtime, Gemini/TTS หรือ production workflow
- Narration มี 10 segments; target ตามแบบ 45/90/120/75/60/90/75/105/60/45 วินาที รวม 765 วินาที; duration จริงจะวัดใน P4 ไม่ใช่ P1
- Explainer library ต้องมี version และ `pending_community_review`; ไม่มีการอ้างว่าเนื้อหาผ่านอนุมัติหรือพร้อม production
- ใช้หก flood fixtures ที่มีอยู่: normal, watch, affected, critical, unknown, stale
- ห้ามเพิ่ม dependencies หรือ secrets

---

## File map

- Create `src/presentation/facts.js`: snapshot, stable fact IDs, Thai numeric/time spoken forms, allow-list helpers.
- Create `src/presentation/visualPlan.js`: typed deterministic card slots, state-aware card order, structural/text-budget validator.
- Create `src/presentation/narrationPlan.js`: 10-segment plan, conditional segment 5, allowed fact/explainer IDs, fixed target allocation, validator.
- Create `src/presentation/explainers/th.js`: versioned Thai static explainers, each marked pending community review.
- Create `tests/factsSnapshot.test.js`, `tests/visualPlan.test.js`, `tests/narrationPlan.test.js`: unit tests plus the six existing flood fixtures.
- Create this plan file only; do not edit existing runtime modules.

## Interfaces

`buildFactsSnapshot({ floodSituation, weatherAnalysis, location = {}, dateInfo = {} })` returns a JSON-serializable object:

```js
{
  schemaVersion: '1.0',
  severity: 'normal|watch|affected|critical|unknown',
  facts: {
    'flood.severity': { id, kind, value, displayValue, spokenForms },
    // Additional fact records exist only when their source values are present.
  },
  factIds: ['flood.severity', ...],
  allowList: ['...', '...']
}
```

Fact IDs use dot paths and stable zero-based indexes, e.g. `flood.station.0.name`, `flood.affectedArea.0`, `flood.road.0`, `flood.action.0`, `weather.current.temperature`, `weather.daily.rainProbabilityMax`. URI facts may be represented for future CTAs but must have empty `spokenForms` and must not enter the narration allow-list. Export `getFact(snapshot, id)`, `getAllowedFactIds(snapshot)`, and `toThaiNumberWords(value)`.

`buildVisualPlan(snapshot)` returns `{schemaVersion:'1.0', severity, cards}`. Each card has `{id, role, heading, slots, microcopy}`; slots contain only fact-ID references (no generated facts). Export `validateVisualPlan(plan, snapshot)` returning an array of errors. Enforce at most 5 cards, heading ≤ 40 Unicode code points, microcopy ≤ 80, unique card IDs, known role names, known fact references, a hero card, matching severity, and an explicit uncertainty card for `unknown`.

`buildNarrationPlan(snapshot)` returns `{schemaVersion:'1.0', severity, targetDurationSeconds:765, minimumDurationSeconds:601, maximumDurationSeconds:1080, snapshotFactIds, segments}`. Each segment has `{id, purpose, allowedFactIds, explainerIds, targetSeconds, tone}`. Segment 5 uses a non-impact/verification substitute when no verified impact area or road exists. Export `validateNarrationPlan(plan, snapshot)` returning an array of errors; require the exact ten ordered segments and target allocations, all facts and explainers to exist, and segment 5 to select its evidence-based branch. Duration thresholds describe the plan only; P4 must measure the generated audio.

`src/presentation/explainers/th.js` exports `EXPLAINER_LIBRARY_VERSION`, `REVIEW_STATUS`, `EXPLAINERS`, and `getExplainer(id)`. Every entry contains `{id, text, category, reviewStatus}`; all entries use `pending_community_review`, contain no daily/local facts, and make no guaranteed-safety or actual-flood claims.

## Task 1: FactsSnapshot

**Files:** create `src/presentation/facts.js`, create `tests/factsSnapshot.test.js`.

- [x] Add tests using each of the six existing fixtures after `normalizeFloodSituation()`: snapshot severity is preserved; unknown does not become normal; stale keeps its original severity; facts only come from structured properties.
- [x] Add tests for stable IDs, omitted absent values, unique allow-list, station/road/area/time and Thai-digit/numeric spoken forms; URI spoken forms are empty.
- [x] Run `node --test tests/factsSnapshot.test.js` and verify new tests fail before implementation.
- [x] Implement the three exported helpers and typed facts. Use null-safe finite-number checks; never mine numbers or names from `summary` prose.
- [x] Run the focused test, then `npm test`; fix only failures caused by this change.

## Task 2: Versioned Thai explainer library and NarrationPlan

**Files:** create `src/presentation/explainers/th.js`, create `src/presentation/narrationPlan.js`, create `tests/narrationPlan.test.js`.

- [x] Test library version/review status, stable explainer IDs, rejection of unknown IDs, and absence of URL/daily station names in static text.
- [x] Test exactly 10 ordered segments, 765-second target, `maximumDurationSeconds:1080`, segment fact-ID references, explainer references, and segment-5 substitution with/without impacts.
- [x] Run `node --test tests/narrationPlan.test.js` and verify new tests fail before implementation.
- [x] Implement reusable explainers for opening, severity meanings, rain forecast vs actual flood evidence, reading distance-to-bank only where the source provides it, source/CCTV limitations, preparedness reminders, recap and closing. Mark all text pending community review; for evacuation/urgent response defer to current official announcements.
- [x] Implement planner and validator with the exact interfaces above; do not synthesize narration text or claim the target duration is measured.
- [x] Run focused test and `npm test`.

## Task 3: Typed VisualPlan

**Files:** create `src/presentation/visualPlan.js`, create `tests/visualPlan.test.js`.

- [x] Test all five severity plans plus the stale fixture; test optional weather/station/impact facts, unique role-aware cards, fact-only slots and text budgets.
- [x] Test unknown has no normal severity token and has explicit uncertainty; critical hero references an available action when actions exist.
- [x] Run `node --test tests/visualPlan.test.js` and verify new tests fail before implementation.
- [x] Implement deterministic card order: hero first; optional stations/impact; actions where present; optional weather; source/uncertainty context. Cards reference facts by ID and use only short static headings/microcopy.
- [x] Implement validator; invalid missing refs, duplicate IDs, over-budget strings, mismatched severity, unknown normal treatment, and oversized card arrays must return errors (no silent truncation).
- [x] Run focused test and `npm test`.

## Final P1 verification

- [x] Run `npm test`; expected all existing and new tests pass.
- [x] Run `git diff --check` and inspect changed paths; expected only the new plan and `src/presentation/**` plus their tests.
- [x] Verify `git diff --name-only main` does not include `src/core/pipeline.js`, `src/flex/**`, `src/audio/**`, `.github/workflows/**`, or secrets.
- [x] Keep P1 on a feature branch/PR. Merge only after CI passes; do not run or enable production delivery.

## Self-review

- Spec coverage: FactsSnapshot/allow-list and spoken forms → Task 1; explainers and ten-segment plans → Task 2; typed deterministic visual slots and text-budget lint → Task 3; six existing fixtures reused across tests; production restrictions verified at the end.
- No placeholders: each task gives named files, exported interfaces, edge cases and exact test commands.
- Type consistency: `buildFactsSnapshot()` feeds both planners; `getFact()` and `getAllowedFactIds()` are shared helpers; narration validator checks `EXPLAINERS` IDs from the named module; visual/narration validators return error arrays.
