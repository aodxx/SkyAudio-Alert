# SkyAudio-Alert — Scope Review Report

**วันที่ตรวจ:** 2026-10-03  
**โปรเจกต์:** SkyAudio-Alert — น้องจุ่นจ้าน  
**ผู้รับรายงาน:** ทีมพัฒนา/เจ้าของระบบ  
**สถานะ:** Implementation gate — Phase 1–3 ทำ contract, adapters และ flood-first runtime แล้ว; ยังไม่เปิด production schedule จนกว่าจะผ่าน Gemini/LINE acceptance  
**แหล่งเอกสารที่ตรวจ:** README, PRD, ARCHITECTURE, API, REPOSITORY_STRUCTURE, CHECKLIST, CONTEXT, DATABASE, DECISIONS, CHANGELOG, PHASE1_STATUS, workflows, `.env.example`, source tree, tests, status report และ design/refactor docs

---

## 1. Executive Summary

ผู้ใช้ยืนยัน product direction ใหม่ดังนี้:

> เปลี่ยนจากรายงานอากาศ + ราคาปาล์ม/ยาง + ข่าวสาร เป็น **รายงานสถานการณ์น้ำท่วมเป็นหลัก + พยากรณ์อากาศ** สำหรับกลุ่ม LINE บ้านลำพาย โดยยังคง Flex Message และ Audio Message แต่รื้อเนื้อหา/หน้าตาใหม่

รายละเอียดที่ยืนยันเพิ่มเติม:

