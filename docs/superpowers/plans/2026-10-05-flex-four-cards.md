# Flex Four Cards — Implementation Record

**สถานะ:** เสร็จบน branch `feat/flex-four-card-weather-water` เมื่อ 2026-10-05

## เป้าหมาย

แทน layout Flex แบบเดิมที่แตกแขนงตาม severity ด้วย carousel แนวนอน 4 ใบขนาด `kilo`: ใบแรกเป็นสรุปอากาศแบบไม่มีภาพ; ใบ 2–4 เป็นภาพที่ผู้ใช้ระบุพร้อมปุ่มท้ายใบ

## ข้อกำหนดที่ลงมือแล้ว

- ใบ 1: วันที่, `ศาลาอเนกประสงค์ บ้านลำพาย`, พยากรณ์วันนี้, ช่วงเช้า/บ่าย/เย็น และข้อมูลอื่นที่มีจาก FactsSnapshot; ห้ามเพิ่ม image component; footer ปุ่มศูนย์ช่วยเหลือพัทลุง.
- ใบ 2: `2_20261005_193645_0003.jpg` + ปุ่มแผนที่ระดับน้ำพัทลุง.
- ใบ 3: `4_20261005_193645_0004.jpg` + ปุ่มพยากรณ์/เรดาร์.
- ใบ 4: `6_20261005_193645_0005.jpg` + ปุ่มภาพสด/CCTV.
- ภาพคงสัดส่วน 4:5; image/CTA URLs allowlisted; ทุกใบมีปุ่ม footer เพียงปุ่มเดียว.
- Flex renderer อ่าน FactsSnapshot โดยตรง. ถอด VisualPlan renderer, severity variants และ component factories ที่ไม่ถูกใช้ออก.
- คง narration/TTS/safety/duration/message order เดิม โดย narration ไม่รับ Flex message.

## ตรวจสอบ

- [x] Regression tests สำหรับ 4 ใบ ลำดับ, image allowlist/order, button labels/URLs, first-card-no-image, missing weather และ malformed layout.
- [x] Acceptance matrix 80 กรณี และ updated snapshots.
- [x] `npm test` — ผ่าน 106/106.
- [x] `git diff --check` และ JavaScript syntax checks — ผ่าน.

## ข้อจำกัดที่บันทึกไว้

ผู้ใช้ยืนยันให้ใช้ภาพ CCTV ตามต้นฉบับ แม้ป้ายชื่อสถานที่ในภาพไม่ตรงพัทลุง ภาพทั้งสามเป็น static assets และไม่ได้ refresh อัตโนมัติโดย data adapters จึงบันทึก caveat ไว้ใน `DECISIONS.md`/`PRD.md`; ต้องทบทวนความสดและบริบทภาพก่อน production. Human review ใน LINE client และ release gates ยังคงเป็นงานค้าง.


## Post-merge QA follow-up — 2026-10-05

การทดสอบ mutation หลัง PR #33 merge พบว่า linter เดิมกรอง carousel child ที่ไม่ใช่ bubble ออกก่อนนับจำนวน และตรวจจำนวนปุ่มเฉพาะ footer จึงยอมรับ non-bubble child/ปุ่มซ้ำใน body/ภาพซ่อนใน hero ได้. เพิ่ม regression tests ผ่าน public `lintFlexMessage` seam และแก้ให้ตรวจ raw item count, มีปุ่มเดียวทั้งใบ, และนับ image ทั้ง bubble; local `npm test` ผ่าน 109/109. กำลังส่ง hotfix ผ่าน Pull Request แยก.
