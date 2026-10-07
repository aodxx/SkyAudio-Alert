# Phase 3 Status — Flood-first Runtime & Release Readiness

**อัปเดต:** 2026-10-07
**สถานะ:** ส่ง LINE TEST ได้เมื่อข้อมูลน้ำสดและยืนยันได้; **Production ยัง NO-GO**

## Runtime ปัจจุบัน

```text
Flood fetch/verification → no-send gate → weather → verified facts
→ Flex + narration → safety validation → Gemini TTS → MP3 validation/storage
→ LINE Flex → optional LINE Audio
```

- Gemini เป็นผู้ช่วยเรียบเรียง ไม่ใช่ source of truth; generated text ผ่าน safety validation ก่อน TTS.
- Audio ใช้ความยาวตามเนื้อหา; `ffprobe` วัดจริง (10 วินาที–5 นาที, ไม่เกิน 16 MiB).
- ถ้า flood fetch ล้มเหลว หรือผลลัพธ์ stale/unknown/ไม่มี station readings ที่ตรวจได้ ระบบหยุดก่อน weather, Flex, TTS และ LINE; workflow ถูกบันทึกเป็น failure/no-send.
- Flex มีสี่การ์ด; CCTV CTA คือ `https://cctv.maholan.net/`; ภาพ CCTV เป็น static asset ไม่ใช่ภาพสด.
- Scheduled workflow ตั้ง `RUN_MODE=test` และใช้ TEST secrets. Config ปฏิเสธ `RUN_MODE=production` จนกว่าจะมี official API adapter และ station mapping.

## Acceptance evidence

Decision 020 บันทึก live Gemini Content → Gemini TTS และ MP3 validation ว่าผ่านเมื่อ 2026-10-04. LINE TEST run `37612281724` วันที่ 2026-10-07 ส่ง Flex และ Audio สำเร็จ; narration ใช้ `quota-safe-fallback`, Gemini TTS สร้างเสียงจริงยาว 112.968 วินาที และ LINE รับ Audio. ยังต้องตรวจการแสดงผลและฟังเสียงบน LINE client จริง.

## Release gates

| Gate | สถานะปัจจุบัน |
|---|---|
| B1 — Official flood API | **OPEN.** ThaiWater Standard กำหนด `A002.1 /Runoff`; ยังไม่มี provider Base URL/access method และ station mapping ที่ยืนยันสำหรับพัทลุง. HTML adapter ใช้ได้เฉพาะ TEST |
| B2 — Source failure behavior | **PASS.** ผู้ใช้เลือก `no-send`; fetch error, stale/unknown severity หรือไม่มีสถานีที่ยืนยันได้จะหยุด pipeline ก่อน LINE |
| B3 — Gemini contract | **PASS.** Live acceptance 2026-10-04; ล่าสุดยืนยัน Gemini TTS, LINE Audio และ safe fallback |
| B4 — Docs/tests/workflows | **กำลังปิดใน PR.** ต้องผ่าน full suite และ CI หลัง no-send changes |
| Human review — Flex/Audio | **PENDING.** ต้องเปิด Flex และกดเล่น Audio บน LINE มือถือ |
| Production | **NO-GO.** รอ B1, B4 และ Human review; PROD secrets ไม่ปลดล็อก run |

## B1 — ข้อมูลที่รอจาก provider

ThaiWater Standard มี contract สำหรับ runoff (`A002.1`, `GET /Runoff`) แต่ผู้ให้บริการแต่ละรายเลือก Base URL เอง. ต้องได้ endpoint/access method/terms และ station IDs/mapping สำหรับพัทลุง แล้ว implement/validate adapter ก่อน Production. หน้า HTML ปัจจุบันไม่ถูกยอมรับเป็น Production source; คงไว้เฉพาะ TEST.

อ้างอิง: [ThaiWater Standard](https://standard.thaiwater.net/docs/), [HII National Hydroinformatics Data Center](https://www.hii.or.th/en/research-development/rd/2020/04/15/national-hydroinformatics-data-center-nhc/).
