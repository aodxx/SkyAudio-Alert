# SkyAudio-Alert V1.5 — Visual & UX Blueprint + Phase Execution Plan

**วันที่ออกแบบ:** 2026-10-04  
**สถานะ:** DESIGN / IMPLEMENTATION PLAN — ยังไม่ใช่ production authorization  
**ฐาน:** Flood-first + supporting weather + Gemini narrative + Gemini TTS + LINE Flex/Audio  
**เป้าหมาย:** ทำให้รายงานตอนเช้า “เห็นแล้วเข้าใจสถานการณ์น้ำทันที” และ “ฟังแล้วรู้ว่าควรติดตาม/เตรียมตัวอย่างไร” โดยไม่เพิ่มข้อมูลที่แหล่งจริงไม่ได้ยืนยัน

> 🔒 **Production remains NO-GO.**
>
> เอกสารนี้กำหนดลำดับงานของ V1.5 ตั้งแต่ design → contract → implementation → QA → LINE acceptance → release gate เพื่อป้องกันการแก้ UI แล้วต้องรื้อ pipeline ซ้ำ

> **สถานะ ณ 2026-10-07:** เอกสารนี้เป็นแผนย้อนหลัง ไม่ใช่รายการงานหรือสเปก runtime ปัจจุบัน. ให้ยึด `CHECKLIST.md`, `docs/PHASE3_STATUS.md`, Decision 024 (Flex) และ Decision 025 (Audio) แทน.

---

## 1. V1.5 จะปรับอะไร

V1.5 ไม่ใช่การเปลี่ยนระบบให้เป็น dashboard และไม่ใช่การเพิ่ม feature ใหม่จำนวนมาก แต่เป็นการยกระดับ **การนำเสนอข้อมูลที่ระบบมีอยู่แล้ว** ให้ชัดขึ้น ปลอดภัยขึ้น และเหมาะกับการใช้งานจริงใน LINE บนมือถือ

### สิ่งที่ต้องดีขึ้น

1. ผู้ใช้เห็น **สถานะน้ำ** ก่อนข้อมูลอื่นเสมอ
2. เห็น **แนวโน้ม** และ **เวลาอัปเดต** ได้ทันที
3. หน้าตาเปลี่ยนตาม 5 สถานการณ์:
   - normal
   - watch
   - affected
   - critical
   - unknown
4. ข้อมูล weather ช่วยให้ตัดสินใจเตรียมตัว แต่ไม่ถูกใช้เป็นหลักฐานว่าน้ำท่วม
5. มี action ที่อ่านแล้วรู้ว่า “ตอนนี้ควรทำอะไร”
6. Gemini ช่วยจัดลำดับ เขียน และคัดเลือกข้อความที่ตัวเองสร้างขึ้นได้อย่างเป็นธรรมชาติ แต่ **ไม่มีสิทธิ์สร้างหรือเปลี่ยน fact**
7. Audio ต้องมีรายละเอียดเพียงพอสำหรับการเข้าใจสถานการณ์ ไม่บังคับให้สั้น และให้ Gemini เลือกข้อความ/ลำดับ/การเชื่อมประโยคจาก facts ที่ตรวจสอบแล้วตามความสำคัญของวัน
8. Flex เปลี่ยนจากการ์ดใบเดียวที่ยาว เป็น **carousel หลายการ์ดสั้น** แบ่งตามช่วงความสำคัญ เพื่อให้ผู้ใช้ปัดดูรายละเอียดด้านข้างได้
9. Flex อ่านง่ายบนมือถือและรองรับผู้สูงอายุ
9. ข้อมูลสำคัญไม่พึ่งสีอย่างเดียว
10. ทุกการเปลี่ยนแปลงมี fixture/test และสามารถตรวจ visual/audio ได้ก่อน production

### สิ่งที่ V1.5 จะไม่ทำ

- ไม่เพิ่ม PWA/chatbot
- ไม่เพิ่ม multi-village/multi-group
- ไม่ทำ minute-by-minute monitoring
- ไม่เพิ่ม market/news/OCR
- ไม่เพิ่มฐานข้อมูลประวัติขนาดใหญ่ในรอบนี้
- ไม่ scrape CCTV มาเป็น source
- ไม่ให้ Gemini browse เพื่อหา fact
- ไม่ให้ forecast ฝนกลายเป็นคำยืนยันน้ำท่วม
- ไม่ใช้ fixed 2–3 minute audio และไม่กำหนดเพดานสั้นแบบตายตัวเพื่อบังคับ Gemini
- ไม่ย่อข้อมูลสำคัญเพียงเพื่อให้ Flex หรือ Audio สั้นลง
- ไม่เปิด production schedule เพียงเพราะ UI ใหม่ดูดี

---

# 2. ภาพรวม Phases

