# SkyAudio-Alert — แผนปรับผลิตภัณฑ์: น้ำท่วมเป็นหลัก + พยากรณ์อากาศ

> **Pre-implementation gate:** ให้ใช้ [`SCOPE_REVIEW_REPORT.md`](SCOPE_REVIEW_REPORT.md) เป็นรายงานตรวจ scope/parts และ blocker กลางก่อนเริ่มทำตามแผนนี้

**สถานะ:** Draft สำหรับใช้เป็นแผนงานและ source of truth ก่อนเริ่มแก้โค้ด  
**วันที่จัดทำ:** 2026-10-03  
**รีโป:** `aodxx/SkyAudio-Alert`  
**ขอบเขตเฟสนี้:** รื้อรายงานเช้าจาก “อากาศ + ราคาปาล์ม/ยาง + ข่าวสาร” เป็น “สถานการณ์น้ำท่วม + พยากรณ์อากาศ” โดยยังส่ง **LINE Flex + LINE Audio Message** เช่นเดิม

**ข้อกำหนดที่ยืนยันเพิ่มเติม:** ใช้ชื่อ/บุคลิก **น้องจุ่นจ้าน** เหมือนเดิม และส่งเข้า LINE กลุ่มบ้านลำพาย (ตีความคำว่า “บ้านลำพาล” ในคำขอเป็นบ้านลำพายตามบริบทรีโปเดิม) โดยเพิ่มปุ่มใหญ่ใน Flex ดังนี้:

1. **ดูสถานะน้ำ / CCTV** → `https://cctv.maholan.net/`
2. **สถานการณ์น้ำพัทลุง / แหล่งข้อมูลรายงาน** → `https://chachoengsao-flood.vercel.app/phatthalung`
3. **พยากรณ์อากาศ / เรดาร์ฝน** → `https://chachoengsao-flood.vercel.app/phatthalung/weather` (ปุ่มเสริมด้าน Weather; ไม่แย่งความเด่นจาก 2 ปุ่มสถานการณ์น้ำ)

การตรวจสอบหน้าเว็บวันที่ 2026-10-03 พบว่าเว็บแรกมีแผนที่/กล้องสด/จุดเฝ้าระวังน้ำท่วมและ AI ตรวจภาพกล้อง ส่วนเว็บที่สองมีสถานการณ์น้ำ ระดับน้ำตามจุดวัด พยากรณ์ฝน แผนที่ และแหล่งอ้างอิงข้อมูลระดับน้ำ จึงใช้เป็น **ลิงก์ให้ชุมชนเปิดดูข้อมูลต้นทาง** และเป็นแหล่งอ้างอิงของรายงาน ไม่ควรถือว่าหน้าเว็บทั้งสองเป็น API โดยอัตโนมัติจนกว่าจะตรวจ contract การอ่านข้อมูลแยกต่างหาก

**Design direction ที่อนุมัติ:** รายงานเสียงมี 2 โปรไฟล์ `female-friendly` และ `male-friendly` โดยค่าเริ่มต้นเป็นเสียงชาย; Gemini สร้างเนื้อหาและเลือกความยาว/ลำดับตามข้อมูลสำคัญของแต่ละวันโดยไม่ใช้ template ตายตัว จากนั้นใช้ Gemini TTS model ที่ตั้งค่าได้; Flex เป็น compact flood card แบ่งกลุ่มด้วย gradient และไม่มีภาพ header สูงที่กินพื้นที่แชท รายละเอียดอยู่ที่ [`docs/DESIGN_AUDIO_FLEX_FLOOD_DAILY.md`](DESIGN_AUDIO_FLEX_FLOOD_DAILY.md)

---

## 1. สรุปการเปลี่ยนแปลง

### จากระบบเดิม

```text
Open-Meteo weather
    + ราคาปาล์มน้ำมัน
    + ราคายางพารา
    + ข่าวประชาสัมพันธ์ท้องถิ่น
    ↓
Flex สภาพอากาศ + เสียงรายงานทุกหัวข้อ
```

### เป็นระบบใหม่

