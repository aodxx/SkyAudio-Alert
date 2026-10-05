# SkyAudio-Alert — Product Requirements Document

**Version:** 1.0.0-FLOOD-FIRST  
**Scope lock:** 2026-10-04  
**Product:** SkyAudio-Alert — น้องจุ่นจ้าน  
**Primary destination:** LINE กลุ่มบ้านลำพาย ต.โคกชะงาย อ.เมือง จ.พัทลุง

> 🔒 **DOCUMENT LOCK — FLOOD-FIRST**
>
> เอกสารฉบับนี้เป็นข้อกำหนดปัจจุบันของ production product รอบนี้ และ supersede ข้อความ legacy ที่เคยอธิบาย weather + market/news, fixed report order หรือ fixed 2–3 minute audio ทั้งหมดที่ยังพบใน historical documents ให้ถือเป็นประวัติ ไม่ใช่ requirement ปัจจุบัน

## 1. Product direction

น้องจุ่นจ้านเป็นผู้ช่วยรายงานสถานการณ์น้ำสำหรับชุมชนบ้านลำพาย โดยมี **สถานการณ์น้ำท่วมเป็นข้อมูลหลัก** และใช้พยากรณ์อากาศเป็นข้อมูลประกอบ

ทุกเช้าประมาณ 06:00 Asia/Bangkok ระบบสร้างและส่ง:
1. LINE Flex Message — carousel 4 ใบขนาดกะทัดรัด โดยการ์ดแรกเป็นพยากรณ์อากาศ
2. LINE Audio Message — บทพูดภาษาไทยที่ปรับตามสถานการณ์ของวัน

Production runtime ต้องทำงานอัตโนมัติผ่าน GitHub Actions และไม่พึ่ง Manus/AI Agent

## 2. In scope

### Flood — primary
รายงานเท่าที่ source facts ยืนยันได้: ระดับ/สถานะน้ำ, จุดวัดหรือพื้นที่สำคัญ, แนวโน้ม, เวลาอัปเดต/ความสด, severity normal/watch/affected/critical/unknown และข้อจำกัดของข้อมูลเมื่อ source stale/unavailable

### Weather — supporting
ใช้ Open-Meteo เป็น forecast สำหรับบ้านลำพาย: ฝนและช่วงเวลาที่น่าติดตาม, อุณหภูมิ/ความร้อน, ลม และสัญญาณที่เกี่ยวข้องกับการเตรียมตัว

**Forecast ฝนห้ามถูกใช้เป็นหลักฐานยืนยันว่าเกิดน้ำท่วมจริง**

### Gemini content
Gemini เป็น narrative layer เท่านั้น:
- รับ normalized flood/weather facts
- สร้าง spokenText และ shortSummary แบบ adaptive
- Audio เป็น narrative แบบ "นักเล่าข่าวประจำหมู่บ้าน" 4 ช่วงที่เพิ่มรายละเอียดใหม่โดยไม่ทวนซ้ำ และมีเป้าหมาย **3–5 นาที** (วัดจริงหลัง TTS ด้วย ffprobe; ช่วงที่ยอมรับคือ 180,000–300,000 ms รวมขอบ)
- ห้ามยืดบทด้วยข้อความซ้ำหรือเติมเพื่อให้ครบเวลา; หากเสียงสั้น/ยาวเกินช่วง หรือการสร้าง/ตรวจ/จัดเก็บ Audio ล้มเหลว ให้ withheld เฉพาะ Audio และยังส่ง Flex ที่ผ่าน lint ได้
- ความยาวที่เพิ่มต้องมาจากคำอธิบาย/บริบทที่ไม่สร้างข้อเท็จจริงใหม่ ห้ามแต่งตัวเลข สถานี ถนน เวลา หรือเหตุการณ์
- Flex เป็น visual brief (icon/สี/ตัวเลข/label มาก่อนข้อความ) และไม่ใช้ข้อความชุดเดียวกับ Audio
- ห้ามสร้าง facts ที่ไม่มีใน input

ผลลัพธ์ต้องเป็น structured output และผ่าน deterministic validator ก่อนส่งเข้า TTS

### Gemini TTS
รองรับ profile male-friendly (default) และ female-friendly โดย model/voice มาจาก configuration และต้องตรวจ availability กับ API key จริงก่อน production

### Flex — current four-card layout (Decision 024)
แสดง carousel 4 ใบเรียงตามแนวนอน ทุกใบใช้ขนาด `kilo`:
1. **พยากรณ์อากาศวันนี้** — ไม่มีภาพ; วันที่, ศาลาอเนกประสงค์ บ้านลำพาย, สภาพอากาศ/อุณหภูมิ, ความน่าจะเป็นฝนแยกเช้า/บ่าย/เย็น และข้อมูลอื่นเท่าที่มีใน FactsSnapshot; ปิดท้ายด้วยปุ่มศูนย์ช่วยเหลือพัทลุง → https://chachoengsao-flood.vercel.app/phatthalung
2. **ภาพสรุประดับน้ำพัทลุง** (`2_20261005_193645_0003.jpg`) + ปุ่มแผนที่ระดับน้ำ → https://chachoengsao-flood.vercel.app/phatthalung/map
3. **ภาพแผนที่ระดับน้ำ** (`4_20261005_193645_0004.jpg`) + ปุ่มพยากรณ์/เรดาร์ → https://chachoengsao-flood.vercel.app/phatthalung/weather
4. **ภาพ CCTV** (`6_20261005_193645_0005.jpg`) + ปุ่มภาพสด/CCTV → https://chachoengsao-flood.vercel.app/phatthalung/weather

