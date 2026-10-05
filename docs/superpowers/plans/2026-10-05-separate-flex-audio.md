# แผนแยก Flex และเสียงให้เรียบง่าย — Implementation Plan

> **For agentic workers:** ทำตามรายการนี้แบบ inline ทีละส่วน พร้อมทดสอบทุกขอบเขต ไม่เปลี่ยนรูปแบบการ์ดสุดท้ายก่อนผู้ใช้ให้รายละเอียด

**Goal:** ถอด `PresentationPlan` ที่รวมการ์ดและเสียงไว้ด้วยกันออกจาก runtime โดยให้ Flex และ narration สร้างแยกจากข้อเท็จจริงที่ยืนยันแล้ว

**Architecture:** Flex คงใช้ `FactsSnapshot → VisualPlan → Flex V2 → lint` ตามเดิม ส่วนเสียงเรียก narrator โดยตรงจาก flood/weather facts และผ่าน safety firewall ก่อน TTS ไม่มีข้อความหรือการ์ดที่แชร์ข้ามช่องทาง

**Tech Stack:** Node.js CommonJS, `node:test`, LINE Flex, Gemini TTS/Content ที่ตั้งค่าปัจจุบัน

**Spec:** คำขอผู้ใช้วันที่ 2026-10-05; ข้อกำหนดด้านความปลอดภัยและความยาวเสียงที่ยังใช้อยู่ใน `DECISIONS.md` Decision 022

## Global Constraints

- Flood severity มาจาก flood adapter เท่านั้น.
- Flex แสดง dynamic values จาก `FactsSnapshot` เท่านั้น.
- Generated narration ต้องผ่าน `safetyFirewall` ก่อนเข้า TTS.
- คง duration gate > 600 วินาที, delivery order และ production NO-GO.
- ไม่เปลี่ยนเนื้อหา/จำนวน/ลำดับการ์ดที่ผู้ใช้ยังไม่ได้กำหนดรายละเอียด.
- ไม่เปลี่ยน schedule, secrets, external workflows หรือ LINE destination.

---

### Task 1: ย้าย narration ออกจาก Presentation Planner

**Files:**
- Create/rename: `src/content/narrator.js`
- Remove after migration: `src/content/presentationPlanner.js`
- Remove after migration: `src/content/presentationContract.js`
- Modify: `tests/presentationPlanner.test.js` → `tests/narrator.test.js`
- Remove obsolete tests: `tests/presentationContract.test.js`

**Interfaces:**
- `generateLongFormNarration(context, config, opts)` รับ verified `floodSituation`, `weatherAnalysis`, `location`, `date` และ `factsSnapshot` เท่านั้น; ไม่มี presentation/card plan.
- `buildQuotaSafeLongFormNarration(context)` สร้าง fallback จาก facts/context ที่ตรวจสอบแล้ว ไม่อ้าง report หรือ presentation plan.
- คง schema, 10 sections, ≥7,000 ตัวอักษร และ safety-aware fallback ตามนโยบายปัจจุบัน.

- [x] เพิ่ม tests ให้ narrator ทำงานโดยไม่มี shared plan และยังผ่าน quota fallback.
- [x] ตรวจว่า narrator ไม่ import/รับ PresentationPlan.
- [x] แยก implementation และใช้ flood facts จาก context ใน deterministic fallback.
- [x] รัน `node --test tests/narrator.test.js` — 8 tests ผ่าน.

### Task 2: ลด pipeline ให้แยกช่องทาง

**Files:**
- Modify: `src/core/pipeline.js`
- Modify: `tests/pipeline-core.test.js` และ `tests/contracts.test.js` ตาม stage/result ที่เปลี่ยน

**Interfaces:**
- Flex ใช้ `FactsSnapshot` และ `VisualPlan` โดยตรงตามปัจจุบัน.
- Narrator รับเฉพาะ source context; firewall ตรวจ `spokenText`, sections, severity และ verified fact IDs ก่อน TTS.
- ตัด runtime stages `content.generate` และ `content.presentation`; เก็บ `content.narration`.
- ไม่คืน `presentationPlan` หรือ `reportData` ที่ไม่ถูกใช้ใน delivery.

- [x] เพิ่ม integration assertions ยืนยันว่า Flex และ audio ถูกสร้างโดยไม่แชร์ PresentationPlan.
- [x] ยืนยัน Flex lint, narration firewall, audio validation และ DRY_RUN behavior.
- [x] ตัด report/presentation Gemini round trips และผลลัพธ์ runtime ที่ซ้ำซ้อน.
- [x] รัน pipeline integration tests — 2 tests ผ่าน.

### Task 3: เก็บกวาดโค้ดที่ไม่ถูกใช้และอัปเดตเอกสาร

**Files:**
- Remove if still unreferenced: `src/presentation/narrationPlan.js`, `src/presentation/explainers/th.js`, `tests/narrationPlan.test.js`.
- Modify: `ARCHITECTURE.md`, `DECISIONS.md`, `README.md`, `PHASE1_STATUS.md`.
- Modify: `docs/superpowers/plans/2026-10-05-separate-flex-audio.md`.

**Interfaces:**
- Architecture describes separate deterministic Flex and source-fact narration paths.
- New decision records the 2026-10-05 refactor without changing the remaining 10-minute audio gate or final card design.
- Historical design documents remain historical; do not rewrite their previous acceptance records.

- [x] ตรวจ references และลบ shared PresentationPlan/NarrationPlan builder และ tests ที่มีไว้ทดสอบ abstraction เดิม.
- [x] อัปเดต README, PRD, Architecture, Decision Record, phase status และ package description.
- [x] รัน final `npm test` — 116 tests ผ่าน; `git diff --check` ผ่าน; ตรวจ references ใน runtime แล้ว.
- [ ] Commit และ merge ตาม workflow ของ repository หลังตรวจสถานะ branch/CI.