```text
ข้อมูลสถานการณ์น้ำท่วม/ระดับน้ำ/ประกาศเตือนภัย
    + Open-Meteo พยากรณ์อากาศ
    ↓
วิเคราะห์ระดับความเสี่ยงและช่วงเวลาที่ต้องระวัง
    ↓
Flex สรุปน้ำท่วมเป็นข้อมูลหลัก + พยากรณ์อากาศประกอบ
    + เสียงประกาศภาษาไทยฉบับใหม่
```

**หลักการสำคัญ:** น้ำท่วมต้องเป็นหัวข้อแรกและเป็นจุดเด่นของทั้ง Flex และเสียง ส่วนพยากรณ์อากาศใช้เพื่ออธิบายแนวโน้มฝน ความร้อน ลม และคำแนะนำการเดินทาง/การใช้ชีวิตในวันนั้น

---

## 2. สิ่งที่ตัดออกจากผลิตภัณฑ์

สิ่งต่อไปนี้ต้องไม่อยู่ในรายงาน production ใหม่ ทั้งใน Flex, เสียง, pipeline และเอกสารสัญญา:

- ราคาปาล์มน้ำมัน
- ราคายางพารา
- ข่าวสาร/ข่าวประชาสัมพันธ์ทั่วไป
- การติดตั้ง Tesseract/OCR เพื่ออ่านภาพราคาสินค้า
- คำอธิบายว่าเสียงเป็นรายงาน “ราคาผลผลิตและข่าวสาร”
- acceptance test ที่ยืนยัน market/news fetch

**หมายเหตุเรื่อง source เดิม:** ไฟล์ `research/RESEARCH_PRICE_SOURCES.md`, `research/source-comparison.json` และโลโก้ใน `assets/research/logos/` เป็นหลักฐานงานวิจัยเดิม ไม่ใช่ runtime production หากยังต้องเก็บไว้ ให้ติดป้ายว่าเป็น archive/ประวัติศาสตร์ของการตัดสินใจ และไม่ให้ถูกอ้างจาก pipeline ใหม่

---

## 3. ประสบการณ์ผู้ใช้ใหม่

### 3.1 ลำดับการรายงานตอนเช้า

1. ทักทายและระบุวันที่/พื้นที่
2. **สถานการณ์น้ำท่วมล่าสุด** — ระดับสถานการณ์, พื้นที่/จุดที่ได้รับผลกระทบ, เวลาอัปเดต และแหล่งข้อมูล
3. **สิ่งที่ควรทำทันที** — เช่น ระวังการเดินทาง, ย้ายของขึ้นที่สูง, เตรียมยา/เอกสาร, ติดตามประกาศทางการ
4. พยากรณ์อากาศวันนี้ — อุณหภูมิ ฝน ลม และช่วงเวลาที่ควรระวัง
5. สรุปความเสี่ยงที่อาจทำให้สถานการณ์น้ำท่วมแย่ลง
6. ปิดท้ายด้วยคำแนะนำความปลอดภัยและช่องทางติดตามประกาศทางการ

### 3.2 หลักการถ้อยคำ

- ใช้คำว่า “ข้อมูล ณ เวลา...” เสมอสำหรับข้อมูลน้ำท่วม
- แยกให้ชัดระหว่าง **ข้อเท็จจริงจากแหล่งข้อมูล** กับ **การประเมินจากพยากรณ์อากาศ**
- ห้ามสรุปว่า “น้ำท่วม” จากฝนอย่างเดียว หากไม่มีข้อมูลสถานการณ์/ระดับน้ำรองรับ
- หากข้อมูลน้ำท่วมล้าสมัย, หาไม่พบ, หรือแหล่งข้อมูลล้มเหลว ต้องพูดว่า “ยังยืนยันสถานการณ์ล่าสุดไม่ได้” ไม่เดาและไม่ใช้ข้อมูลเก่าเป็นข้อมูลปัจจุบัน
- ใช้ระดับที่ชาวบ้านเข้าใจได้ เช่น `ปกติ`, `เฝ้าระวัง`, `กระทบการเดินทาง`, `วิกฤต` พร้อมข้อความอธิบาย ไม่ใช้รหัสภายในอย่างเดียว
- น้ำเสียงต้องจริงจังเมื่อมีความเสี่ยง แต่ไม่สร้างความตื่นตระหนก

---

## 4. ขอบเขตข้อมูลน้ำท่วมที่ต้องออกแบบ