ใบที่ 1 ไม่มี image component; ใบ 2–4 มีภาพสัดส่วนเดิม 4:5 และมีปุ่มใน footer. ค่า forecast ที่ไม่มีต้องละเว้นหรือแจ้งว่าไม่มีข้อมูล ห้ามแต่งขึ้น. ภาพทั้งสามเป็น static assets ไม่ได้ refresh โดย adapter; ข้อความสถานที่บนภาพ CCTV ไม่ตรงพัทลุง เป็น asset ที่ผู้ใช้เลือกให้ใช้ตามต้นฉบับและไม่ใช่ข้อมูลยืนยันตำแหน่งกล้อง.

### Safety
ห้าม fabricate ตัวเลข เวลา จุดวัด ถนน หรือเหตุการณ์; ห้าม infer actual flooding from forecast alone; ห้ามพูดราคาปาล์ม/ยางหรือข่าวทั่วไป; ห้ามอ้างว่า “ปลอดภัยแน่นอน”; ห้ามให้ Gemini browse web เพื่อสร้าง facts; ห้ามพูด URL ยาวในเสียง

เมื่อ flood source ใช้ไม่ได้ default degraded mode คือ unknown + weather และต้องประกาศชัดว่ายังยืนยันสถานการณ์น้ำไม่ได้

## 3. Explicitly out of scope

รอบ production นี้ห้ามนำกลับมาเป็น runtime requirement:
- ราคาปาล์มน้ำมัน
- ราคายางพารา
- ข่าวสารทั่วไป/ข่าวประชาสัมพันธ์
- OCR/Tesseract สำหรับราคา
- market/news fetch stages
- fixed 2–3 minute audio
- fixed spoken-script order
- PWA/chatbot/member profile/multi-village
- minute-by-minute monitoring
- Manus AI Agent runtime
- scraping CCTV เป็น API โดยไม่มี contract

## 4. Deferred

หลายหมู่บ้าน/หลาย LINE group, dashboard ประวัติระดับน้ำ, notification นอกเวลารายงาน, nowcasting, community board/PWA, user-selectable voice, multi-speaker, database history/analytics และ additional flood sources

## 5. Location

| Field | Value |
|---|---|
| Location | บ้านลำพาย |
| Subdistrict | ต.โคกชะงาย |
| District | อ.เมือง |
| Province | พัทลุง |
| Latitude | 7.619729 |
| Longitude | 100.005932 |
| Timezone | Asia/Bangkok |

## 6. Authoritative pipeline

Flood source → adapter/normalize/freshness/severity → Weather source → normalize/analyze → verified flood/weather facts → { FactsSnapshot → fixed four-card Flex + lint; independent four-topic narration → safety validator → one Gemini TTS call → ffprobe duration validation/store } → separate LINE Flex push → optional separate Audio push

## 7. Failure policy

- flood fetch/parse failure → unknown flood state; do not fabricate
- weather failure → do not fabricate weather
- narration/TTS/audio validation/storage failure → withhold Audio, preserve the failure stage, and deliver valid Flex alone; mark the run degraded/non-zero rather than full success
- audio outside 180,000–300,000 ms → withhold Audio; do not clamp or misreport measured duration
- LINE transient failure → retry according to retry policy
- Flex already delivered on the same Bangkok date → skip another production run to avoid duplicate Flex, even if Audio was withheld; a run that failed before Flex delivery may be retried

## 8. Production gate

**Current status: NO-GO**

Production schedule remains closed until B1–B4 from docs/SCOPE_REVIEW_REPORT.md are resolved or explicitly accepted:
- B1 stable flood source/contract
- B2 degraded-mode decision
- B3 real Gemini content/TTS contract verification
- B4 document/test/workflow migration

## 9. Source-of-truth order

1. Latest user-confirmed requirements
2. docs/SCOPE_REVIEW_REPORT.md
3. This PRD
4. DECISIONS.md latest decisions
5. Current design/refactor docs
6. Legacy/historical documents only as historical evidence

Any document that conflicts with this order is stale and must not drive implementation.


## Current Implementation Status — 2026-10-04

### Milestone 4A — Gemini Live Acceptance

**Status: PASS ✅**

The current implementation has completed the real Gemini Content + Gemini TTS acceptance path. Generated audio also passes the repository audio validation layer. Gemini remains a narrative layer only; source facts remain authoritative.

### Next milestone — 4B LINE Test Acceptance

The next acceptance is the real delivery chain into the TEST LINE destination: Flood → Weather → Gemini → Flex → Gemini TTS → LINE. This stage must verify message ordering, Flex rendering, audio playback/accessibility, and no reintroduction of historical market/news content.

**Production remains NO-GO until 4B and the remaining release gates pass.**
