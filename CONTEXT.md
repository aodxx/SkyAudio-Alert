# SkyAudio-Alert — Current Context

**อัปเดต:** 2026-10-07

## Product and delivery

น้องจุ่นจ้านรายงานสถานการณ์น้ำของบ้านลำพายเป็นหลัก โดยใช้พยากรณ์อากาศเป็นข้อมูลประกอบ; Gemini ช่วยเรียบเรียงแต่ไม่ใช่แหล่งข้อเท็จจริง. Flex และ Audio แยก pipeline กัน และ Audio ใช้ความยาวตามข้อมูลจริง.

LINE TEST run `37612281724` ส่ง Flex และ Audio สำเร็จ; narration ใน run นั้นใช้ safe fallback ขณะที่ Gemini TTS สร้าง MP3 112.968 วินาทีและ LINE รับ Audio ได้. ยังต้องตรวจ Flex และกดเล่นเสียงบน LINE client จริง.

## Source and failure policy

ผู้ใช้เลือก **รอ official flood API และ no-send**. เมื่อ flood fetch ล้มเหลว, ข้อมูล stale/unknown หรือไม่มี station readings ที่ตรวจสอบได้ ให้หยุดก่อน weather/Flex/TTS/LINE; ห้ามส่งรายงานอากาศอย่างเดียวแทนรายงานน้ำ.

ThaiWater Standard กำหนด `A002.1 /Runoff`, แต่ Base URL/access method และรหัสสถานีพัทลุงต้องได้จาก provider. HTML adapter ปัจจุบันคงไว้สำหรับ TEST เท่านั้นและไม่ใช่ Production source ที่ยอมรับ.

## Current release gates

| Gate | สถานะ |
|---|---|
| B1 — Official flood API | **OPEN:** รอ provider Base URL, access method/terms และ station IDs/mapping; Production ถูกล็อกใน config ระหว่างนี้ |
| B2 — Source failure policy | **PASS:** ผู้ใช้ยืนยัน `no-send`; workflow/default จะใช้ค่านี้และ gate stale/unknown ก่อนส่ง |
| B3 — Gemini contract | **PASS:** live Gemini Content → TTS acceptance บันทึกไว้ 2026-10-04; LINE TEST run ล่าสุดยืนยัน TTS/Audio และ fallback path |
| B4 — Docs/tests/workflows | **กำลังปิด:** no-send code/workflows/docs อยู่ใน PR ที่ต้องผ่าน full tests และ CI |
| Human review | **PENDING:** ตรวจ Flex, ลำดับข้อความ และ Audio playback ใน LINE มือถือ |

`weather-daily.yml` ยังตั้ง `RUN_MODE=test` และใช้ TEST secrets. **Production ยัง NO-GO** จน B1, B4 และ Human review ผ่าน; การตั้ง PROD secrets ไม่ได้เปิด workflow.

รายละเอียด: [CHECKLIST.md](CHECKLIST.md), [Phase 3 Status](docs/PHASE3_STATUS.md), [Scope Review Report](docs/SCOPE_REVIEW_REPORT.md), [DECISIONS.md](DECISIONS.md).