โมเดลข้อมูลควรรองรับอย่างน้อย:

```js
{
  status: 'normal | watch | affected | critical | unknown',
  summary: 'ข้อความสรุปจากแหล่งข้อมูล',
  affectedAreas: ['...'],
  waterLevel: {
    value: null,
    unit: null,
    station: null,
    trend: 'rising | stable | falling | unknown'
  },
  roads: [{ name: '...', status: 'passable | caution | closed | unknown' }],
  actions: ['...'],
  sourceName: '...',
  sourceUrl: 'https://...',
  observedAt: 'ISO timestamp',
  publishedAt: 'ISO timestamp',
  expiresAt: 'ISO timestamp | null',
  confidence: 'high | medium | low',
  freshness: 'fresh | stale | unknown'
}
```

ไม่จำเป็นต้องมีทุก field ในแหล่งข้อมูลแรก แต่ adapter ต้อง normalize ให้มี shape เดียวและรักษา metadata ของแหล่งข้อมูล/เวลาไว้เสมอ

### 4.1 แหล่งข้อมูลและลิงก์ที่ยืนยันแล้ว

| บทบาท | URL | การใช้ในระบบ |
|---|---|---|
| ดูสถานะน้ำ/CCTV | `https://cctv.maholan.net/` | ปุ่มใหญ่ “ดูสถานะน้ำ / CCTV” ใน Flex; ใช้ให้ผู้ใช้ตรวจภาพจริงและจุดเฝ้าระวัง |
| ศูนย์ข้อมูลน้ำพัทลุง | `https://chachoengsao-flood.vercel.app/phatthalung` | ปุ่มใหญ่ “สถานการณ์น้ำพัทลุง” ใน Flex; ใช้เป็น source link ของรายงานและทางเข้าไปดูระดับน้ำ/ฝน/แผนที่ |
| ข้อมูลระดับน้ำภายในศูนย์ | แสดงผ่านหน้าเว็บศูนย์พัทลุง | ต้องตรวจวิธีดึงข้อมูล/สิทธิ์/ความสดก่อนทำ adapter อัตโนมัติ |
| พยากรณ์อากาศ | Open-Meteo เดิม | คงไว้สำหรับ forecast; ไม่ใช้แทนข้อเท็จจริงว่าน้ำท่วมหรือไม่ |

### 4.2 จุดตัดสินใจก่อนเริ่ม implementation

ต้องเลือกและยืนยันแหล่งข้อมูลหลักอย่างน้อย 1 แหล่ง โดยพิจารณา:

- เป็นข้อมูลทางการหรือมีความน่าเชื่อถือในพื้นที่
- มีข้อมูลที่ผูกกับพัทลุง/บ้านลำพายหรือสถานีใกล้เคียงเพียงพอ
- มี API/JSON/RSS/หน้าเว็บที่อนุญาตให้ระบบอ่านอัตโนมัติ
- ระบุเวลาสังเกต/เวลาประกาศและความสดของข้อมูล
- มี fallback ที่ไม่ทำให้ระบบพูดข้อมูลเก่าเป็นข้อมูลปัจจุบัน
- ระบุได้ว่าเป็น “สถานการณ์ที่เกิดขึ้นแล้ว” หรือ “ประกาศเตือน/คาดการณ์”

ลิงก์ผู้ใช้และ source link ได้รับการยืนยันตามข้อกำหนดข้างต้นแล้ว แต่การอ่านข้อมูลอัตโนมัติจากหน้าเว็บยังต้องตรวจเพิ่ม หากยังไม่มี contract ที่เสถียร ให้ใช้หน้าเว็บเป็นปุ่มอ้างอิง + รายงานสถานะ `unknown`/ข้อความ fallback อย่างปลอดภัยก่อน ไม่ scrape แบบเปราะบางและไม่เปิดส่ง production จนกว่าจะผ่าน fixture/adapter แบบ dry-run

---

## 5. แผนรื้อสถาปัตยกรรม

### 5.1 Flow ใหม่