| Phase | ชื่อ | เป้าหมาย | ผลที่ต้องเห็นเมื่อเสร็จ |
|---|---|---|---|
| 0 | Baseline & Design Lock | ล็อกสิ่งที่จะเปลี่ยนและสิ่งที่ห้ามเปลี่ยน | มี blueprint และ acceptance matrix ที่ทีมใช้เป็น checklist เดียวกัน |
| 1 | Visual Design System | สร้างภาษา visual กลาง | มี tokens, severity themes, carousel/card rules และ mockup ครบ 5 states |
| 2 | Presentation Contract | กำหนดข้อมูลที่ UI/Audio ต้องใช้ | มี contract สำหรับ presentation plan, card sections, source, freshness และ audio style/freedom |
| 3 | Adaptive Flex Carousel | นำ design ไปใช้จริง | ทุก state แบ่งเป็นการ์ดสั้นหลายใบ ปัดด้านข้างได้ และ mobile-safe |
| 4 | Adaptive Audio | ทำเสียงให้สอดคล้องกับสถานการณ์ | เสียงมีรายละเอียดเพียงพอ, Gemini เลือกใช้ข้อความได้อย่างเป็นธรรมชาติ และผ่าน audio QA |
| 5 | Safety + Quality Firewall | กันข้อมูลเกินจริงและ regression | test ตรวจ no-fabrication, certainty, layout, audio และ source transparency |
| 6 | End-to-End LINE Acceptance | ทดสอบสายงานจริง | LINE TEST ได้ Flex → Audio ตามลำดับและตรวจมือถือ/เสียงจริง |
| 7 | Release Readiness | ปิด gate ก่อน production | checklist ครบ, docs ตรงกัน, rollback/monitoring พร้อม และจึงค่อยพิจารณา GO |

> **กติกา:** ห้ามข้าม Phase 1–2 แล้วรีบแก้ builder โดยตรง เพราะจะทำให้ component, prompt และ tests ขัดกันภายหลัง

---

# 3. PHASE 0 — Baseline & Design Lock

## 3.1 วัตถุประสงค์

สร้าง baseline จาก runtime ปัจจุบันก่อนแก้ เพื่อให้เรารู้ว่า “อะไรทำงานอยู่แล้ว” และ “อะไรคือสิ่งที่ V1.5 เปลี่ยน”

## 3.2 งานที่ต้องทำ

### A. Inventory runtime

ตรวจและบันทึก:

- Flood adapter / normalize / analyzer
- Weather adapter / analyzer
- Report contract
- Gemini Content
- Flex builder/components
- Gemini TTS
- Audio validation/storage
- LINE messaging
- Pipeline
- GitHub Actions
- existing fixtures/tests

### B. ล็อก invariants

สิ่งที่ห้ามเสียระหว่าง V1.5:

- Flood เป็น primary
- Weather เป็น supporting
- Gemini ไม่ใช่ source of truth
- forecast ไม่ยืนยัน actual flood
- unknown/stale ต้องยังคง unknown
- Flex มาก่อน Audio
- dry-run ไม่ส่ง LINE
- production duplicate guard คงอยู่
- market/rubber/news ไม่กลับมา

### C. ทำ before snapshot

สร้าง test/snapshot สำหรับ:

- normal
- watch
- affected
- critical
- unknown
- stale

## 3.3 ไฟล์/พื้นที่ที่เกี่ยวข้อง

- `docs/V1_5_VISUAL_UX_BLUEPRINT.md`
- `src/flood/*`
- `src/content/*`
- `src/flex/*`
- `src/audio/*`
- `src/core/pipeline.js`
- `tests/*`
- `fixtures/*`

## 3.4 เมื่อเสร็จต้องเห็นอะไร

ต้องตอบได้ชัดเจนว่า:

> “ถ้าเราไม่แก้ข้อมูลต้นทาง ระบบปัจจุบันสร้างข้อมูลอะไรให้ UI และ Audio ได้บ้าง และ V1.5 ต้องเพิ่ม presentation information อะไรเท่านั้น”

### Exit criteria

- [ ] baseline tests ผ่าน
- [ ] 5 severity + stale fixture ถูกระบุ
- [ ] invariants ถูกบันทึก
- [ ] ไม่มี requirement ใหม่ที่หลุด scope

---

# 4. PHASE 1 — Visual Design System

## 4.1 เป้าหมาย

สร้าง “ภาษากลาง” ของ Flex เพื่อไม่ให้แต่ละ state ถูกออกแบบแยกกันจนดูเหมือนคนละแอป

## 4.2 Design hierarchy

ทุก Flex ใช้ hierarchy นี้เป็นแกน แต่สามารถย่อ/ขยายตาม severity:

1. Identity — น้องจุ่นจ้าน / รายงานเช้า
2. Flood Status Hero — สถานะน้ำ
3. Trend + Freshness — แนวโน้ม + เวลาอัปเดต
4. Key facts — จุดวัด/พื้นที่ที่เกี่ยวข้อง
5. Action — สิ่งที่ควรทำ/ติดตาม
6. Weather context — เฉพาะสิ่งที่จำเป็น
7. Sources — แหล่งข้อมูล
8. CTA — ปุ่มที่เกี่ยวข้อง

**Carousel rule:** หนึ่ง Flex Message ใช้ carousel container และแบ่งเนื้อหาเป็นหลาย bubble สั้น ๆ ตามลำดับความสำคัญ ผู้ใช้ปัดซ้าย/ขวาเพื่อดูการ์ดถัดไปได้ โดยไม่ทำให้การ์ดใดการ์ดหนึ่งสูงเกินไป

## 4.3 สร้าง design tokens

กำหนดเป็น code/config ไม่กระจาย hard-code:

- spacing
- padding
- corner radius
- font size
- font weight
- line height
- severity label
- icon
- gradient
- solid fallback
- button hierarchy
- maximum text length
- compact/expanded mode

ตัวอย่างแนวคิด:

`severity.normal`, `severity.watch`, `severity.affected`, `severity.critical`, `severity.unknown`

## 4.4 กฎสี

สีเป็น **semantic signal** ไม่ใช่ข้อมูลเพียงอย่างเดียว

ทุก state ต้องมี:

- สี
- label
- icon
- ข้อความ

ตัวอย่าง:

- normal → “ปกติ”
- watch → “เฝ้าระวัง”
- affected → “ได้รับผลกระทบ”
- critical → “วิกฤต”
- unknown → “ยังยืนยันไม่ได้”

ต้องมี solid fallback หาก gradient/rendering มีปัญหา

## 4.5 ออกแบบ 5 Flex variants + Carousel Cards

### Variant A — NORMAL

ต้องสื่อ:

> สถานการณ์ปัจจุบันไม่มีสัญญาณผิดปกติที่ source ยืนยัน

UI แบ่งเป็นการ์ดสั้น เช่น:

- Card 1: สถานะน้ำ + trend + update
- Card 2: จุด/ข้อมูลสำคัญ
- Card 3: weather context + action/source

ไม่จำเป็นต้องมีทุกการ์ดหากวันนั้นไม่มีข้อมูลที่มีประโยชน์

### Variant B — WATCH

ต้องสื่อ:

> มีสัญญาณที่ควรติดตาม แต่ยังไม่ควรใช้ภาษาวิกฤต

UI เพิ่มเป็น carousel:

- Card 1: สถานะเฝ้าระวัง + trend
- Card 2: จุด/สถานีสำคัญ
- Card 3: weather context ที่เกี่ยวข้อง
- Card 4: action/แหล่งข้อมูล

Gemini มีสิทธิ์เลือกว่าจะนำข้อความใดมาใช้ในแต่ละ card จากข้อความที่สร้างและ facts ที่ตรวจสอบแล้ว

### Variant C — AFFECTED

ต้องสื่อ:

> source มีข้อมูลพื้นที่/จุดที่ได้รับผลกระทบ

UI แบ่งเป็นช่วงสั้น:

- Card 1: สถานะ + ผลกระทบ
- Card 2: พื้นที่/ถนนที่ source ยืนยัน
- Card 3: action ที่ควรทำ
- Card 4: weather/source ถ้ามีประโยชน์

แต่ละ card ต้องอ่านจบได้ด้วยตัวเอง ไม่ตัดประโยคสำคัญกลาง card

### Variant D — CRITICAL

ต้องสื่อ:

> ข้อมูลยืนยันสถานการณ์รุนแรง/วิกฤต

UI แบ่งเป็นการ์ดสั้นและเน้นความสำคัญ:

- Card 1: CRITICAL + สิ่งที่เกิดขึ้น
- Card 2: จุด/พื้นที่/ถนนที่สำคัญ
- Card 3: สิ่งที่ควรทำทันที
- Card 4: แหล่งข้อมูล/CCTV
- weather เป็น supporting card ที่ย่อหรือเลื่อนไปท้าย

เป้าหมายคือ **สั้นต่อการ์ด แต่ข้อมูลรวมไม่สั้นจนทำให้เข้าใจผิด**

### Variant E — UNKNOWN

ต้องสื่อ:

> ระบบยังยืนยันสถานการณ์น้ำไม่ได้

UI แบ่งเป็นการ์ดสั้น:

- Card 1: “ยังยืนยันสถานการณ์น้ำไม่ได้”
- Card 2: สาเหตุของ unknown/stale ตามข้อเท็จจริง
- Card 3: weather ที่ยังมีข้อมูล
- Card 4: แหล่งข้อมูลสำหรับตรวจสอบ

ห้ามใช้ card แรกที่ทำให้ผู้ใช้เข้าใจว่าเป็น normal

## 4.6 Accessibility

ต้องออกแบบให้:

- อ่านบนจอมือถือเล็กได้
- ข้อความสำคัญไม่ยาวเกิน
- contrast เพียงพอ
- ไม่ใช้สีเป็นตัวบอก state เพียงอย่างเดียว
- altText อธิบายสถานะสำคัญ
- พิจารณา LINE Flex scaling/accessibility ที่เหมาะสม

## 4.7 เมื่อเสร็จต้องเห็นอะไร

ต้องมีภาพ/ตัวอย่างหรือ specification ที่มองแล้วแยกได้ทันทีว่า:

- NORMAL หน้าตาอย่างไร
- WATCH หน้าตาอย่างไร
- AFFECTED หน้าตาอย่างไร
- CRITICAL หน้าตาอย่างไร
- UNKNOWN หน้าตาอย่างไร

และเมื่อปิดสี/มองด้วยข้อความอย่างเดียว ยังรู้ severity ได้

### Exit criteria

- [ ] 5 variants approved
- [ ] token set ชัดเจน
- [ ] carousel/card hierarchy ชัดเจน
- [ ] mobile compact rule ชัดเจน
- [ ] accessibility rule ชัดเจน
- [ ] กำหนดจำนวน/บทบาทการ์ดตาม severity แล้ว


---

# 5. PHASE 2 — Presentation Contract

## 5.1 เป้าหมาย

แยก “ข้อมูลจริง” ออกจาก “วิธีนำเสนอ”

Flood/Weather facts ต้องไม่ถูกแก้เพื่อให้ UI สวย

