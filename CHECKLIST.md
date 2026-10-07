# SkyAudio-Alert — Production Readiness Checklist

**อัปเดต:** 2026-10-07

**สถานะ:** **LIMITED-GO สำหรับ daily Production ภายใต้ Decision 028**; ยังไม่ถือว่า official flood API พร้อมใช้งาน

## ยืนยันแล้ว

- [x] Flood-first runtime; พยากรณ์อากาศเป็นข้อมูลประกอบ ไม่ใช้ยืนยันสถานการณ์น้ำ
- [x] **B2 — no-send เมื่อข้อมูลน้ำยืนยันไม่ได้:** หยุดเมื่อ fetch ล้มเหลว, freshness ไม่ใช่ `fresh`, severity เป็น `unknown` หรือไม่มีสถานีที่ตรวจสอบได้
- [x] ผู้ใช้อนุญาตข้อยกเว้นรายวัน: ใช้ HTML adapter ปัจจุบันเมื่อ flood gate ผ่าน และยอมรับว่า GitHub Actions อาจเริ่มช้า/คลาดเวลา
- [x] Daily workflow ใช้ Production secrets เฉพาะจาก schedule บน `main`; ไม่มี manual dispatch สำหรับ Production
- [x] Production ต้องมี narration, TTS, audio validation และ public audio URL พร้อมก่อนส่ง; ถ้า Audio ไม่ผ่านจะไม่ส่งทั้ง Flex และ Audio
- [x] เมื่อพร้อม ส่ง Flex+Audio ใน LINE push request เดียว เพื่อลดการส่งแบบมีแต่ Flex
- [x] One-time preview delivery: workflow run `37624288064` ตอบรับ LINE API `HTTP 200` สำหรับ 2 messages; ใช้ asset ที่ตรึง checksum ไว้

## ยังเปิด / ข้อจำกัด

- [ ] **B1 — official flood API:** ยังไม่มี official machine-readable API และ verified Phatthalung station mapping; HTML adapter เป็นข้อยกเว้นที่ผู้ใช้อนุญาตสำหรับ daily schedule เท่านั้น ไม่ได้ปิด B1
- [ ] **ความเสถียร TTS:** scheduled run ล่าสุด `37559334882` ล้มเหลวเมื่อ Gemini ตอบ `503`/TTS fetch error; ตามนโยบายปัจจุบันจะ no-send แทนการส่งข้อความไม่ครบ
- [ ] **เวลา:** ตั้ง cron `23:00 UTC` (= `06:00 Asia/Bangkok`) แต่ GitHub Actions เป็น best-effort; run ล่าสุดเริ่มราว 08:53 ICT จึงรับประกัน 06:00 ตรงเวลาไม่ได้
- [ ] **Human review:** ควรตรวจ Flex และเล่น Audio บน LINE client จริงหลังส่ง; การตอบรับ `HTTP 200` ยืนยันการรับคำขอจาก LINE API ไม่ใช่การยืนยันว่าอุปกรณ์ปลายทางเล่นเสียงแล้ว

## Production exception

อนุญาตเฉพาะ `.github/workflows/weather-daily.yml` บน `aodxx/SkyAudio-Alert` branch `main` เมื่อ event เป็น `schedule`, source URL ตรงกับ HTML adapter ที่อนุมัติ และ `FLOOD_DEGRADED_MODE=no-send`. Production config ยังคงปฏิเสธ run อื่น; exception นี้สิ้นสุดเมื่อ official API พร้อมใช้งานและผ่านการตรวจ หรือเมื่อผู้ใช้เปลี่ยนนโยบาย

รายละเอียดเงื่อนไขและเหตุผลอยู่ใน [DECISIONS.md](DECISIONS.md), Decision 027–028.
