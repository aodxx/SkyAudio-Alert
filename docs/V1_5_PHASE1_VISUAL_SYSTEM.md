# SkyAudio-Alert V1.5 — Phase 1 Visual Design System

**สถานะ:** PHASE 1 COMPLETE — visual system locked  
**วันที่:** 2026-10-04  
**Production:** NO-GO

## 1. Design objective
สร้างภาษา Visual กลางสำหรับรายงาน Flood-first ใน LINE ให้ผู้ใช้เข้าใจสถานการณ์จาก Card แรกได้ทันที และปัดดูรายละเอียดได้โดยไม่ต้องอ่านข้อความยาวใน Card เดียว

หลัก:
- Flood status มาก่อน
- Card 1 ต้องยืนได้ด้วยตัวเอง
- แต่ละ Card สั้นและอ่านจบ
- ข้อมูลรวมไม่ถูกตัดเพียงเพื่อให้ Card สั้น
- สีไม่ใช่สัญญาณเดียว
- Unknown/Stale ต้องเห็นชัด
- Critical ต้องนำ Action เข้าใกล้ Card แรก
- Carousel เป็นการแบ่งข้อมูล ไม่ใช่การซ่อนข้อมูลสำคัญ

## 2. Visual tokens
```
layout: carousel_gap=compact, card_padding=compact, radius=medium, hero_density=high, body_density=compact
type: hero=large/bold, status=medium/bold, section=medium/bold, body=small/regular, metadata=x-small/regular, button=small/bold
semantic: normal=calm, watch=attention, affected=impact, critical=urgent, unknown=uncertain
signals: severity=label+icon+semantic, freshness=explicit, trend=explicit
```
ค่าตัวเลขจริงกำหนดใน implementation phase หลังตรวจ component เดิม เพื่อไม่สร้าง hard-code ซ้ำ

## 3. Universal card rules
### Card 1 — Situation Hero
ต้องมี identity, severity label, main flood headline, trend ถ้ามี, freshness/update ถ้ามี
ห้ามเริ่มด้วย weather, ทำให้ unknown ดูเหมือน normal, หรือวาง critical action สำคัญไว้เฉพาะ Card หลัง

### Detail cards
หัวข้อหนึ่งต่อหนึ่ง Card: สถานี/พื้นที่/ถนน, ผลกระทบ, Action, Weather context, Source/CTA

Default: Hero → Key facts → Action → Weather/Source

Exceptions:
- critical: Hero → Immediate Action → Key facts → Source
- unknown: Hero → Why unknown → Weather → Source
- affected: Hero → Impact/locations → Action → Weather/Source

จำนวน Card เป็น dynamic ไม่บังคับ 4 ใบทุก state

## 4. Severity themes
### NORMAL — ปกติ
Card 1 status+trend+update; Card 2 useful facts; Card 3 weather/action/source เมื่อมีประโยชน์

### WATCH — เฝ้าระวัง
Card 1 status+trend; Card 2 key stations/facts; Card 3 relevant weather; Card 4 action/source เมื่อมีประโยชน์

### AFFECTED — ได้รับผลกระทบ
Card 1 status+impact; Card 2 affected locations/roads; Card 3 action; Card 4 weather/source เมื่อมีประโยชน์

### CRITICAL — วิกฤต
Card 1 critical status+what is happening; Card 2 immediate action; Card 3 key locations/roads; Card 4 source/CCTV. Weather อาจย่อ/ตัดเมื่อรบกวนการตัดสินใจ
**Critical rule:** สิ่งที่ต้องรู้เพื่อการตัดสินใจทันทีต้องอยู่ Card 1 หรือ Card 2

### UNKNOWN — ยังยืนยันไม่ได้
Card 1 explicit uncertainty+freshness/state; Card 2 reason; Card 3 available weather; Card 4 source/check-now CTA
ห้ามใช้ styling ที่ทำให้เข้าใจว่า normal/ปลอดภัย

## 5. Stale treatment
Stale เป็น freshness condition ไม่ใช่ severity ใหม่:
- รักษา severity เดิมถ้ายังทราบ
- แสดงข้อจำกัดความสดอย่างชัดเจน
- แสดง retrieval/update time เมื่อมี
- ห้ามซ่อนไว้เพียง footer
- หาก stale ทำให้ตีความอย่างปลอดภัยไม่ได้ ให้ใช้ uncertainty wording ตาม policy

## 6. Mobile readability
- Card compact; หลีกเลี่ยง paragraph ยาว
- หนึ่ง section ต่อหนึ่งแนวคิด
- ห้ามตัดประโยคระหว่าง Card
- action label สั้น
- ความหมายสำคัญอยู่ด้านบน
- timestamp/source เป็น metadata
- ห้ามพึ่ง horizontal scroll เพื่ออ่านข้อความสำคัญประโยคเดียว
- Carousel ใช้รายละเอียดเพิ่มเติมหลัง Card 1

## 7. Accessibility
ทุก severity ต้องเข้าใจได้โดยไม่พึ่งสี: text label + icon/symbol + explicit wording

altText เป้าหมาย:
`รายงานสถานการณ์น้ำบ้านลำพาย: [severity] — [headline]. [key action/uncertainty].`

Critical/unknown ต้องรักษา safety-relevant state ใน altText และพิจารณา scaling/accessibility ที่รองรับกับ LINE Flex จริง

## 8. Button hierarchy
Primary CTA จำกัดเฉพาะสิ่งที่มีประโยชน์ที่สุดของ state

Approved scope:
- CCTV: https://cctv.maholan.net/
- Flood source: https://chachoengsao-flood.vercel.app/phatthalung
- Weather/radar: https://chachoengsao-flood.vercel.app/phatthalung/weather

ไม่เพิ่ม external source ใหม่ใน Phase 1

## 9. Five-state acceptance specification
| State | Card 1 must answer | Highest-priority later card |
|---|---|---|
| Normal | น้ำเป็นอย่างไรตอนนี้ | useful facts/action |
| Watch | มีอะไรที่ต้องเฝ้าระวัง | key stations + action |
| Affected | อะไรได้รับผลกระทบ | affected locations + action |
| Critical | เกิดอะไรขึ้นและต้องทำอะไร | key locations/source |
| Unknown | ทำไมยังยืนยันไม่ได้ | reason + available weather/source |

## 10. Do / Don't
DO: semantic hierarchy, first-card self-contained, adaptive card count, action prominence increases with severity, honest freshness, source traceability.
DON'T: fixed four-card requirement, color-only severity, weather-first layout, hide critical facts later, invent station/road/measurement, add market/news, let visual design override verified severity.

## 11. Phase 1 exit criteria
- [x] Five severity themes defined
- [x] Token categories defined
- [x] Carousel/card hierarchy defined
- [x] Card 1 self-contained rule defined
- [x] Dynamic card-count rule defined
- [x] Mobile compact rules defined
- [x] Accessibility/altText rules defined
- [x] CTA scope locked
- [x] Stale/unknown treatment defined
- [x] No production runtime changed

**Next:** Phase 2 — Presentation Contract. Production remains NO-GO.