สร้างชั้นกลาง:

**Verified Facts → Presentation Plan → Flex + Audio**

## 5.2 Presentation Plan ที่ควรมี

แนวคิดข้อมูล:

```json
{
  "severity": "watch",
  "headline": "...",
  "statusLabel": "...",
  "trendLabel": "...",
  "freshnessLabel": "...",
  "priorityFacts": [],
  "actions": [],
  "weatherContext": {},
  "sourceNotes": [],
  "visualVariant": "watch",
  "cards": [],
  "audioStyle": "calm-alert",
  "audioSelectionPolicy": "gemini-adaptive-within-verified-facts",
  "spokenText": "...",
  "spokenSections": []
}
```

ข้อสำคัญ:

- `severity` มาจาก deterministic flood analysis
- `priorityFacts` ต้อง trace กลับไปยัง facts
- `actions` ต้องมาจาก allowed facts/rules
- `cards` เป็น presentation sections ที่สั้นและแยกตามความสำคัญ ไม่ใช่การตัดข้อมูลทิ้ง
- Gemini ช่วยเรียบเรียงและ **เลือกใช้ข้อความ/ประโยค/การเชื่อมความที่ตัวเองสร้างขึ้น** ได้ตามธรรมชาติ ตราบใดที่ยังอยู่ใน verified facts
- Gemini สามารถเลือกว่าจะพูดรายละเอียดใดมาก/น้อยในวันนั้นได้ แต่ต้องไม่ละเลย fact สำคัญที่ safety/policy ระบุว่าจำเป็น
- `visualVariant` ต้องไม่ขัดกับ severity

## 5.3 Gemini ทำอะไร / ไม่ทำอะไร

### Gemini ทำได้

- เรียงความสำคัญ
- เขียน headline
- สร้าง spokenText และ sections
- เลือกใช้/ตัด/เชื่อมข้อความที่ตัวเองสร้างขึ้นเพื่อให้เสียงเป็นธรรมชาติ
- ขยายรายละเอียดเมื่อข้อมูลมีความสำคัญหรือมีหลายจุดที่ต้องอธิบาย
- เลือกความยาวตาม information density และความเสี่ยงของสถานการณ์
- ทำภาษาชุมชนให้อ่านง่าย
- เลือก emphasis จาก facts ที่มี

**หลักใหม่:** เราไม่บังคับ Gemini ให้พูดสั้นเพียงเพื่อประหยัดเวลา เพราะรายงานที่สั้นเกินไปอาจทำให้คนตีความสถานการณ์ผิด

### Gemini ทำไม่ได้

- สร้างตัวเลข
- สร้างสถานี
- สร้างถนน
- สร้างเวลา
- เปลี่ยน unknown เป็น normal/critical
- อ้างว่าปลอดภัยแน่นอน
- สร้างเหตุการณ์จากฝน forecast

## 5.4 Source transparency

ทุก fact สำคัญควร trace ได้:

`fact → normalized source → presentation → output`

สำหรับ debug ให้เก็บ `factsUsed` และ `warnings` ต่อไป

## 5.5 เมื่อเสร็จต้องเห็นอะไร

Developer ต้องสามารถเอา fixture เดียวกันไปสร้าง:

- Flex
- Audio

แล้วตรวจได้ว่า **ทั้งสองพูดเรื่องเดียวกันและ severity เดียวกัน**

### Exit criteria

- [ ] Presentation contract มี schema
- [ ] validator ตรวจ severity mismatch
- [ ] factsUsed traceable
- [ ] Gemini ไม่มีสิทธิ์เปลี่ยน source facts
- [ ] มี mock fixtures สำหรับทุก state

---

# 6. PHASE 3 — Adaptive Flex Implementation

## 6.1 เป้าหมาย

นำ design system + presentation contract ไปลงใน `src/flex` โดยเปลี่ยนจาก single tall bubble เป็น carousel ของ short bubbles ซึ่ง LINE รองรับให้หลาย bubbles วางเรียงด้านข้างและผู้ใช้เลื่อนดูได้ citeturn0search0turn0search2

## 6.2 งาน

### A. Refactor components

แยก component:

- `identityStrip`
- `floodHero`
- `trendBadge`
- `freshnessRow`
- `stationFact`
- `affectedArea`
- `actionGroup`
- `weatherSummary`
- `sourceFooter`
- `ctaButtons`

### B. Variant + carousel renderer

แนวคิด:

```text
renderFlex(presentationPlan)
  → selectVariant(severity)
  → buildCardSections()
  → orderCardsByImportance()
  → buildCarousel()
  → validateFlex()
  → validateCardLength()
  → validateCarouselConsistency()
```

### C. Smart station selection

ไม่ใช้ `stations.slice(0, 2)` แบบตายตัว

ให้คะแนนจาก:

- relevance ต่อพื้นที่
- severity
- trend
- freshness
- มีการเปลี่ยนแปลงหรือไม่
- ความสำคัญต่อผู้ใช้

แต่ต้อง **ไม่สร้าง station ใหม่**

### D. Card hierarchy + action hierarchy

Normal:
- ข้อมูล/แหล่งข้อมูลเป็นหลัก

Watch:
- ติดตามสถานการณ์
- ตรวจข้อมูลน้ำ

Affected:
- ดูสถานการณ์/เส้นทาง
- ติดตามจุดที่เกี่ยวข้อง

