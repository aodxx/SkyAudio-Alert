# SkyAudio-Alert — Current Context

**อัปเดต:** 2026-10-07

## Product

น้องจุ่นจ้านรายงานสถานการณ์น้ำของบ้านลำพายเป็นหลัก โดยใช้พยากรณ์อากาศเป็นข้อมูลประกอบ; Gemini มีหน้าที่เรียบเรียง ไม่ใช่แหล่งข้อเท็จจริง. เสียงพูดมีความยาวตามข้อมูล ไม่ยืดซ้ำ และสร้างด้วย Gemini TTS.

## Runtime and delivery

ระบบสร้าง Flex สี่การ์ดและ Audio แยกจากกัน ตรวจ facts/safety ก่อน TTS และวัด MP3 จริงก่อนส่ง. LINE TEST run `37612281724` ส่ง Flex และ Audio สำเร็จ; ใน run นั้น narration ใช้ safe fallback ขณะที่ Gemini TTS สร้าง MP3 จริงและ LINE รับ Audio ได้. ผู้ใช้ยังต้องตรวจการแสดงผลและกดเล่นบน LINE client จริง.

`weather-daily.yml` ตั้ง `RUN_MODE=test` และใช้ TEST secrets เท่านั้น. **Production schedule/destination ยังไม่เปิดใช้งาน.**

## Current release gates

| Gate | สถานะ |
|---|---|
| B1 — Flood source contract | **OPEN:** ThaiWater Standard มีสัญญา `A002.1 /Runoff`, แต่ยังไม่มี provider Base URL/access method และ station mapping ที่ยืนยันสำหรับพัทลุง; HTML adapter ปัจจุบันเป็นชั่วคราว |
| B2 — Source failure behavior | **รอยืนยัน:** ปัจจุบันใช้ `unknown-weather`; ต้องยืนยันว่า Production ควรส่งข้อความว่ายังยืนยันสถานการณ์น้ำไม่ได้พร้อม forecast หรือเลือก `no-send` |
| B3 — Gemini contract | **PASS:** live Gemini Content → TTS acceptance บันทึกไว้ 2026-10-04; run ล่าสุดยืนยัน TTS/Audio และ fallback path |
| B4 — Docs/tests/workflows | **กำลังปิด:** เอกสารหลักกำลังจัดให้ตรงกับโค้ดและผลทดสอบ; ต้องผ่าน full tests และ PR CI |
| Human review | **PENDING:** ตรวจ Flex, ลำดับ Flex ก่อน Audio, playback และเนื้อหาใน LINE client |

ห้ามเปิด Production จนกว่า B1, B2, B4 และ Human review จะปิดครบ. รายละเอียดที่มีผลต่อการตัดสินใจอยู่ใน [CHECKLIST.md](CHECKLIST.md), [Phase 3 Status](docs/PHASE3_STATUS.md), [Scope Review Report](docs/SCOPE_REVIEW_REPORT.md) และ [DECISIONS.md](DECISIONS.md).