- Flex ต้องมีปุ่มใหญ่สำหรับ [ดูสถานะน้ำ/CCTV](https://cctv.maholan.net/) และ [สถานการณ์น้ำพัทลุง/แหล่งข้อมูล](https://chachoengsao-flood.vercel.app/phatthalung)
- พิจารณาเพิ่มปุ่ม [พยากรณ์อากาศ/เรดาร์ฝน](https://chachoengsao-flood.vercel.app/phatthalung/weather) ซึ่งตรวจแล้วเป็นหน้าพยากรณ์อากาศ ฝน ลม เรดาร์ฝน และแผนที่พยากรณ์ 3 วัน โดยระบุ Open-Meteo เป็นแหล่งพยากรณ์
- คงชื่อและบุคลิก **น้องจุ่นจ้าน**
- รายงานเสียงเป็นกันเอง ไม่ตึงเครียด รองรับเสียงชายและหญิง
- **ไม่มีความยาวเสียงตายตัว** และ **ไม่มีโครงรายงานตายตัว**
- ใช้ **Gemini สร้างเนื้อหา** จาก facts ที่ตรวจสอบแล้ว และใช้ **Gemini TTS** สร้างเสียง
- Flex ต้อง compact ไม่กินพื้นที่หน้าแชท แบ่งข้อมูลเป็นกลุ่มด้วย gradient
- ราคาปาล์ม ราคายาง และข่าวสารทั่วไปถูกถอดออกจาก production scope

### ผลการตรวจ readiness

**เขียน runtime flood-first แล้ว แต่ยังไม่ผ่าน Go/No-Go สำหรับ production schedule** เนื่องจากยังมี release gates เหล่านี้:

1. **Flood data contract ยังไม่ใช่ API ทางการ:** Phase 2 เพิ่ม server-rendered HTML adapter ที่อ่านแถวสถานีจากหน้า flood center และ fail closed เมื่อโครงสร้างเปลี่ยน; ยังต้องเฝ้าระวังความเสถียรของหน้าเว็บ
2. **ยังไม่ตัดสินใจ degraded mode:** เมื่อ flood source timeout/stale จะส่ง weather-only, ส่ง unknown + audio, หรือไม่ส่งทั้งชุด
3. **Gemini model contract ยังไม่ยืนยัน:** ต้องตรวจ model ID, endpoint, structured output, quota และ Gemini TTS response ของ API key จริงก่อน implement แบบผูก endpoint
4. **Gemini/LINE acceptance ยังไม่ผ่าน:** ต้องทดสอบ model/voice จริงและส่งกลุ่มทดสอบก่อนเปิด schedule

**สิ่งที่ทำได้ทันทีโดยไม่เสี่ยง:** สร้าง domain contracts, fixtures, validators, dry-run interfaces และ test plan โดยยังไม่เปิด schedule production ใหม่

---

## 2. Scope ที่ตกลงแล้ว

### 2.1 In Scope — ต้องทำในรอบปรับผลิตภัณฑ์

| พื้นที่ | ขอบเขตที่ตกลง |
|---|---|
| ผู้รับสาร | LINE กลุ่มบ้านลำพาย ต.โคกชะงาย อ.เมือง จ.พัทลุง |
| เวลา | รายงานเช้าประมาณ 06:00 Asia/Bangkok ตาม scheduler เดิม |
| ช่องทาง | ส่ง LINE Flex ก่อน แล้วส่ง LINE Audio Message |
| เนื้อหาหลัก | สถานการณ์น้ำท่วม/ระดับน้ำ/จุดเสี่ยง/แนวโน้ม/คำแนะนำความปลอดภัย |
| เนื้อหารอง | พยากรณ์อากาศจาก Open-Meteo เพื่ออธิบายฝน ลม ความร้อน และผลกระทบที่อาจเกี่ยวข้อง |
| ตัวตน | น้องจุ่นจ้าน น้ำเสียงเป็นกันเอง ไม่ตื่นตระหนก |
| เสียง | โปรไฟล์ชายและหญิง; ค่าเริ่มต้นชายจนกว่าจะมีการเปลี่ยน config |
| Content generation | Gemini สร้าง narrative จาก normalized facts; ไม่ใช้ template หรือลำดับหัวข้อบังคับ |
| TTS | Gemini TTS model/voice ที่ตั้งค่าได้; ต้อง validate availability ก่อน deploy |
| Flex | flood-first, compact, gradient groups, อ่านเร็ว, รองรับผู้สูงอายุ |
| ปุ่มหลัก | CCTV และศูนย์ข้อมูลน้ำพัทลุงตาม URL ที่ยืนยัน; เพิ่มปุ่มพยากรณ์อากาศ/เรดาร์ฝนเป็น secondary เมื่อพื้นที่ Flex รองรับ |
| Safety | freshness, unknown, no-fabrication, severity priority, source attribution และ fallback |
| Operations | dry-run, retry, duplicate guard, status report และ public audio validation ตามกลไกเดิมที่ยังใช้ได้ |

### 2.2 Explicitly Out of Scope — ห้ามกลับเข้ามาใน production รอบนี้

- ราคาปาล์มน้ำมัน
- ราคายางพารา
- ข่าวสาร/ข่าวประชาสัมพันธ์ทั่วไป
- OCR/Tesseract สำหรับอ่านภาพราคา
- การ scrape หน้าเว็บ CCTV หรือศูนย์ข้อมูลโดยถือว่าเป็น API โดยยังไม่มี contract
- การให้ Gemini ค้นเว็บหรือดึงข้อเท็จจริงเองในขั้นสร้างบทพูด
- การสรุปว่า “น้ำท่วมจริง” จาก forecast ฝนเพียงอย่างเดียว
- Full website, PWA, chatbot, member profile, personalization หรือหลายหมู่บ้าน
- การ monitor แบบนาทีต่อนาที
- การให้ AI agent ของ Manus อยู่ใน production runtime
- การส่งข้อความยาวหรือข้อมูลทุกจุดวัดโดยไม่คัดกรอง

### 2.3 Deferred — เก็บไว้หลังรอบแรกผ่าน acceptance

- หลายหมู่บ้าน/หลาย LINE group
- dashboard ประวัติระดับน้ำ
- notification นอกเวลารายงานเช้า
- nowcasting หรือการพยากรณ์น้ำแบบเฉพาะพื้นที่
- community board/PWA
- การให้ผู้ดูแลเลือกเสียงจาก LINE
- multi-speaker หรือเสียงสนทนา
- database สำหรับ history/analytics
- แหล่งข้อมูลน้ำเพิ่มเติมหลังมี source contract หลักที่เสถียร

---

## 3. Product behavior ที่ต้องยึด

### 3.1 ลำดับความสำคัญของข้อเท็จจริง

ระบบต้องแยก 3 ชั้นให้ชัด:

```text
Flood source facts  ─┐
                     ├─ deterministic normalize/analyze ─→ safe report context
Weather facts      ──┘                                      ↓
                                                   Gemini narrative
                                                           ↓
                                                   validator
                                                           ↓
                                                   Gemini TTS
```

- Flood facts เป็นหลักฐานสถานการณ์น้ำ
- Weather facts เป็น forecast/ความเสี่ยงประกอบ
- Gemini เป็นผู้เรียบเรียงและเลือกความยาว ไม่ใช่ source of truth
- Validator และ fallback มีสิทธิ์ปฏิเสธข้อความจาก Gemini

### 3.2 Adaptive narrative

ไม่มี target duration และไม่มีลำดับหัวข้อบังคับ:

- วันปกติ: สั้น เป็นกันเอง ไม่เติม filler
- วันเฝ้าระวัง: เน้นเวลาอัปเดต จุดที่ต้องติดตาม และการเตรียมตัว
- วันได้รับผลกระทบ: เน้นพื้นที่/ถนน/สิ่งที่ควรทำ
- วันวิกฤต: คำเตือนและความปลอดภัยมาก่อนทุกอย่าง
- ข้อมูล unknown/stale: พูดข้อจำกัดตรง ๆ และชวนเปิด source link

ข้อห้ามที่เป็น hard rule:

- ห้ามสร้างตัวเลข เวลา จุดวัด ถนน หรือเหตุการณ์ที่ไม่มีใน facts
- ห้ามใช้ forecast เป็นหลักฐานน้ำท่วมจริง
- ห้ามพูดราคาปาล์ม/ยางหรือข่าวทั่วไป
- ห้ามพูด “ปลอดภัยแน่นอน”
- ห้ามพูด URL ยาว ๆ ในเสียง

### 3.3 Compact Flex

การ์ดต้องประกอบด้วยกลุ่มสั้น ๆ:

1. Identity — น้องจุ่นจ้าน/บ้านลำพาย/เวลา
2. Flood — ระดับสถานการณ์, อัปเดต, แนวโน้ม, จุดสำคัญ, action
3. Actions — ปุ่ม CCTV และศูนย์ข้อมูลน้ำพัทลุง; ปุ่มพยากรณ์อากาศ/เรดาร์ฝนเป็น secondary
4. Weather — อุณหภูมิ/ช่วงฝน/ลมที่จำเป็น
5. Footer — source สั้น ๆ และชวนฟังเสียง

ไม่ใช้ภาพ header สูง 200px ในการ์ดหลัก และไม่ใส่ hourly forecast หลายช่องใน version ใหม่

---

## 4. Scope / Parts ที่ต้อง implement

### Part A — Source and data contracts

**ต้องสร้าง:**

- `src/flood/` adapter, normalize, analyzer, source contract
- `FloodSituation` schema
- freshness/stale/unknown policy
- fixture ปกติ/เฝ้าระวัง/ได้รับผลกระทบ/วิกฤต/unknown

**ต้องตัดสินใจก่อน production:**

- machine-readable source หลัก
- source fallback
- timestamp ที่ถือเป็น observed/published/retrieved
- freshness limit
- mapping severity
- พื้นที่/สถานีใดเกี่ยวข้องกับบ้านลำพาย

### Part B — Weather

**คงไว้:**

- Open-Meteo adapter
- normalize และ deterministic weather analyzer
- rain/wind/heat signals

**เพิ่ม:**

- context สำหรับ flood risk โดยไม่ promote forecast เป็น flood fact
- source timestamp และ weather freshness ใน report context

### Part C — Content generation

**ต้องสร้าง:**

- `src/content/geminiReport.js`
- input facts contract
- prompt ที่บังคับ no-fabrication และ tone
- structured output parser
- validator ตรวจ facts/priority/forbidden topics
- deterministic short fallback

**Gemini output ขั้นต่ำ:**

```json
{
  "spokenText": "...",
  "shortSummary": "...",
  "priority": "normal|watch|affected|critical|unknown",
  "actions": ["..."],
  "factsUsed": ["..."],
  "warnings": []
}
```

### Part D — Gemini TTS

**ต้องปรับ:**

- `TTS_PROFILE=male-friendly|female-friendly`
- voice mapping ชาย/หญิง
- `GEMINI_CONTENT_MODEL`
- `GEMINI_TTS_MODEL`
- style instructions แยกจาก Thai spoken text ด้วย `:`
- ตรวจ WAV/MP3/encoding/duration/LINE URL หลังสร้าง

**ก่อน implement ต้องตรวจ:** model ID, endpoint, API request shape, response audio encoding, structured output support, quota, retryability และราคา/ข้อจำกัดของ key จริง

### Part E — Flex

**ต้องรื้อ:**

- `src/flex/components.js`
- `src/flex/builder.js`
- `src/flex/themes.js` ถ้าต้องเพิ่ม flood palette

**ต้องมี:**

- compact identity strip
- flood status hero
- gradient groups + solid fallback
- [ ] ปุ่ม URI 3 ปุ่มตาม URL ที่ยืนยัน โดย weather เป็น secondary
- altText flood-first
- normal/watch/affected/critical/unknown rendering

### Part F — Pipeline and operations

**ต้องรื้อ:**

- `src/core/pipeline.js` ลบ market/news stages
- status stages เป็น flood/weather/content/flex/tts/audio/line
- duplicate guard คงไว้
- dry-run ต้องไม่ส่ง LINE และไม่ commit audio
- failure policy ต้องไม่รายงาน success เมื่อ flood/content/TTS stage ที่ required ล้มเหลว

### Part G — Tests and fixtures

**ต้องเพิ่ม/แก้:**

- flood adapter/normalize/analyzer tests
- stale/unknown/no-fabrication tests
- Gemini structured output/validator/fallback tests โดย mock API ไม่เรียก model จริงใน unit tests
- male/female TTS config tests
- Flex gradient/button/compact/altText tests
- pipeline stage and degraded-mode tests
- ลบ/ย้าย tests ที่ยืนยัน market/news production behavior

### Part H — Documentation and workflows

- README/PRD/Architecture/API/Repository Structure/Checklist/Context/Phase/Changelog ต้องเป็น scope เดียวกัน
- `.env.example` ต้องไม่มี market/OCR เป็น required runtime config
- workflow ต้องไม่ติดตั้ง Tesseract/OCR ถ้าไม่ใช้
- workflow ต้องใช้ Gemini content + TTS secrets/model config
- status JSON ต้องไม่กล่าวว่า market/news สำเร็จ

---

## 5. Blockers ที่ต้องปิดก่อน Go

| ID | Blocker | ผลกระทบ | ผู้ตัดสินใจ/หลักฐานที่ต้องมี |
|---|---|---|---|
| B1 | flood machine-readable source/API | ไม่มี API ทางการที่ยืนยัน; Phase 2 ใช้ strict HTML adapter ชั่วคราว | ต้องยืนยัน API/contract ที่เสถียรก่อน production ระยะยาว; adapter ปัจจุบันมี fixture และ fail-closed |
| B2 | source failure mode | กระทบว่าจะส่งอะไรเมื่อข้อมูลน้ำใช้ไม่ได้ | เลือก `unknown + weather`, `no send`, หรือ degraded policy อื่นแบบชัดเจน |
| B3 | Gemini model contract | กระทบ module/API schema และ workflow secrets | ทดสอบ model catalog/key จริง, request/response fixture, quota/error behavior |
| B4 | document/test migration | เสี่ยงโค้ดใหม่ยังถูกทดสอบด้วย market/news/fixed duration | update matrix และ acceptance ใหม่ให้ครบก่อน implementation |

### คำแนะนำ default หากต้องตัดสินใจเร็ว

- B1: Phase 2 เชื่อมหน้า flood center แบบ read-only โดย parse เฉพาะข้อมูลสถานีที่ server-rendered; ถือเป็น adapter ชั่วคราว ไม่ใช่ API guarantee
- B2: ส่ง Flex flood status เป็น `unknown` + weather forecast ได้เฉพาะเมื่อระบุชัดว่า **ยังยืนยันสถานการณ์น้ำไม่ได้**; ไม่ส่งข้อความที่ดูเหมือนยืนยันน้ำท่วม
- B3: model/voice ต้องตั้งผ่าน environment และมี mock contract; ห้ามผูก logic กับชื่อรุ่นตัวอย่างก่อนตรวจจริง
- B4: เขียน tests/contracts ก่อน adapter จริง เพื่อลดการสะดุดระหว่างรื้อ pipeline

---

## 6. เอกสารที่ตรวจและสถานะ

| เอกสาร/พื้นที่ | สถานะ ณ audit | ปัญหา | การดำเนินการ |
|---|---|---|---|
| `README.md` | ปรับบางส่วนแล้ว | workflow ยังมีคำ weather เดิมบางจุด | เพิ่มลิงก์รายงานและแก้ production wording ให้สอดคล้อง |
| `PRD.md` | legacy + revision notice | เนื้อหาหลักจำนวนมากยัง weather/market/fixed order | ใช้รายงานนี้เป็น scope gate; อัปเดต sections ก่อน coding |
| `ARCHITECTURE.md` | stale | flow ยัง market/news และไม่มี flood/content layer | rewrite data flow/failure policy |
| `API.md` | stale | ไม่มี flood/Gemini content contract | เพิ่ม internal/external contracts |
| `REPOSITORY_STRUCTURE.md` | stale | ไม่มี `src/flood`, `src/content`, fixtures ใหม่ | อัปเดต tree/dependency/order |
| `CHECKLIST.md` | stale | checklist ผ่านด้วย market/news และยังไม่ครอบคลุม flood | replace with new readiness/acceptance checklist |
| `CONTEXT.md` | stale | ยังบอก focus weather/market และ future LLM | rewrite current direction; preserve historical acceptance as archive |
| `DATABASE.md` | mostly valid | ต้องเพิ่ม flood freshness/history decision | ยืนยัน no DB ในรอบแรก พร้อมเหตุผล |
| `DECISIONS.md` | current additions | มี ADR เก่าที่ต้องทำเครื่องหมาย superseded | คง history และใช้ Decision 014/015 เป็น current direction |
| `CHANGELOG.md` | historical | มีรายการ Phase 1 market/news ที่อ่านเหมือน current | เพิ่ม pivot entry และ mark old entries historical |
| `PHASE1_STATUS.md` | stale | ระบุ market/news และ fixed duration เป็น current | rewrite as scope-review/pre-implementation status |
| `.env.example` | stale | Google TTS/old variables; ไม่มี flood/Gemini content/profile | update env contract |
| `weather-daily.yml` | stale operationally | ติดตั้ง OCR และส่ง market/news assumptions | update only after B1–B3 are closed |
| `weather-test.yml` | stale operationally | ชื่อ weather, OCR และ TTS style ราคาสินค้า | update with new dry-run inputs |
| `src/market`, `src/news` | out of production scope | tests/pipeline ยัง import อยู่ | archive/remove after dependency audit |
| `src/forecast/thaiScript.js` | stale implementation | fixed script + market/news | replace with facts/context and Gemini layer |
| `src/flex/*` | stale implementation | weather-first/full header/hourly layout | replace with compact flood-first card |
| tests | stale baseline | 24 tests pass แต่ยืนยัน behavior เก่า | preserve useful audio/LINE tests; replace scope-specific tests |
| `public/status/last-run.json` | historical/stale | stages ยัง market/news | regenerate after pipeline migration |
| `research/RESEARCH_PRICE_SOURCES.md` | archive only | ไม่ใช่ production input | keep as historical archive with clear banner |

---

## 7. Acceptance ก่อนเปิด production

### Data and safety

- [ ] Flood source หลักและ fallback มี contract และหลักฐานการเข้าถึง
- [ ] ทุกสถานการณ์มี freshness/observed time/retrieved time ตามที่เหมาะสม
- [ ] stale/unknown ไม่ render เป็น normal หรือ safe โดยปริยาย
- [ ] forecast ฝนไม่ถูก promote เป็น flood fact
- [ ] severity priority ผ่าน tests
- [ ] Gemini ไม่มีสิทธิ์เพิ่ม facts นอก input

### Content and audio

- [ ] Gemini structured output parser/validator ผ่าน fixtures
- [ ] fallback ใช้ได้เมื่อ Gemini timeout/invalid/429/5xx
- [ ] รายงานวันปกติสั้นได้ และรายงาน critical ขยายได้โดยไม่ใช้ template บังคับ
- [x] ไม่มี market/news ใน prompt input, output validation และ audio runtime
- [ ] male/female profile ผ่านการทดสอบกับ Gemini TTS จริงหรือ approved fixture
- [ ] model/voice ตั้งค่าผ่าน env และมี versioned config
- [ ] audio MP3/HTTPS/content-type/duration ผ่าน LINE contract

### Flex and delivery

- [ ] compact card อ่านสถานะน้ำได้ก่อน weather
- [ ] มีปุ่ม CCTV และศูนย์ข้อมูลน้ำพัทลุง URI ถูกต้อง
- [ ] ปุ่มพยากรณ์อากาศ/เรดาร์ฝนใช้ URI ถูกต้องและไม่ทำให้ compact Flex รก; เมื่อ critical ต้องไม่แย่งความเด่นจากปุ่มน้ำ
- [ ] normal/watch/affected/critical/unknown มี gradient/solid fallback
- [ ] ไม่มีภาพ header ใหญ่หรือ hourly layout ที่กินพื้นที่เกินจำเป็น
- [ ] ส่ง Flex แล้ว Audio ตามลำดับ
- [ ] dry-run ไม่ส่ง LINE/ไม่ commit audio
- [ ] duplicate guard และ status report ทำงานกับ stage ใหม่

### Operations

- [ ] workflow ไม่ติดตั้ง OCR/market tooling
- [ ] secrets มี Gemini content/TTS และ LINE ครบ
- [ ] retry policy แยก retryable/non-retryable
- [ ] production schedule เปิดหลัง test LINE และ human playback acceptance ใหม่
- [ ] run status ไม่รายงาน stage เก่า

---

## 8. Implementation order หลังปิด Blockers

1. **Document lock:** อัปเดตเอกสารหลักทั้งหมดให้ใช้ scope เดียวกัน
2. **Contracts first:** สร้าง `FloodSituation`, report context, Gemini output schema และ config schema
3. **Fixtures/tests:** สร้าง fixtures ทุก severity และ mock Gemini responses
4. **Flood adapter:** ต่อ source ที่อนุมัติ, normalize, freshness, analyzer
5. **Weather context:** คง Open-Meteo และแยก weather risk จาก flood evidence
6. **Gemini content layer:** generate → parse → validate → deterministic fallback
7. **Flex redesign:** compact flood-first + gradient + 2 URI buttons
8. **Gemini TTS adapter:** profile/model config → audio validation/storage
9. **Pipeline migration:** ตัด market/news, ปรับ stages/status/error policy
10. **Workflow migration:** secrets/env/install steps/schedule naming
11. **Dry-run:** fixture → real source read-only → mock/content → real Gemini test
12. **Test LINE:** ส่ง Flex + Audio หลาย severity และฟังจริง
13. **Production rollout:** เปิด schedule หลัง acceptance ทุกข้อผ่าน

---

## 9. Go / No-Go decision

### ตอนนี้: **NO-GO สำหรับ production schedule; runtime flood-first พร้อม dry-run**

สามารถทำต่อได้เฉพาะการยืนยัน Gemini/LINE, human playback และการปรับ source health; pipeline ใหม่ผ่าน local dry-run แล้ว

### จะเปลี่ยนเป็น GO เมื่อ

- B1–B4 มี implementation หรือ gate status และถูกบันทึกใน `DECISIONS.md`/`docs/PHASE3_STATUS.md`
- เอกสารหลักไม่ขัดกันเรื่อง market/news, fixed duration, Gemini และ flood source
- test plan ใหม่ถูกเขียนก่อนลบ/เปลี่ยน behavior เดิม
- มีการยืนยันว่า URL หน้าเว็บกับ API source มีบทบาทแยกกัน

---

## 10. Source of truth หลังรายงานนี้

หากเอกสารเก่าขัดกับรายงานนี้ ให้ยึดลำดับ:

1. ข้อกำหนดที่ผู้ใช้ยืนยันล่าสุด
2. `docs/SCOPE_REVIEW_REPORT.md`
3. `DECISIONS.md` Decision 014–015 และ ADR ใหม่ที่เพิ่มหลังจากนี้
4. `docs/DESIGN_AUDIO_FLEX_FLOOD_DAILY.md`
5. `docs/REFACTOR_PLAN_FLOOD_WEATHER.md`
6. เอกสาร historical/legacy อื่น ๆ จนกว่าจะอัปเดตเสร็จ

**ข้อสรุป:** ยังไม่ควรรีบเขียนโค้ดจริงเพื่อหลีกเลี่ยงการรื้อซ้ำ ให้ปิด contract ของ flood source และ Gemini ก่อน จากนั้นอัปเดตเอกสารหลักให้เป็นชุดเดียว แล้วจึงเริ่ม implementation ตามลำดับในรายงานนี้