Critical:
- ปุ่มน้ำ/CCTV เด่นที่สุด
- ลด CTA รอง

Unknown:
- แหล่งข้อมูล + weather
- ไม่ทำให้ดูเหมือนสถานการณ์ปกติ

### E. AltText + carousel navigation cue

altText ต้องเป็น flood-first เช่น:

`รายงานสถานการณ์น้ำบ้านลำพาย: เฝ้าระวัง — มีข้อมูลควรติดตาม`

และ unknown ต้องพูดตรงว่า:

`รายงานสถานการณ์น้ำบ้านลำพาย: ยังยืนยันสถานการณ์น้ำไม่ได้`

## 6.3 Visual QA + Carousel QA

สร้าง fixture snapshots:

- short text
- long text
- many stations
- no stations
- affected area
- critical
- unknown
- stale

ตรวจ:

- overflow
- nesting
- button count
- text truncation
- visual hierarchy
- mobile height
- card-to-card continuity
- first-card self-contained understanding
- sideways-scroll usability
- no critical fact hidden only on a later card

## 6.4 เมื่อเสร็จต้องเห็นอะไร

เมื่อส่ง fixture 5 states เข้า renderer ต้องได้ Flex 5 แบบที่:

- severity ต่างกันเห็นได้ทันที
- **การ์ดแรกทำให้รู้สถานการณ์ได้ทันที**
- flood อยู่ในช่วงต้นของ carousel
- weather ไม่แย่งความเด่น
- critical ไม่รก
- unknown ไม่ถูกตีความว่า normal
- ปุ่มยังใช้งานได้
- altText ถูกต้อง
- ผู้ใช้ปัดไปอ่านรายละเอียดต่อได้โดยไม่เจอการ์ดที่สูงเกินจำเป็น

LINE ระบุว่า carousel เป็น container ที่มีหลาย bubbles วางด้านข้างและเลื่อนดูด้วยการ scroll แนวนอนได้ และควรหลีกเลี่ยง message ที่สูงเกินไปบนหน้าจอมือถือ

### Exit criteria

- [ ] Flex tests ผ่าน
- [ ] 5 variants render
- [ ] ทุก variant มี carousel card plan
- [ ] gradient + solid fallback ผ่าน
- [ ] CTA URL contract ผ่าน
- [ ] altText tests ผ่าน
- [ ] long-text fixtures ผ่าน
- [ ] mobile visual review ผ่าน

---

# 7. PHASE 4 — Adaptive Audio

## 7.1 เป้าหมาย

ทำให้ Audio เป็น “ผู้ประกาศสถานการณ์” ไม่ใช่แค่เอาข้อความ Flex ไปอ่านออกเสียง

## 7.2 Audio structure — Detailed Natural Announcement

Audio ไม่ควรถูกออกแบบให้ “สั้นที่สุด” แต่ควรถูกออกแบบให้ **ฟังแล้วเข้าใจสถานการณ์โดยไม่ต้องเดา**

แนวคิด:

1. เปิดรายงานและบอกสถานะน้ำ
2. อธิบาย facts สำคัญตามลำดับความสำคัญ
3. ระบุจุด/พื้นที่/ถนน/เวลาเฉพาะเมื่อ source ยืนยัน
4. อธิบายแนวโน้มและ freshness เมื่อช่วยตีความสถานการณ์
5. เชื่อม weather เฉพาะส่วนที่ช่วยให้เตรียมตัว โดยไม่เปลี่ยน forecast เป็น flood fact
6. บอก action/สิ่งที่ควรติดตาม
7. ปิดท้ายด้วยแหล่งข้อมูลหรือข้อจำกัดของข้อมูลเมื่อจำเป็น

นี่เป็น **content priority framework** ไม่ใช่ fixed script และไม่กำหนดจำนวนประโยคตายตัว

## 7.3 Adaptive duration + Gemini content freedom

ไม่กำหนด 2–3 นาที และไม่กำหนดความยาวสั้นตายตัว

ความยาวควรเกิดจาก **จำนวนและความสำคัญของข้อมูลจริง**:

- normal → รายงานครบแต่ไม่ยืดรายละเอียดที่ไม่มีประโยชน์
- watch → เพิ่มรายละเอียดจุด/แนวโน้ม/ช่วงเวลาที่ควรติดตาม
- affected → อธิบายผลกระทบ พื้นที่/ถนน และ action ให้เพียงพอ
- critical → รายละเอียดต้องเพียงพอต่อการตัดสินใจ แต่ตัดคำฟุ่มเฟือยและนำ action สำคัญขึ้นก่อน
- unknown → อธิบายข้อจำกัดของ source ให้ชัด พร้อมข้อมูล weather ที่มีจริง

**Gemini content freedom:** Gemini สามารถเลือกข้อความจาก draft ที่ตัวเองสร้างขึ้นมาใช้จริง ตัดข้อความซ้ำ รวมประโยค สลับลำดับ และขยายรายละเอียดได้ตามสถานการณ์ เพื่อให้การฟังเป็นธรรมชาติ โดย validator ต้องตรวจผลสุดท้ายกับ verified facts ก่อน TTS ทุกครั้ง

เป้าหมายจึงไม่ใช่ “เสียงสั้น” แต่คือ **เสียงที่ละเอียดพอ + ฟังเป็นธรรมชาติ + ไม่พูดเกินข้อเท็จจริง**