```text
GitHub Actions
    ↓
src/core/pipeline.js
    ├─ flood/fetch adapter       → raw flood/alert data
    ├─ flood/normalize           → FloodSituation
    ├─ flood/analyzer            → severity + actions + freshness
    ├─ weather/openMeteo.js      → weather forecast
    ├─ weather/analyzer.js       → rain/wind/heat signals
    ├─ report/formatter          → normalized facts/context
    ├─ content/geminiReport.js   → flexible daily narrative + validated spokenText
    ├─ flex/builder.js            → flood-first Flex JSON
    ├─ audio/tts.js               → Thai audio
    ├─ audio/validate.js
    ├─ audio/storage.js
    └─ line/messagingApi.js      → Flex + Audio
```

### 5.2 โมดูลที่ต้องเพิ่ม/รื้อ

| พื้นที่ | แผน |
|---|---|
| `src/flood/` | เพิ่ม adapter, normalize, analyzer, severity/freshness rules และ source contract |
| `src/weather/` | คง Open-Meteo และ analyzer ไว้ แต่เพิ่มสัญญาณฝนหนัก/ฝนต่อเนื่องที่ใช้ประกอบ flood risk |
| `src/forecast/formatter.js` | เปลี่ยนเป็น formatter ของ flood + weather report; เลิกส่ง market/news เข้าไป |
| `src/forecast/thaiScript.js` | เปลี่ยนเป็นการเตรียม facts/context; ไม่สร้างสคริปต์แบบ template ตายตัว |
| `src/content/geminiReport.js` | เพิ่ม Gemini content generation สำหรับเรียบเรียงรายงานรายวันตาม priority และข้อมูลจริง พร้อม structured validation/fallback |
| `src/flex/` | รื้อ layout ให้สถานการณ์น้ำท่วมเป็น hero/status card; คง local identity และ readability |
| `src/core/pipeline.js` | ลบ `market.fetch`/`news.fetch`; เพิ่ม `flood.fetch`, `flood.normalize`, `flood.analyze` |
| `src/market/`, `src/news/` | ถอดออกจาก runtime; ลบหรือย้ายเป็น archive หลังตรวจว่าไม่มี dependency |
| `.github/workflows/*.yml` | เอา OCR/Tesseract และ env ของตลาดออก; เพิ่ม env/source config น้ำท่วมถ้าจำเป็น |
| `src/config/index.js` | เพิ่ม flood source, freshness limit, warning thresholds และข้อความ fallback |
| `src/audio/` | คง adapter/validation/storage/LINE contract แต่ใช้ Gemini TTS model/voice ที่ตั้งค่าได้ และรับ spokenText ที่ผ่าน validation |
| `public/status/last-run.json` | รายงาน stages ใหม่และ flood freshness/status โดยไม่เผยข้อมูลลับ |

---

## 6. แนวทาง Flex Message ใหม่

Flex ต้องอ่านได้ในไม่กี่วินาทีและตอบคำถามว่า “ตอนนี้ชุมชนต้องระวังอะไร” ก่อนรายละเอียดอากาศ

### ลำดับองค์ประกอบที่เสนอ

1. Header ภาพ/อัตลักษณ์บ้านลำพาย — คงไว้ถ้ายังเหมาะกับพื้นที่
2. **Flood status hero** — สี/ไอคอน/คำว่า `ปกติ`, `เฝ้าระวัง`, `ได้รับผลกระทบ`, `วิกฤต`, หรือ `ยังยืนยันไม่ได้`
3. เวลาอัปเดต + แหล่งข้อมูลน้ำท่วม
4. พื้นที่/ถนน/จุดที่ได้รับผลกระทบ (แสดงเฉพาะเมื่อมีข้อมูลจริง)
5. กล่อง “ควรทำตอนนี้” 1–3 ข้อ
6. **ปุ่มใหญ่ “ดูสถานะน้ำ / CCTV”** → `https://cctv.maholan.net/`
7. **ปุ่มใหญ่ “สถานการณ์น้ำพัทลุง / แหล่งข้อมูล”** → `https://chachoengsao-flood.vercel.app/phatthalung`
8. คั่นหัวข้อ “พยากรณ์อากาศวันนี้”
9. อุณหภูมิ/สภาพอากาศปัจจุบันและช่วงอุณหภูมิ
10. ช่วงเวลาฝนที่สำคัญ/ฝนสะสม/ลม
11. แถบ “ฝนวันนี้อาจกระทบสถานการณ์อย่างไร”
12. Footer: เวลาอัปเดต, source, **น้องจุ่นจ้าน** และคำชวนให้ฟังเสียง

