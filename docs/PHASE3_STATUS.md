# Phase 3 Status — Flood-first Runtime & Release Readiness

**อัปเดต:** 2026-10-09
**สถานะ:** **LIMITED-GO เฉพาะ daily Production exception ตาม Decision 028**; full Production ที่ใช้ official flood API ยัง NO-GO และ human playback review ยัง pending.

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
- Scheduled workflow `.github/workflows/weather-daily.yml` ใช้ `RUN_MODE=production` ได้เฉพาะ event `schedule` บน `main` ภายใต้ Decision 028, source URL ที่อนุมัติ และ `FLOOD_DEGRADED_MODE=no-send`. Manual Production runs และแหล่งอื่นยังถูกล็อก. นี่เป็นข้อยกเว้นที่จำกัด ไม่ได้ปิด B1.

## Acceptance evidence

- Adaptive narration merged to `main` in commit `b1a542812ce8aaf001227d8f13b7fcee686d3664`; Gemini may choose 1–5 allowlisted sections and their order based on verified daily facts. Post-merge Node CI run `37862280375` and Phase 3 unit tests run `37862280404` both passed.
- Scheduled Production run `37717506024` on 2026-10-08 completed its pipeline, validated a 110.568-second MP3, and LINE API accepted the Flex+Audio pair in one request. This is API acceptance evidence only; it does not confirm playback on a member's device.

Decision 020 บันทึก live Gemini Content → Gemini TTS และ MP3 validation ว่าผ่านเมื่อ 2026-10-04. LINE TEST run `37612281724` วันที่ 2026-10-07 ส่ง Flex และ Audio สำเร็จ; narration ใช้ `quota-safe-fallback`, Gemini TTS สร้างเสียงจริงยาว 112.968 วินาที และ LINE รับ Audio. ยังต้องตรวจการแสดงผลและฟังเสียงบน LINE client จริง.

## Release gates

| Gate | สถานะปัจจุบัน |
|---|---|
| B1 — Official flood API | **OPEN.** ThaiWater Standard กำหนด `A002.1 /Runoff`; ยังไม่มี provider Base URL/access method และ station mapping ที่ยืนยันสำหรับพัทลุง. HTML adapter ใช้ได้เฉพาะข้อยกเว้น daily schedule ตาม Decision 028 ไม่ใช่ full Production source. |
| B2 — Source failure behavior | **PASS.** ผู้ใช้เลือก `no-send`; fetch error, stale/unknown severity หรือไม่มีสถานีที่ยืนยันได้จะหยุด pipeline ก่อน LINE |
| B3 — Gemini contract | **PASS.** Live acceptance 2026-10-04; ล่าสุดยืนยัน Gemini TTS, LINE Audio และ safe fallback |
| B4 — Docs/tests/workflows | **PASS for current adaptive narration change.** Post-merge Node CI and Phase 3 tests passed; keep this gate open again if future code/workflow changes fail tests |
| Human review — Flex/Audio | **PENDING.** ต้องเปิด Flex และกดเล่น Audio บน LINE มือถือ |
| Production | **LIMITED-GO only under Decision 028 scheduled exception.** Full official-API Production remains NO-GO; real-device Flex/audio review is pending |

## B1 — ข้อมูลที่รอจาก provider

**ผลค้นหาแหล่งข้อมูลทางการล่าสุด (2026-10-09):**

- [ThaiWater Standard — API สำหรับอ่านข้อมูลน้ำท่า](https://standard.thaiwater.net/docs/) ระบุ resource `A002.1 /Runoff` และ HTTP `GET` แต่เอกสารกำหนดว่า provider เป็นผู้จัด Base URL; path `/Runoff` เพียงอย่างเดียวยังไม่ใช่ endpoint ที่เรียกใช้ได้.
- [Open Government Data Thailand — ระดับน้ำ](https://data.go.th/th/dataset/water-level) ระบุข้อมูลระดับน้ำราย 10 นาทีและไฟล์ station metadata CSV; หน้ารายการชี้ไปยัง Data Source ของ HII แต่ยังไม่ได้ยืนยัน live endpoint และ station IDs สำหรับบ้านลำพาย/พัทลุง.
- [HII water-level archive](https://tiservice.hii.or.th/opendata/data_catalog/water_level/) เปิดเผย CSV แยกเป็นรายปี/รายเดือนและไฟล์ station metadata; นี่เป็นหลักฐานว่ามีข้อมูล machine-readable แต่ยังไม่ใช่การยืนยัน API แบบ live ที่รับประกัน freshness ≤180 นาทีสำหรับการตัดสินใจส่งรายงาน.
- ผู้ประสานงานที่เผยแพร่ใน catalog คือ `telem@hii.or.th`. ขั้นตอนถัดไปคือยืนยัน Base URL/version, access/authentication, terms/rate limits, schema ของ response และรายการรหัสสถานี/พิกัด/เกณฑ์ระดับน้ำที่เกี่ยวข้องกับพัทลุงก่อนสร้าง adapter ใหม่.

ดังนั้นยังห้ามเดา Base URL หรือถือว่ารายการ CSV/หน้า HTML เป็น live API ที่ตรวจรับแล้ว.

## Readiness audit — 2026-10-09

- Adaptive narration code is merged to `main`; Gemini can return 1–5 distinct sections from the allowlist and choose their order. Deterministic fact/safety validation, quota-safe fallback, TTS validation, public audio URL validation, and atomic Flex+Audio delivery gates remain in the pipeline.
- Post-merge CI and Phase 3 test workflows passed at commit `b1a542812ce8aaf001227d8f13b7fcee686d3664`.
- Scheduled Production run `37717506024` succeeded at the LINE API boundary, but there is still no proof from logs that a member opened and played the audio.
- Remaining release blockers for a full 100% sign-off: (1) official machine-readable flood provider endpoint and verified Phatthalung station mapping; (2) a human opens the real LINE delivery and verifies Flex rendering/audio playback; (3) observe repeated scheduled runs to establish TTS/source reliability and timing expectations. GitHub Actions remains best-effort, not an exact 06:00 guarantee.