## 7.4 Voice profile

ยังคง:

- male-friendly = default
- female-friendly = optional

Style ต้องแยกจาก spoken text

ตัวอย่าง style concept:

- normal → warm / calm
- watch → calm alert
- affected → clear / concerned
- critical → urgent but controlled
- unknown → calm / transparent

ไม่ใช้โทนตื่นตระหนก

## 7.5 Audio QA

ตรวจอย่างน้อย:

- MP3 parse
- duration
- file size
- MIME
- public HTTPS
- playback
- ไม่มี silence ยาวผิดปกติ
- ไม่มี clipping ที่ฟังได้ชัด
- ไม่มีข้อความ/ตัวเลขที่ไม่อยู่ใน facts

## 7.6 เมื่อเสร็จต้องเห็นอะไร

สำหรับ fixture เดียวกัน:

- Flex บอก severity อะไร
- Audio ต้องบอก severity เดียวกัน
- Audio ต้องไม่พูด fact ที่ verified facts ไม่มี
- Audio มีรายละเอียดเพียงพอที่จะลดความเสี่ยงจากการตีความผิด
- Gemini มีอิสระด้านการเลือกข้อความ/ลำดับ/การเชื่อมภาษา แต่ผลสุดท้ายต้องผ่าน validator
- critical ฟังแล้วรู้ความเร่งด่วน
- unknown ฟังแล้วรู้ว่า “ยังยืนยันไม่ได้”
- normal ไม่ยืดด้วยข้อมูลที่ไม่มีประโยชน์

### Exit criteria

- [ ] male live test ผ่าน
- [ ] female live test ผ่านหรือมี approved fixture ตาม gate
- [ ] audio validator ผ่าน
- [ ] duration adaptive ตาม information density
- [ ] ไม่มี fixed short-duration cap ที่บังคับทุกวัน
- [ ] Gemini content freedom ผ่าน contract/validator
- [ ] safety text validation ผ่าน
- [ ] human listening review ผ่าน

---

# 8. PHASE 5 — Safety + Quality Firewall

## 8.1 เป้าหมาย

ก่อนส่ง LINE ต้องมี firewall สองชั้น:

**Content safety + Presentation quality**

## 8.2 Safety tests

ตรวจ:

### Forbidden certainty

ต้อง reject:

- “ปลอดภัยแน่นอน”
- “น้ำท่วมแน่นอน” เมื่อ facts ไม่ยืนยัน
- “ยืนยันว่าเกิดน้ำท่วม” เมื่อ facts ไม่รองรับ

### Forecast-only claim

ถ้ามีแต่ forecast ฝน:

ห้าม output:

> “ฝนจะทำให้น้ำท่วม”

แต่อนุญาตแนว:

> “มีฝนที่ควรติดตาม และควรตรวจสถานการณ์น้ำจากแหล่งข้อมูล”

### Fact leakage

ตรวจว่า:

- station names
- numbers
- times
- roads
- affected areas

อยู่ใน source facts จริง

## 8.3 Presentation quality score

สร้าง internal score เช่น:

- flood visibility
- freshness visibility
- action clarity
- source visibility
- text compactness ต่อ card
- carousel completeness
- accessibility
- audio consistency
- audio information sufficiency

คะแนนนี้ใช้ **ตรวจคุณภาพภายใน ไม่ใช่ส่งให้ผู้ใช้เป็น fact**

## 8.4 Regression matrix

ต้องรัน matrix:

| State | Fresh | Stale | Weather | No Weather | Long Text |
|---|---|---|---|---|---|
| normal | ✓ | ✓ | ✓ | ✓ | ✓ |
| watch | ✓ | ✓ | ✓ | ✓ | ✓ |
| affected | ✓ | ✓ | ✓ | ✓ | ✓ |
| critical | ✓ | ✓ | ✓ | ✓ | ✓ |
| unknown | ✓ | ✓ | ✓ | ✓ | ✓ |

## 8.5 เมื่อเสร็จต้องเห็นอะไร

ถ้ามี bug เช่น Gemini เขียน “ปลอดภัยแน่นอน”:

> pipeline ต้องหยุดก่อน TTS/LINE

ถ้า Flex แสดง critical แต่ report บอก watch:

> pipeline ต้อง fail validation

ถ้า source stale:

> output ต้องยังแสดง stale/unknown ตาม policy

### Exit criteria

- [ ] no-fabrication tests ผ่าน
- [ ] severity consistency ผ่าน
- [ ] stale/unknown ผ่าน
- [ ] regression matrix ผ่าน
- [ ] quality score ไม่ใช้แทน safety gate

---

# 9. PHASE 6 — End-to-End LINE Test Acceptance

## 9.1 เป้าหมาย

ทดสอบของจริงตั้งแต่ source ถึงมือถือ ไม่ใช่แค่ unit test

## 9.2 Test scenarios

อย่างน้อย:

1. normal day
2. watch day
3. affected fixture
4. critical fixture
5. unknown flood source
6. stale flood source
7. Gemini content retry/fallback
8. TTS male
9. TTS female
10. LINE delivery

## 9.3 ตรวจใน LINE จริง

ผู้ทดสอบต้องดู:

- Flex มาก่อน Audio
- flood status เห็นทันที
- อ่านบนมือถือได้
- ปุ่มกดได้
- ไม่มีข้อความล้น
- สีไม่ทำให้เข้าใจผิด
- altText ถูก
- Audio เล่นได้
- เสียงไม่เบา/ดัง/เร็วผิดปกติ
- เนื้อหาไม่กล่าวเกิน facts

## 9.4 Acceptance record

ทุก test run ต้องบันทึก:

- date/time
- fixture/source mode
- severity
- content model
- TTS model
- voice
- Flex result
- Audio result
- human reviewer result
- defects
- final PASS/FAIL

## 9.5 เมื่อเสร็จต้องเห็นอะไร

ผู้ใช้เปิด LINE TEST แล้วสามารถบอกได้ภายในไม่กี่วินาที:

> “วันนี้สถานการณ์น้ำเป็นอย่างไร”

และถ้ากดฟังเสียง:

> “เสียงพูดเรื่องเดียวกับ Flex และไม่พูดเกินข้อมูลจริง”

### Exit criteria

- [ ] LINE TEST delivery PASS
- [ ] mobile visual PASS
- [ ] audio playback PASS
- [ ] Flex → Audio ordering PASS
- [ ] safety/human content PASS
- [ ] degraded-mode PASS
- [ ] acceptance record committed

---

# 10. PHASE 7 — Release Readiness

## 10.1 เป้าหมาย

ปิดทุก release gate ก่อนเปิด schedule production

## 10.2 งาน

### Documentation consistency

ตรวจว่าเอกสารเหล่านี้ไม่ขัดกัน:

- README
- PRD
- ARCHITECTURE
- API
- REPOSITORY_STRUCTURE
- CHECKLIST
- CONTEXT
- DECISIONS
- CHANGELOG
- Phase status
- workflows

### Workflow

ตรวจ:

- schedule 06:00 Asia/Bangkok
- production secrets แยก TEST
- dry-run behavior
- retry
- duplicate guard
- status report
- audio public URL
- GitHub permissions

### Rollback

ต้องตอบได้:

- ถ้า Gemini ใช้ไม่ได้ทำอย่างไร
- ถ้า flood source ใช้ไม่ได้ทำอย่างไร
- ถ้า TTS ใช้ไม่ได้ทำอย่างไร
- ถ้า LINE ส่งไม่ได้ทำอย่างไร
- จะปิด production schedule อย่างไร

## 10.3 Production GO criteria

ต้องผ่านทั้งหมด:

- [ ] B1 flood source gate
- [ ] B2 degraded-mode gate
- [ ] B3 Gemini/model gate
- [ ] B4 documentation/test migration
- [ ] LINE TEST acceptance
- [ ] human visual acceptance
- [ ] human audio acceptance
- [ ] safety regression
- [ ] operational workflow review

ถ้ามีข้อใด FAIL → **NO-GO**

## 10.4 เมื่อเสร็จต้องเห็นอะไร

ก่อน production ต้องมีหลักฐานชุดเดียวที่ตอบได้ว่า:

> source ถูกต้อง → facts ถูกต้อง → presentation ถูกต้อง → audio ถูกต้อง → LINE ถูกต้อง → rollback ทำได้

---

# 11. สิ่งที่จะสร้าง/แก้ใน Repository

## Phase 0–2: Design / Contract

อาจเพิ่ม:

```text
docs/
  V1_5_VISUAL_UX_BLUEPRINT.md
  V1_5_ACCEPTANCE_MATRIX.md

src/
  content/
    presentationPlan.js
    presentationValidator.js
  flex/
    tokens.js
    variants/
      normal.js
      watch.js
      affected.js
      critical.js
      unknown.js
  audio/
    styles.js

tests/
  presentationPlan.test.js
  presentationValidator.test.js
  flexVariants.test.js
```

> ชื่อไฟล์เป็น design target; ก่อนสร้างจริงต้องตรวจโครงสร้างปัจจุบันและ reuse ของเดิมก่อน เพื่อไม่สร้าง module ซ้ำ

## Phase 3–4: Runtime

เป้าหมายหลัก:

- `src/flex/builder.js`
- `src/flex/components.js`
- `src/flex/themes.js` หรือ token module ที่เหมาะสม
- `src/content/geminiReport.js`
- `src/audio/tts.js`
- `src/audio/validate.js`

## Phase 5–7: QA / Ops

เพิ่มตามความจำเป็น:

- fixtures
- validators
- visual QA tests
- audio QA tests
- LINE acceptance workflow
- acceptance records
- phase status docs

---

# 12. Definition of Done ของ V1.5

V1.5 ถือว่า “เสร็จ” เมื่อผู้ใช้ไม่ต้องอ่านข้อความยาวเพื่อเข้าใจ 3 เรื่องนี้:

### 1. สถานการณ์น้ำคืออะไร?

เห็นจาก Hero + label + trend

### 2. ข้อมูลสดแค่ไหน?

เห็นจาก update/freshness

### 3. ตอนนี้ควรทำอะไร?

เห็นจาก action

และเมื่อกดฟังเสียง:

- เสียงสอดคล้องกับ Flex
- เสียงมีรายละเอียดเพียงพอต่อความเข้าใจ
- ความยาวเกิดจากข้อมูล ไม่ใช่เพดานตายตัว
- Gemini เลือกใช้ข้อความที่ตัวเองสร้างขึ้นได้อย่างเป็นธรรมชาติ
- เสียงไม่สร้าง fact
- น้ำเป็นเรื่องแรก
- weather เป็นเรื่องประกอบ
- unknown/stale พูดอย่างโปร่งใส