ปุ่มต้องเป็น LINE Flex action แบบ `uri`, เต็มความกว้างเท่าที่ layout รองรับ, มี label ภาษาไทยสั้น/อ่านง่าย, มีสีแยกจากเนื้อหา และอยู่ในตำแหน่งที่ผู้สูงอายุเห็นได้ทันที ไม่ซ่อนเป็นลิงก์ตัวอักษรเล็กใน footer โดยปุ่มพยากรณ์อากาศเป็น secondary action และอาจย้ายไปกลุ่ม Weather/ตัดออกใน compact variant ที่ต้องสั้นที่สุด

สีต้องสื่อระดับความเสี่ยงอย่างชัดเจน แต่ต้องไม่ใช้สีแดงกับทุกกรณีฝนตก ให้ผูก palette กับ `FloodSeverity` โดยตรงและมีสถานะ `unknown` ที่ไม่หลอกว่าปลอดภัย

---

## 7. แนวทางเสียงใหม่

ส่งเป็น LINE Audio Message เช่นเดิม แต่ **ไม่มีความยาวเป้าหมายแบบตายตัว** Gemini จะเลือกความยาวตามข้อมูลสำคัญและระดับความเสี่ยงของวันนั้น โดยระบบตรวจไฟล์จริงหลังสร้างเพื่อให้ผ่านข้อจำกัดทางเทคนิคของ LINE

### หลักการสร้างเนื้อหา

ใช้ Gemini สร้าง narrative จาก normalized facts/context โดยไม่บังคับลำดับหรือจำนวนหัวข้อ หากมีเหตุวิกฤตให้เริ่มจากคำเตือน หากวันนั้นไม่มีประเด็นสำคัญให้รายงานสั้นและเป็นกันเอง ไม่เติมข้อความเพื่อให้ครบเวลาที่กำหนด

Gemini ต้องคืน structured output อย่างน้อย `spokenText`, `shortSummary`, `priority`, `actions`, `factsUsed` และ `warnings` แล้วผ่าน validator ก่อนเข้า Gemini TTS

### กติกาเสียง

- ห้ามพูดราคาปาล์ม, ราคายาง หรือข่าวสารทั่วไป
- ถ้าน้ำท่วม `unknown` ต้องพูดตรง ๆ ว่ายังยืนยันไม่ได้
- ถ้าแหล่งข้อมูลเกิน freshness limit ต้องใช้ข้อความ “ข้อมูลล่าสุดที่ระบบตรวจพบคือ...” และห้ามใช้ถ้อยคำว่า “ตอนนี้”
- ไม่อ่าน URL ยาว ๆ ให้พูดชื่อหน่วยงาน/แหล่งข้อมูล และให้ URL อยู่ใน Flex/footer หรือ log ตามความเหมาะสม
- เมื่อ `critical` หรือถนนปิด ให้เตือนเรื่องความปลอดภัยก่อนรายละเอียดอากาศ
- ใช้ Gemini TTS เป็น provider หลัก โดย `GEMINI_TTS_MODEL` และ voice profile ตั้งค่าผ่าน environment; รุ่นตัวอย่างอย่าง Flash TTS หรือ Flash-Lite TTS ต้องตรวจ catalog/สิทธิ์จริงก่อน deploy
- Gemini TTS ต้องรับ style instructions แยกจาก spoken text ด้วย `:` และ spoken text ต้องเป็นข้อความที่ผ่านการตรวจ facts แล้ว

---

## 8. แผนทดสอบและ acceptance ใหม่

### Unit/contract tests

- flood adapter แปลงข้อมูลจริง/fixture เป็น `FloodSituation` ได้
- missing optional fields ไม่ทำให้ pipeline ล้มโดยไม่จำเป็น
- timestamp/freshness ถูกคำนวณตาม `Asia/Bangkok`
- stale/unknown source ไม่ถูก render เป็นสถานะปลอดภัย
- severity priority: critical > affected > watch > normal > unknown ตามกติกาที่ตกลง
- precipitation forecast ไม่สามารถยกระดับเป็น “น้ำท่วมจริง” ได้โดยไม่มี flood evidence
- analyzer สร้าง action ที่เหมาะกับแต่ละระดับ
- Flex แสดง flood status ก่อน weather และไม่แสดง market/news
- audio script ไม่มีคำ/section ของ market/news และมี flood-first ordering
- status report มี flood stages และ source freshness
- pipeline failure ของ flood source ใช้ fallback ที่ปลอดภัยและบันทึก stage ชัดเจน

