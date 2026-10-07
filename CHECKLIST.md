# SkyAudio-Alert — Production Readiness Checklist

**อัปเดต:** 2026-10-07
**สถานะรวม:** **NO-GO สำหรับ Production** — ต้องมี official flood API ก่อน และมี production hard-lock ใน config

## ยืนยันแล้ว

- [x] Flood-first runtime; อากาศเป็นข้อมูลประกอบ; ไม่มี market/news ใน runtime
- [x] **B2 — no-send เมื่อยืนยันข้อมูลน้ำไม่ได้:** ผู้ใช้เลือกนโยบายนี้แล้ว. เมื่อ fetch ล้มเหลว, freshness ไม่ใช่ `fresh`, severity เป็น `unknown` หรือไม่มีสถานีที่ตรวจสอบได้ ระบบหยุดก่อน weather/Flex/TTS/LINE
- [x] **B3 — Gemini contract:** live Gemini Content → Gemini TTS/audio validation ผ่าน 2026-10-04 (Decision 020)
- [x] LINE TEST run `37612281724` ส่ง Flex และ Audio สำเร็จ; run นี้ใช้ `quota-safe-fallback` สำหรับ narration แต่ Gemini TTS สร้าง MP3 จริง 112.968 วินาทีและ LINE รับ Audio
- [x] Daily workflow ใช้ `RUN_MODE=test` และ TEST secrets เท่านั้น
- [x] `RUN_MODE=production` ถูกล็อกใน config จนกว่าจะ implement/validate official flood API adapter และ station mapping

## Gates ที่ยังเปิด

- [ ] **B1 — official flood API:** รอ provider Base URL, access method/terms และ station IDs/mapping ที่ตรวจสอบได้สำหรับพัทลุง. ThaiWater Standard ระบุ `A002.1 /Runoff` แต่ Base URL เป็นของแต่ละผู้ให้บริการ. HTML source ปัจจุบันใช้ได้เฉพาะ TEST; ยังไม่ยอมรับเป็น Production source
- [ ] **B4 — docs/tests/workflow alignment:** โค้ดและเอกสาร no-send กำลังอัปเดตใน PR นี้; ปิดเมื่อ full tests และ GitHub CI ผ่าน
- [ ] **Human acceptance:** ตรวจ Flex บน LINE มือถือจริง, ลำดับ Flex ก่อน Audio, กดเล่นเสียง และตรวจเนื้อหา
- [ ] **Production enablement:** ห้ามเปิด schedule/ส่ง PROD จนกว่า B1, B4 และ Human acceptance ปิดครบ. PROD secrets เพียงอย่างเดียวไม่ปลดล็อกการส่ง

## หลักฐานล่าสุด

- Gemini live acceptance: 2026-10-04, Decision 020
- LINE TEST delivery: run `37612281724`, 2026-10-07
- อ่านรายละเอียดที่ [Phase 3 Status](docs/PHASE3_STATUS.md), [Scope Review Report](docs/SCOPE_REVIEW_REPORT.md) และ [DECISIONS.md](DECISIONS.md)