---

# 13. ลำดับการทำงานจริงหลัง Blueprint

เพื่อไม่ให้รื้อซ้ำ ให้ทำตามนี้:

```text
Phase 0
  ↓
Phase 1 — Visual System
  ↓
Phase 2 — Presentation Contract
  ↓
Review / Approve
  ↓
Phase 3 — Flex Implementation
  ↓
Phase 4 — Audio
  ↓
Phase 5 — Safety + QA
  ↓
Phase 6 — LINE TEST
  ↓
Phase 7 — Release Readiness
  ↓
GO / NO-GO
```

### กฎสำคัญ

**ทุก Phase ต้องหยุดตรวจผลก่อนเริ่ม Phase ถัดไป**

ไม่ใช่ทำโค้ดรวดเดียวแล้วค่อยตรวจท้ายสุด

---

# 14. สิ่งที่ผู้ใช้ควรเห็นในแต่ละ Phase

| Phase | สิ่งที่ควรเห็นจริง |
|---|---|
| 0 | เอกสาร + baseline ว่าของเดิมทำอะไรได้ |
| 1 | แบบ Flex 5 states ที่แตกต่างชัดเจน |
| 2 | ตัวอย่าง verified facts → presentation plan |
| 3 | Flex 5 states render จาก fixtures |
| 4 | Audio 5 states ที่มีบุคลิกและความยาวต่างกัน |
| 5 | Test report ว่าข้อมูลผิด/เกินจะถูกบล็อก |
| 6 | ข้อความ Flex + Audio จริงใน LINE TEST |
| 7 | Release checklist และหลักฐาน GO/NO-GO |

---

# 15. Recommended execution policy

### P0 — ต้องทำก่อน

1. Phase 0 baseline
2. Phase 1 visual system + carousel design
3. Phase 2 presentation contract + audio freedom policy
4. Phase 3 adaptive Flex carousel
5. Phase 5 safety firewall

### P1 — ทำต่อทันที

6. Phase 4 adaptive audio
7. smart station selection
8. weather risk context
9. source transparency
10. audio QA

### P2 — หลัง V1.5 stable

11. daily history
12. change-from-yesterday
13. operational quality dashboard
14. community announcement layer

สิ่งเหล่านี้ไม่ควรแทรกเข้ามาระหว่าง P0 เพราะจะทำให้ scope แตก

---

# 16. Final acceptance statement

V1.5 ไม่ได้วัดความสำเร็จจาก “หน้าตาสวยขึ้น” เพียงอย่างเดียว

ต้องวัดจาก:

**เร็วขึ้นในการเข้าใจ + รายละเอียดเพียงพอไม่ให้ตีความผิด + ชัดขึ้นในการตัดสินใจ + ปลอดภัยขึ้นในการสื่อสาร + ตรวจสอบย้อนกลับได้ + ไม่ทำลาย runtime เดิม**

ดังนั้นทุก feature ใหม่ต้องผ่านคำถาม 5 ข้อ:

1. ข้อมูลนี้มาจาก fact ไหน?
2. ผู้ใช้เข้าใจเร็วขึ้นหรือไม่?
3. ถ้าข้อมูล source หาย/stale จะยังพูดอย่างถูกต้องหรือไม่?
4. Flex กับ Audio สอดคล้องกันหรือไม่?
5. ถ้าคำตอบไม่แน่นอน ระบบยอมบอกว่า “ยังยืนยันไม่ได้” หรือไม่?

ถ้าตอบไม่ได้ → **ยังไม่ควรนำเข้า production**

---

## Current status

**Phase 0 update — 2026-10-04:** Baseline/runtime inventory, invariants, fixture set, acceptance matrix, and V1.5 change boundary are locked in `docs/V1_5_PHASE0_BASELINE.md`. Phase 0 is complete. Production remains NO-GO.


- [x] V1.0 Flood-first scope locked
- [x] Gemini live acceptance passed
- [x] LINE TEST delivery passed
- [x] V1.5 Phase 0 — Baseline & Design Lock complete
- [x] V1.5 Phase 1 — Visual Design System complete
- [ ] V1.5 Phase 2
- [ ] V1.5 Phase 3
- [ ] V1.5 Phase 4
- [ ] V1.5 Phase 5
- [ ] V1.5 Phase 6
- [ ] V1.5 Phase 7
- [ ] Production GO

**Phase 1 update — 2026-10-04:** Visual tokens, five severity themes, carousel/card hierarchy, mobile/accessibility rules, CTA scope, and stale/unknown treatment are locked in `docs/V1_5_PHASE1_VISUAL_SYSTEM.md`. Phase 1 is complete. Production remains NO-GO.

**สถานะ production ปัจจุบัน: NO-GO จนกว่า release gates จะผ่านครบ**


---

> **V1.6 note (2026-10-04):** Phase 3 (Adaptive Flex) and Phase 4 (Adaptive Audio) are **reopened**. The implemented contract kept only string cards and one `spokenText`, so the components, tokens and variants specified above were never built and the audio-length policy in §7.3 is superseded by Decision 022 (Audio > 10 minutes). See `docs/REVIEW_V1_6_PRESENTATION_REDESIGN.md`.