### End-to-end acceptance

1. สถานการณ์ปกติ + ฝนต่ำ → Flex/เสียงระบุปกติและพยากรณ์อากาศ
2. เฝ้าระวัง + ฝนมีแนวโน้มเพิ่ม → แสดง watch และคำแนะนำเตรียมตัว
3. ได้รับผลกระทบ/ถนนต้องระวัง → แสดงพื้นที่และคำเตือนเด่น
4. วิกฤต/ถนนปิด → ข้อความเร่งด่วนมาก่อนอากาศ
5. flood source timeout → ไม่ fabricate; ใช้ unknown/fallback ตาม policy
6. ข้อมูลเก่าเกินกำหนด → ไม่พูดเป็นสถานการณ์ปัจจุบัน
7. ฝนตกหนักแต่ไม่มี flood report → รายงานเป็น weather risk ไม่ใช่น้ำท่วม
8. ส่ง LINE → Flex + Audio ตามลำดับเดิมและเสียงเล่นได้
9. dry-run → ตรวจ payload ได้โดยไม่ส่ง LINE/commit audio
10. production duplicate guard → ยังทำงานกับ report ใหม่

---

## 9. แผนแก้เอกสาร

| เอกสาร | การเปลี่ยนแปลง |
|---|---|
| `README.md` | เปลี่ยนคำอธิบายผลิตภัณฑ์, workflow, TTS และตัวอย่างจาก weather/market/news เป็น flood + weather; ระบุชื่อ “น้องจุ่นจ้าน”, กลุ่มบ้านลำพาย และลิงก์ CCTV/ศูนย์ข้อมูลพัทลุง; ลิงก์แผนนี้ |
| `PRD.md` | แก้ vision/goals/UX/audio/data/acceptance/phase plan ทั้งหมด; เพิ่ม flood data contract, freshness และ safety policy |
| `ARCHITECTURE.md` | วาด data flow ใหม่และ failure policy ของ flood source |
| `API.md` | เพิ่ม `getFloodSituation()`/`analyzeFlood()` และแก้ `buildForecastData()` contract |
| `DATABASE.md` | ตรวจว่าการไม่มี DB ยังเพียงพอสำหรับ flood freshness/history; ไม่เพิ่ม DB โดยอัตโนมัติ |
| `DECISIONS.md` | เพิ่ม ADR เรื่อง product pivot, flood source, stale-data policy และ Flex redesign; ปิด/แทน Decision 010 |
| `CONTEXT.md` | อัปเดต current direction จาก weather/market ไป flood-first และบันทึกว่า market/news ถูกตัด |
| `REPOSITORY_STRUCTURE.md` | เพิ่ม `src/flood`, fixtures และ test domains; ระบุการ archive market/news |
| `CHECKLIST.md` | เปลี่ยนรายการตรวจจาก market/news เป็น flood scenarios และ safety checks |
| `CHANGELOG.md` | เพิ่มรายการ pivot และลิงก์แผน พร้อมบันทึกว่าเป็น planning stage ก่อน implementation |
| `.env.example` | เพิ่มตัวแปร flood source/freshness/thresholds และลบตัวแปร OCR/market ที่ไม่ใช้ |
| `docs/examples/` | สร้างตัวอย่าง Flex อย่างน้อย normal/watch/affected/critical/unknown |
| `research/` | ย้ายงานวิจัยราคามาเป็น archive หรือใส่ README ระบุว่าไม่ใช่ production input |

---

## 10. ลำดับการทำงานที่แนะนำ

### Phase A — Contract และแหล่งข้อมูล

