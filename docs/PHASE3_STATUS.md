# Phase 3 Status — Flood-first Runtime & Release Readiness

**อัปเดต:** 2026-10-07
**สถานะ:** Runtime ทำงานถึง LINE TEST ได้; **Production ยัง NO-GO**

## Runtime ปัจจุบัน

```text
Flood source → normalize/freshness/severity → Open-Meteo supporting weather
→ verified facts → { fixed four-card Flex, independent four-topic narration }
→ safety validation → Gemini TTS → ffprobe/audio storage
→ LINE Flex push → optional LINE Audio push
```

- Gemini เป็นผู้ช่วยเรียบเรียงเท่านั้น ไม่ใช่แหล่งข้อเท็จจริง; output ผ่าน validator/firewall ก่อน TTS.
- ความยาวเสียงเป็นไปตามข้อมูล ไม่ยืดบท; validator ใช้ MP3 ที่วัดจริงด้วย `ffprobe` (10 วินาที–5 นาที, ไม่เกิน 16 MiB).
- เมื่อ narration/TTS/audio delivery ล้มเหลว ให้ส่ง Flex ที่ผ่าน lint ได้โดยลำพังและบันทึก run เป็น degraded.
- Flex ปัจจุบันมีสี่การ์ด; ปุ่ม CCTV ชี้ `https://cctv.maholan.net/`. ส่วนภาพ CCTV เป็น static asset ไม่ใช่ภาพสดจากกล้อง.
- `.github/workflows/weather-daily.yml` ตั้ง `RUN_MODE=test` และใช้ `*_TEST` secrets. Production workflow/schedule ยังไม่ได้เปิด.

## Acceptance evidence

### Gemini — Milestone 4A

Decision 020 และ Scope Review Report บันทึก live Gemini Content → Gemini TTS, audio validation และ regression tests ว่าผ่านเมื่อ 2026-10-04.

### LINE TEST — Milestone 4B

Run `37612281724` วันที่ 2026-10-07 ส่ง Flex และ Audio ถึงกลุ่ม TEST สำเร็จ. Event log ยืนยัน:

- Flood, weather, Flex render/lint, TTS, audio validation/storage และ LINE push ผ่าน
- Narration ใช้ `quota-safe-fallback` ใน run นี้; Gemini TTS ใช้งานจริง
- MP3 ยาว 112.968 วินาที; `line.audio.send` สำเร็จ

ดังนั้นนี่เป็นหลักฐานการส่ง Audio/TTS และ fallback ที่ทำงานได้ ไม่ได้หมายความว่า Gemini Content จะตอบสำเร็จทุกครั้ง. ยังต้องให้ผู้ใช้ตรวจ Flex บน LINE client จริงและฟังเสียงก่อนรับรองเนื้อหา.

## Release gates

| Gate | สถานะปัจจุบัน |
|---|---|
| B1 — แหล่งข้อมูลน้ำแบบ machine-readable | **OPEN.** ThaiWater Standard กำหนด `A002.1 /Runoff`, แต่ Base URL เป็นของผู้ให้บริการ; ยังไม่มี endpoint/access method/station mapping ที่ยืนยันสำหรับแหล่งปัจจุบัน |
| B2 — พฤติกรรมเมื่อ flood source ใช้ไม่ได้ | **รอยืนยันสำหรับ Production.** ค่าเริ่มต้นที่ implement คือ `unknown-weather`; ไม่ใช่การประกาศว่าน้ำปกติ |
| B3 — Gemini model/API contract | **PASS** ตาม live acceptance 2026-10-04; ล่าสุดมี fallback เพื่อรับมือ API availability และยืนยัน Gemini TTS ผ่าน LINE TEST |
| B4 — docs/tests/workflows migration | **กำลังปิดใน branch นี้.** ต้องผ่าน full tests และ PR CI |
| Human review — Flex/Audio | **PENDING.** ต้องตรวจบน LINE มือถือจริงและกดเล่น Audio |
| Production schedule | **NO-GO.** Daily workflow ปัจจุบันส่งเฉพาะ TEST |

## B1 — สิ่งที่ยังขาด

ThaiWater Standard มีสัญญา API น้ำท่า (`A002.1`, `GET /Runoff`) และ filter ตามพื้นที่/สถานี แต่เอกสารมาตรฐานระบุว่าผู้ให้บริการแต่ละรายกำหนด Base URL เอง. หน้า HII/NHC อธิบายการรวบรวมข้อมูลน้ำจากหลายหน่วยงาน แต่ไม่ระบุ endpoint ที่เรียกได้, วิธีขอสิทธิ์, รหัสสถานีพัทลุง หรือการแมปเกณฑ์ระดับน้ำ.

จนกว่าจะได้ข้อมูลเหล่านี้หรือผู้ใช้ยอมรับความเสี่ยงของ HTML source ชั่วคราว ให้คง adapter ปัจจุบันแบบ strict และ fail-closed; ห้ามตีความ HTML source ว่าเป็น API ที่มี SLA.

แหล่งอ้างอิง: [ThaiWater Standard](https://standard.thaiwater.net/), [HII — National Hydroinformatics Data Center](https://www.hii.or.th/en/research-development/rd/2020/04/15/national-hydroinformatics-data-center-nhc/).
