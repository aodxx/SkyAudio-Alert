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
| B1 — Official flood API | **OPEN.** ThaiWater Standard กำหนด `A002.1 /Runoff`; ยังไม่มี provider Base URL/access method และ station mapping ที่ยืนยันสำหรับพัทลุง. HTML adapter ใช้ได้เฉพาะ TEST |
| B2 — Source failure behavior | **PASS.** ผู้ใช้เลือก `no-send`; fetch error, stale/unknown severity หรือไม่มีสถานีที่ยืนยันได้จะหยุด pipeline ก่อน LINE |
| B3 — Gemini contract | **PASS.** Live acceptance 2026-10-04; ล่าสุดยืนยัน Gemini TTS, LINE Audio และ safe fallback |
| B4 — Docs/tests/workflows | **PASS for current adaptive narration change.** Post-merge Node CI and Phase 3 tests passed; keep this gate open again if future code/workflow changes fail tests |
| Human review — Flex/Audio | **PENDING.** ต้องเปิด Flex และกดเล่น Audio บน LINE มือถือ |
| Production | **LIMITED-GO only under Decision 028 scheduled exception.** Full official-API Production remains NO-GO; real-device Flex/audio review is pending |

## B1 — ข้อมูลที่รอจาก provider

ThaiWater Standard มี contract สำหรับ runoff (`A002.1`, `GET /Runoff`) แต่ผู้ให้บริการแต่ละรายเลือก Base URL เอง. ต้องได้ endpoint/access method/terms และ station IDs/mapping สำหรับพัทลุง แล้ว implement/validate adapter ก่อน Production. หน้า HTML ปัจจุบันไม่ถูกยอมรับเป็น Production source; คงไว้เฉพาะ TEST.

อ้างอิง: [ThaiWater Standard](https://standard.thaiwater.net/docs/), [HII National Hydroinformatics Data Center](https://www.hii.or.th/en/research-development/rd/2020/04/15/national-hydroinformatics-data-center-nhc/).


## Readiness audit — 2026-10-09

- Adaptive narration code is merged to `main`; Gemini can return 1–5 distinct sections from the allowlist and choose their order. Deterministic fact/safety validation, quota-safe fallback, TTS validation, public audio URL validation, and atomic Flex+Audio delivery gates remain in the pipeline.
- Post-merge CI and Phase 3 test workflows passed at commit `b1a542812ce8aaf001227d8f13b7fcee686d3664`.
- Scheduled Production run `37717506024` succeeded at the LINE API boundary, but there is still no proof from logs that a member opened and played the audio.
- Remaining release blockers for a full 100% sign-off: (1) official machine-readable flood provider endpoint and verified Phatthalung station mapping; (2) a human opens the real LINE delivery and verifies Flex rendering/audio playback; (3) observe repeated scheduled runs to establish TTS/source reliability and timing expectations. GitHub Actions remains best-effort, not an exact 06:00 guarantee.
