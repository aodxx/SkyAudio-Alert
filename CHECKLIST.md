# SkyAudio-Alert — Production Readiness Checklist

**อัปเดต:** 2026-10-07
**สถานะรวม:** **NO-GO สำหรับ Production** — Scheduled workflow ปัจจุบันใช้ LINE TEST เท่านั้น

## ยืนยันแล้ว

- [x] ขอบเขตปัจจุบันเป็น Flood-first; พยากรณ์อากาศเป็นข้อมูลประกอบ; ไม่มี market/news ใน runtime
- [x] เมื่อน้ำใช้ยืนยันไม่ได้ ระบบระบุสถานะ `unknown`; ไม่อนุมานว่าน้ำปกติหรือเกิดน้ำท่วมจาก forecast
- [x] Gemini Content → Gemini TTS และการตรวจ MP3 ผ่าน live acceptance เมื่อ 2026-10-04 (ดู Decision 020 และ Scope Review Report)
- [x] LINE TEST run `37612281724` ส่ง Flex และ Audio ถึงกลุ่ม TEST สำเร็จ; event ยืนยัน Gemini TTS, audio validation และ LINE audio delivery ผ่าน
- [x] Flex card 4 CTA ชี้ไป `https://cctv.maholan.net/`
- [x] Scheduled workflow `.github/workflows/weather-daily.yml` ใช้ `RUN_MODE=test` และ TEST secrets เท่านั้น

### หมายเหตุผลทดสอบล่าสุด

LINE TEST run `37612281724` ส่งบทเสียงจาก `quota-safe-fallback` เนื่องจาก Gemini Content ไม่ได้ให้ผลใน run นั้น; Gemini TTS สร้าง MP3 จริงยาว **112.968 วินาที** และ LINE รับ Audio สำเร็จ ดังนั้นผลนี้ยืนยัน TTS/การส่งเสียงและ fallback path แต่ไม่ใช่การยืนยันว่า Gemini Content ตอบสำเร็จในทุก run. การทดสอบจริงของ Gemini Content → TTS เมื่อ 2026-10-04 ยังคงเป็นหลักฐาน B3 ที่บันทึกไว้.

## Gates ที่ยังต้องปิดก่อน Production

- [ ] **B1 — Flood source:** มี official ThaiWater Standard สำหรับ `A002.1 /Runoff` แต่ผู้ให้บริการเป็นผู้กำหนด Base URL; ยังไม่มี endpoint/access method และ station mapping ที่ยืนยันสำหรับพัทลุง. ต้องได้รายละเอียดจากผู้ให้บริการ หรือผู้ใช้ยอมรับอย่างชัดเจนให้ใช้ HTML source ปัจจุบันเป็นแหล่งชั่วคราว โดยคง strict parsing และ fail-closed.
- [ ] **B2 — Source failure policy:** ปัจจุบันตั้ง `unknown-weather` (แจ้งว่ายืนยันสถานการณ์น้ำล่าสุดไม่ได้และส่ง forecast ประกอบ). ต้องยืนยันว่าพฤติกรรมนี้เป็นที่ยอมรับสำหรับ Production; หากไม่ยอมรับให้เลือก `no-send`.
- [x] **B3 — Gemini contract:** live Content → TTS acceptance ผ่านแล้วตาม Decision 020; มี fallback/retry สำหรับวันที่ API มีปัญหา. Run ล่าสุดยืนยัน Gemini TTS จริง แต่ใช้ safe content fallback ตามหมายเหตุข้างต้น.
- [ ] **B4 — Documentation/test/workflow alignment:** กำลังปรับเอกสารที่ stale ให้ตรงโค้ดและหลักฐานล่าสุดใน branch นี้; ปิดเมื่อ `npm test`, `git diff --check` และ PR CI ผ่าน.
- [ ] **Human acceptance:** ผู้ใช้ตรวจ Flex บน LINE มือถือจริง, ยืนยันลำดับ Flex ก่อน Audio, กดเล่น/ฟัง Audio และยืนยันเนื้อหา/ความเหมาะสม.
- [ ] **Production schedule:** ห้ามเปิดหรือเปลี่ยน workflow ไปใช้ PROD จนกว่า B1, B2, B4 และ Human acceptance จะปิดครบ.

## หลักฐานอ้างอิง

- [Decision 020 — Gemini Live Acceptance](DECISIONS.md)
- [Phase 3 Status](docs/PHASE3_STATUS.md)
- [Scope Review Report](docs/SCOPE_REVIEW_REPORT.md)
- [LINE TEST workflow](.github/workflows/weather-test.yml)
- [Scheduled TEST workflow](.github/workflows/weather-daily.yml)

## ประวัติที่ยังมีผล

- Milestone 4A: Gemini Content + Gemini TTS live acceptance ผ่าน 2026-10-04.
- Milestone 4B: ส่ง LINE TEST สำเร็จ 2026-10-07; การทบทวนโดยมนุษย์/การเล่นเสียงบนมือถือยังไม่ยืนยัน.
- Production schedule: **NO-GO** จนกว่าจะปิด gates ด้านบน.