1. ยืนยันความหมายของ “สถานการณ์น้ำท่วม” ที่ต้องรายงาน: น้ำท่วมจริง, ระดับน้ำ, ถนน, ประกาศเตือน หรือทั้งหมด
2. เลือก flood source หลักและ fallback จากแหล่งที่อนุญาตให้อ่านอัตโนมัติ
3. กำหนด freshness limit, severity mapping และ fallback เมื่อข้อมูลใช้ไม่ได้
4. อัปเดต PRD/API/DECISIONS ก่อนเขียน adapter

### Phase B — Core data/pipeline

1. เพิ่ม `src/flood/` พร้อม fixtures
2. เพิ่ม normalize/analyzer และ safety rules
3. เปลี่ยน pipeline ให้ flood เป็น required หรือกำหนด degraded mode อย่างชัดเจน
4. ลบ market/news stages และ dependencies
5. เพิ่ม tests ของ timestamp, stale, unknown และ no-fabrication

### Phase C — Presentation

1. รื้อ formatter และ Thai audio script
2. ออกแบบ Flex flood-first และ render ตัวอย่างทุก severity
3. ปรับ TTS style จาก “ราคาผลผลิต” เป็น “ประกาศเตือนภัยชุมชนที่ชัดเจนและไม่ตื่นตระหนก”
4. ตรวจ accessibility กับข้อความยาว/ข้อมูลไม่มีบาง field

### Phase D — Operations และ rollout

1. ปรับ workflow ไม่ติดตั้ง OCR/market tooling
2. dry-run กับ fixtures และ source จริงแบบไม่ส่ง LINE
3. ส่ง test LINE หลายสถานการณ์
4. ทดลอง production แบบเฝ้าดูผลก่อนเปิด schedule เต็มรูปแบบ
5. อัปเดต run status, checklist และ changelog หลัง acceptance ผ่าน

---

## 11. ความเสี่ยงและการป้องกัน

| ความเสี่ยง | วิธีป้องกัน |
|---|---|
| แหล่งข้อมูลน้ำท่วมไม่มี API/ข้อมูลไม่สม่ำเสมอ | adapter แยกจาก domain, fixture, freshness และ unknown state |
| ฝนพยากรณ์ถูกตีความเป็นน้ำท่วม | แยก `FloodSituation` จาก `WeatherAnalysis` และห้าม promote อัตโนมัติ |
| ข้อมูลเก่าทำให้ชุมชนเข้าใจผิด | แสดง observed/published time และ stale policy ทุกครั้ง |
| Flex มีข้อมูลมากเกินไป | flood hero + action 1–3 ข้อ, ย้ายรายละเอียดไป audio |
| เสียงยาว/ฟังยาก | จำกัดโครงสร้าง, ประโยคสั้น, pause ตามหัวข้อ, ทดสอบกับผู้สูงอายุ |
| แจ้งเตือนรุนแรงเกินจริง | ใช้ระดับสถานการณ์จาก source, confidence และถ้อยคำไม่ตื่นตระหนก |
| เอกสารเก่ายังทำให้คนเข้าใจว่า market/news อยู่ในระบบ | แก้เอกสาร contract ทั้งชุดและ archive research เดิม |

---

## 12. Definition of Ready ก่อนเริ่มเขียนโค้ด

- [ ] ระบุได้ว่าน้ำท่วม “เป็นหลัก” หมายถึงข้อมูล/สถานการณ์ใดบ้าง
- [ ] เลือก flood source หลักและมีหลักฐานเรื่องการเข้าถึง/การใช้ข้อมูล
- [ ] ตกลง freshness limit และ policy เมื่อข้อมูลล้มเหลว/ล้าสมัย
- [ ] ตกลงระดับ severity และข้อความภาษาไทยของแต่ละระดับ
- [ ] ตกลงว่าจะให้ flood source เป็น required stage หรืออนุญาต degraded weather-only mode
- [ ] อนุมัติลำดับ Flex และเสียงฉบับใหม่
- [ ] อัปเดต PRD/API/DECISIONS ให้ตรงกับข้อตกลงก่อนแก้ runtime

> เอกสารนี้เป็นแผน ไม่ใช่การยืนยันว่าได้เลือกหรือเชื่อมต่อ flood source ใดแล้ว การตัดสินใจเรื่องแหล่งข้อมูลต้องถูกบันทึกและทดสอบก่อนเปิดใช้งาน production
