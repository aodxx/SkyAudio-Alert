# SkyAudio-Alert — Review & Redesign: Visual Morning Brief + News-Storyteller Audio

**วันที่:** 2026-10-04
**ฐานที่ตรวจ:** `aodxx/skyaudio-alert` @ `6e1aa75` (main)
**สถานะ:** รายงานการตรวจ + design + implementation plan — **ยังไม่มีการแก้โค้ด**
**Production:** NO-GO (ไม่เปลี่ยน)

> **สถานะปัจจุบัน ณ 2026-10-07:** เอกสารนี้เป็น historical review เท่านั้น. ข้อเสนอ VisualPlan/10-section audio/>600-second duration ถูกแทนที่สำหรับ runtime ปัจจุบันโดย Decision 023–025; อย่านำไปใช้เป็น acceptance criteria. ดู `CHECKLIST.md` และ `docs/PHASE3_STATUS.md` สำหรับสถานะล่าสุด.

ขอบเขตที่ตรวจจริง: `src/flex/{builder,components,themes}.js`, `src/content/{presentationPlanner,presentationContract,geminiReport,reportContract,safetyFirewall,qualityScore}.js`, `src/audio/{tts,validate,storage}.js`, `src/core/pipeline.js`, `src/flood/*`, `src/forecast/formatter.js`, `src/weather/analyzer.js`, `src/config/index.js`, `src/line/messagingApi.js`, tests ทั้งหมด, `docs/V1_5_*`, `PRD.md`, `DECISIONS.md`, `.github/workflows/*`, `public/status/last-run.json`

ผลรัน baseline: `npm test` → 67 tests, **66 pass / 1 fail** (ดู D6) และมีการรัน probe สร้าง Flex จริงจาก scenario WATCH เพื่อยืนยันอาการ (ดู B)

---

## A. Current Architecture

```
flood.fetch (HTML adapter → FloodSituation: severity, trend, freshness, stations[], actions[])
  → weather.fetch/normalize/analyze (Open-Meteo)
  → content.generate     Gemini call #1 → ReportDraft {spokenText, shortSummary, actions, ...}
  → content.presentation Gemini call #2 → PresentationPlan
        {severity, priority, visualVariant,
         cards[{id, role, title, body:STRING, items:STRING[], cta[]}],
         spokenText:STRING, spokenSections:STRING[], audioStyle, actions, factsUsed}
  → content.safety       validateGeneratedFacts (certainty/forbidden/numbers-in-facts)
  → content.quality      scorePresentationQuality
  → flex.render          buildFlex(reportData + plan.cards)  → carousel
  → tts.synthesize       plan.spokenText → Gemini TTS (1 request) → WAV → MP3 128k
  → audio.validate       parseMp3 → clamp [10s,190s], cap 8 MiB
  → audio.store          git commit mp3 → jsDelivr URL
  → line.send            [flex, audio] in one push
```

ข้อสังเกตเชิงโครงสร้าง: **Flex และ Audio ถูกสร้างจาก PresentationPlan ก้อนเดียวกัน ด้วย Gemini call เดียวกัน และหน่วยข้อมูลของทั้งสองคือ "ข้อความ (string)"**

## B. Current Visual Problem

ยืนยันจาก probe (scenario WATCH: 2 สถานี, trend rising, fresh, ฝน 70%):

| สิ่งที่เห็นใน output จริง | ผล |
|---|---|
| Node types ทั้งหมดใน Flex = `bubble, box, text, button` | **ไม่มี icon / image / badge / progress / metric tile เลย** |
| Card 1 = label "สถานการณ์น้ำ" + เลขหน้า "1" + title + ประโยคเดียว | ไม่มี severity label เป็นองค์ประกอบของตัวเอง ไม่มี trend ไม่มี freshness ไม่มีสถานี |
| Card 2 (weather) = "พยากรณ์อากาศ" + ชื่อสภาพอากาศ 1 คำ | ไม่มีฝน/อุณหภูมิ/ความชื้น/ลม แม้ข้อมูลมีครบใน `reportData` |
| ทุกการ์ดใช้ `cardShell` เดียวกัน พื้น `#F8FAFC` เท่ากัน | "ทุก Card หน้าตาเหมือนกัน" |
| สี severity ใช้แค่กับตัวหนังสือ role label ขนาด xs | สีไม่ทำหน้าที่สถานะ; label ที่เห็นเป็นชื่อ role ไม่ใช่ severity |
| เมื่อ Gemini เขียน `body` ยาว (validator ยอมถึง 650 ตัวอักษร/การ์ด) | กลายเป็นย่อหน้า / บทความที่แบ่งเป็นหลายการ์ด |

ไฟล์ที่ "ดูเหมือนมีแต่ไม่ได้ใช้": `buildFallbackCards()` (มี severity label + freshness + station text ดีกว่า) **เข้าถึงไม่ได้ใน production** เพราะ pipeline สร้าง plan เสมอ (ทั้ง gemini และ fallback) และ `buildFlex` เลือก plan ก่อน; `headerBlock()` และ `src/flex/themes.js` ไม่ถูก import จากที่ใดเลย

## C. Current Audio Problem

| หลักฐาน | ปัญหา |
|---|---|
| `last-run.json`: `durationMs 41448` (41 วินาที) | ห่างจากเป้า >10 นาที ~15 เท่า |
| prompt ใน `geminiReport.js`: "กระชับ ... ไม่มีโครงหัวข้อ" ; `presentationPlanner.js`: "spokenText ที่ละเอียดพอ" | ไม่มีโครงเรื่อง ไม่มีส่วนเปิด/ปิด ไม่มี segment ไม่มีกลไกความยาว |
| `spokenSections` อยู่ใน schema (≤8) แต่ **ไม่เคยถูกส่งต่อไป TTS** | แนวคิดแบ่งช่วงมีแต่ตายเปล่า |
| TTS รับ string เดียว เรียก API ครั้งเดียว | ไม่มี chunking/concat/duration control |
| `pipeline.js` override `style` ด้วย fragment ภาษาอังกฤษสั้น ๆ (`calm tone; natural; detailed detail`) | ทิ้ง style "ผู้ประกาศหมู่บ้าน" ที่เขียนไว้ใน `tts.js` |
| `validate.js`: `MAX_DURATION_MS = 190_000` และ `Math.min/Math.max` clamp | **เสียง 12 นาทีจะถูกรายงานเป็น 3:10; เสียง 3 วินาทีถูกรายงานเป็น 10 วินาที** → ตรวจ ">10 นาทีจริง" ไม่ได้ และ LINE `duration` ผิด |
| `MAX_FILE_BYTES = 8 MiB` กับ MP3 128 kbps | ตัน ~8:44 นาที; เสียง 10 นาที = ~9.6 MB → **ถูก reject ก่อนส่ง** |
| `storeAudio` commit MP3 ทุกวันเข้า public repo | ไฟล์ 10+ นาทีจะทำให้ repo โตเร็ว (ความเสี่ยง ไม่ใช่ blocker) |
| `estimateDurationMs` เป็น helper ไม่ถูกใช้ใน gate ใด ๆ | ไม่มี duration gate ใน pipeline |

## D. Root Cause

ปัญหาไม่ได้อยู่ที่ "ข้อความยาวไป" แต่เป็น 6 สาเหตุเชิง architecture:

**RC1 — Contract เป็นรูปแบบ "ข้อความ"** `PresentationPlan.cards[].body` และ `items[]` เป็น string ล้วน ไม่มี slot แบบมีชนิด (severityBadge, trend, freshness, stations[], metrics[], actions[]) → renderer จึงทำได้แค่พิมพ์ string ลงการ์ด ต่อให้ตั้งใจออกแบบ visual ก็ไม่มีที่ใส่

**RC2 — Structured facts ถูกทิ้งก่อนถึง Flex** ข้อมูลจริง (stations/trend/freshness/distanceToBank/อุณหภูมิ/ความชื้น) อยู่ใน `reportData` แต่ใน planner path `planCardToBubble` อ่านเฉพาะ `plan.cards` ที่ Gemini เขียน → ตัวเลขบนการ์ดต้อง "ผ่านปาก LLM" แล้วค่อยถูก firewall ตรวจย้อนหลัง แทนที่จะดึงจาก fact โดยตรง

**RC3 — Renderer เป็น generic text-card shell** มีแค่ `cardShell + textBlock + cta`; ไม่มี component ที่ docs V1.5 ระบุไว้ (`floodHero, trendBadge, freshnessRow, stationFact, affectedArea, actionGroup, weatherSummary, sourceFooter`), ไม่มี tokens, ไม่มี variants (ทั้งหมดอยู่ใน blueprint §6.2A/§11 แต่ **ไม่เคยถูกสร้าง**)

**RC4 — สองช่องทางผูกกับ generation เดียวกัน** Gemini call เดียวเขียนทั้ง cards และ spokenText จาก prompt เดียว; call แรกก็เขียน spokenText อีกชุด → Audio เป็น "ข้อความสรุปอีกก้อน" ไม่ใช่ narration plan แยก; prompt สั่ง "กระชับ" ทั้งสองฝั่ง

**RC5 — Audio pipeline ไม่สามารถส่งมอบ >10 นาทีได้ทางกายภาพ** (clamp 190s, cap 8 MiB, TTS ครั้งเดียว, ไม่มี duration gate, style ถูก override) และ Decision 021 / PRD ห้ามกำหนดเป้าความยาวโดยตรง → เอกสารกับ requirement ใหม่ขัดกัน

**RC6 — Tests/quality score นิยามความสำเร็จผิด**
- `flexVariants.test.js`, `phase6-line-acceptance.test.js` ตรวจแค่ "เป็น carousel, ≥2 bubble, altText match regex, มีข้อความ X" → Flex แบบข้อความล้วนผ่านทุกข้อ
- `qualityScore.compactness` ให้ผ่านเมื่อ `body ≤ 650` ตัวอักษร (เท่ากับรับรองย่อหน้ายาว); `audioInformationSufficiency` ผ่านเมื่อ spokenText ≥ 35 ตัวอักษร
- **`tests/safetyFirewall.test.js` มี SyntaxError (วงเล็บปีกกาเกิน บรรทัด 4) → ไฟล์ test ของ firewall ไม่เคยรัน** และ workflow `unit-tests.yml` (รันทุก push main) จึงแดงอยู่ ณ ตอนนี้

ปัญหาย่อยของ firewall (ไม่ใช่ root cause แต่ต้องแก้): ตรวจเฉพาะตัวเลข/certainty/หัวข้อต้องห้าม **ไม่ตรวจชื่อสถานี ชื่อถนน เวลา พื้นที่** ที่ blueprint Phase 5 ระบุไว้ → Gemini แต่งชื่อสถานี/ถนนขึ้นมาแล้วผ่านได้

## E. Design Gap จาก V1.5

| V1.5 กำหนดไว้ | Implementation จริง |
|---|---|
| Plan มี `statusLabel, trendLabel, freshnessLabel, priorityFacts, weatherContext, sourceNotes` (blueprint §5.2) | ตัดเหลือ `cards[body]` + `spokenText` |
| Components 10 ตัว + `tokens.js` + `variants/{normal..unknown}.js` (§6.2A, §11) | ไม่มีสักไฟล์ |
| Smart station selection (§6.2C) | `stations.slice(0,3)` ใน dead code |
| Card text สั้น + visual hierarchy (Phase 1) | ไม่มีกลไกบังคับ (ไม่มี text budget/lint) |
| Audio = content priority framework 7 ข้อ (§7.2) | ไม่ implement เป็นโครงเรื่อง; มี spokenText เดียว |
| Audio length "ไม่มีเพดานตายตัว" (Decision 021, PRD) | **Requirement ใหม่ขอ >10 นาที → ต้องออก Decision 022 supersede ส่วนนี้** |
| Fact leakage check: สถานี/เวลา/ถนน/พื้นที่ (§8.2) | เช็กเฉพาะตัวเลข |
| Phase 3 ถูก mark "complete" | ทั้งที่ exit criteria "visual hierarchy / mobile visual review" ไม่เคยมีหลักฐาน |

---

## F. Proposed New Architecture

หลักการ: **แยก "ข้อเท็จจริง" "แผนภาพ" "แผนเสียง" เป็น 3 ชั้น และให้ตัวเลข/ชื่อทุกตัวบนจอและในเสียงมาจาก fact ID ไม่ใช่จาก LLM**

```
Verified Facts (FloodSituation, WeatherAnalysis, Location, Freshness)
        │
        ▼
FactsSnapshot  (deterministic)
  - fact IDs: flood.severity, flood.trend, flood.freshness, station[i].*, weather.*, source.*
  - allow-list: ตัวเลข / ชื่อสถานี / ถนน / พื้นที่ / เวลา (รวมรูปแบบคำพูดไทย)
  - severity มาจาก adapter เท่านั้น — ตัดออกจาก schema ที่ Gemini เห็น
        │
        ▼
Presentation Planner
   ├── VisualPlan (typed, deterministic layout)
   │     cards[{role, slots:{badge, trend, freshness, stations[factId], metrics[factId],
   │                          actions[libraryId|factId], ctas[]}, microcopy ≤ budget}]
   │     Gemini เขียนได้เฉพาะ headline + note สั้น (budget จำกัด) → validate
   │        ↓ Flex Renderer v2 (tokens + components + variants) → Carousel
   │
   └── NarrationPlan (10 segments)
         segment{id, purpose, allowedFactIds, explainerIds, targetSeconds, tone}
         Gemini เขียน "ทีละ segment" → {text, factIds[]} → per-segment firewall
            ↓ Thai speech normalizer (เลข/เวลา/หน่วย/อักษรย่อ)
            ↓ Long-form TTS: synth ต่อ segment (cache) → concat + gap + loudnorm
            ↓ ffprobe วัดความยาวจริง → Duration Gate (> 600 s)
            ↓ ถ้าไม่ผ่าน: เติม segment tier ถัดไป (explainer/recap) สูงสุด 2 รอบ → ไม่ผ่านก็ถอน Audio
```

โมดูลใหม่ (reuse ของเดิมก่อน):

```
src/presentation/facts.js            FactsSnapshot + allow-list + Thai-spoken forms
src/presentation/visualPlan.js       schema + validator + text budgets
src/presentation/narrationPlan.js    segments, tiers, duration planning
src/presentation/explainers/th.js    คลังคำอธิบายที่ผ่านการอนุมัติ (evergreen, versioned)
src/flex/tokens.js                   ค่า design ทั้งหมด (ย้ายจาก hard-code)
src/flex/components.js               + badge, chip, stationRow, metricTile, actionRow, ctaFooter
src/flex/variants/{normal,watch,affected,critical,unknown}.js
src/content/narrator.js              per-segment Gemini + retry + fallback deterministic narration
src/audio/longform.js                chunk → synth → concat → loudnorm → ffprobe
src/audio/validate.js                (แก้) ไม่ clamp, วัดจริง, gate > 600 s, size cap ใหม่
src/content/safetyFirewall.js        (ขยาย) ชื่อ/ถนน/เวลา/พื้นที่ + cross-channel consistency
```

เปลี่ยนของเดิม: `presentationPlanner.js` เหลือหน้าที่ประกอบ VisualPlan/NarrationPlan; `qualityScore.js` ถูกแทนด้วย lint ที่ตรวจโครงสร้างจริง; `buildFallbackCards` และ `themes.js` ที่ตายแล้วถูกลบ

Decision ที่ต้องบันทึกเพิ่ม: **Decision 022** — supersede Decision 015/021 และ PRD ส่วนความยาวเสียง (Audio ต้อง >10 นาทีจริง; severity ไม่อยู่ใน schema ของ Gemini)

---

## G. Flex Visual Design

### G1. Severity identity (ทุกสถานะมี 4 สัญญาณ: label + icon + รูปทรง/โครง + สี)

| State | Icon | Label | Hero treatment |
|---|---|---|---|
| NORMAL | ✅ | ปกติ | band เขียวอมฟ้าอ่อน, วงกลมไอคอน, ไม่มี action strip |
| WATCH | 👀 | เฝ้าระวัง | band เหลืองอำพัน, chip แนวโน้มเด่น |
| AFFECTED | ⚠️ | ได้รับผลกระทบ | band ส้ม, แถว "พื้นที่/ถนน" อยู่ใน Card 1 สรุปจำนวน |
| CRITICAL | 🚨 | วิกฤต | **header ทึบสีแดงเข้ม ตัวอักษรขาว + action strip ทึบใน Card 1** + ปุ่ม CCTV |
| UNKNOWN | ❔ | ยังยืนยันไม่ได้ | band เทาหินชนวน, แถบข้อความ "อย่าเพิ่งสรุปว่าปลอดภัยหรือท่วม" + ปุ่มตรวจสอบใน Card 1 |

icon เป็นอักขระ emoji ใน box วงกลมของ Flex เอง (ไม่พึ่ง asset ภายนอก/ไม่มี broken image); คู่สี/ข้อความตรวจ contrast ≥ 4.5:1; ทดสอบ grayscale ว่าแยก 5 สถานะได้จากข้อความ+ไอคอน

### G2. Cards (adaptive; ทุกใบ bubble size เดียวกัน `kilo` ตามข้อกำหนด carousel แต่ **โครงต่างกันตาม role**)

**Card 1 — HERO** (ทุก state)
- แถวบน: `น้องจุ่นจ้าน · บ้านลำพาย` (xxs) + วันที่
- กลาง: วงกลมไอคอน + **severity label ตัวใหญ่ที่สุด**
- chip: `↗ เพิ่มขึ้น / → ทรงตัว / ↘ ลดลง / – ไม่ทราบแนวโน้ม` + chip `อัปเดต 05:40 น.`
- headline ≤ 2 บรรทัด (จาก facts.summary)
- งบข้อความ Card 1: ≤ 7 text nodes, ≤ 120 ตัวอักษรรวมนอกจาก label/ชื่อบ้าน
- STALE: chip เปลี่ยนเป็น `⏱ ข้อมูลล่าสุด 3 ต.ค. 21:40 · อาจไม่เป็นปัจจุบัน` แต่ **severity เดิมคงอยู่**
- CRITICAL: action strip ทึบ `ทำทันที: …` (1 บรรทัด จาก action library) + ปุ่ม CCTV
- UNKNOWN: ไม่ใช้สี/ไอคอน normal; มีข้อความยืนยันไม่ได้ + ปุ่ม

**Card 2 — 📍 จุดเฝ้าระวัง** (ถ้ามีสถานี)
- สูงสุด 3 แถว เรียงตามความรุนแรงของ label แล้วระยะถึงตลิ่ง; แต่ละแถว: [รูปทรง+ไอคอนระดับ] **ชื่อสถานี** · ลำน้ำ (xs เทา) · ขวา: **`ต่ำกว่าตลิ่ง 0.42 ม.`** (ตัวเลขใหญ่) + ลูกศรแนวโน้ม
- แถบ 4 ช่อง `ปกติ | น้ำมาก | ใกล้ล้นตลิ่ง | ล้นตลิ่ง` ไฮไลต์ช่องปัจจุบัน (ใช้ enum จาก source ไม่สร้างสเกลตัวเลขเอง)
- ท้ายการ์ด: `+N สถานีอยู่ในเกณฑ์ปกติ` (N จาก facts)
- AFFECTED/CRITICAL: เพิ่มแถว 📍 พื้นที่ / 🛣️ ถนน เฉพาะที่ source ยืนยัน
- ไม่มีสถานี → ไม่สร้างการ์ดนี้ (ไม่แต่งข้อความแทน)

**Card 3 — ⚠️ สิ่งที่ควรทำ** (watch/affected/critical; normal เฉพาะเมื่อมี action)
- ≤ 3 แถว ไอคอน + ข้อความ ≤ 45 ตัวอักษร; แหล่ง: `facts.actions` + action library ตาม severity (ข้อความที่ผ่านอนุมัติ) — Gemini เลือก/เรียงได้ แต่เขียน action ใหม่ไม่ได้

**Card 4 — 🌦️ อากาศวันนี้** (supporting)
- metric tiles 2×2: 🌧️ ฝน (สูงสุด % + ช่วงเวลา) · 🌡️ อุณหภูมิ (ตอนนี้ + ต่ำ–สูง) · 💧 ความชื้น · 💨 ลม
- บรรทัดคงที่ท้ายการ์ด: `พยากรณ์นี้ไม่ได้ยืนยันว่ามีน้ำท่วม`
- CRITICAL: ย่อเป็น chip บรรทัดเดียวหรือย้ายท้ายสุด

**Card 5 — 📡 ตรวจสอบสถานการณ์**
- ตาราง freshness: เวลาสังเกต · เวลาดึงข้อมูล · แหล่ง/ผู้เผยแพร่ (จาก facts)
- ปุ่ม: `เปิด CCTV` · `ดูสถานการณ์น้ำ` · `ดูเรดาร์ฝน` (เฉพาะ 3 URL ที่ allow-list; critical → CCTV เป็น primary และยกไปอยู่หลัง Card 1/2)

### G3. ลำดับ/จำนวนการ์ดตาม state

| State | ลำดับ |
|---|---|
| NORMAL | Hero → (Stations สรุป) → Weather → Source |
| WATCH | Hero → Stations → Action → Weather → Source |
| AFFECTED | Hero → Impact/Stations → Action → Weather → Source |
| CRITICAL | Hero(+action) → Action detail → Stations/Impact → Source(+CCTV) → (Weather chip) |
| UNKNOWN | Hero(uncertainty) → Why-unknown (สถานะแหล่งข้อมูล/freshness) → Weather(จำกัดบทบาท) → Source |

### G4. กลไกบังคับ (ไม่ใช่แค่ "ตั้งใจ")
- text budget lint: จำกัดตัวอักษรต่อ text node, จำนวน text node ต่อการ์ด; การ์ดที่ text node > ขีดจำกัดถือว่า FAIL (ไม่ truncate เงียบ ๆ)
- structural lint: ทุกการ์ดต้องมี heading, ≥ 1 visual block (badge/tile/row), ห้ามมี text node เดียวที่เป็นย่อหน้า
- ความต่างระหว่างการ์ด: shell/พื้นหลัง/โครงต่างตาม role (ตรวจด้วย structure hash ไม่ซ้ำ)
- ข้อจำกัด LINE: carousel ≤ 12 bubble, payload < 50 KB, altText ≤ 400
- altText: `น้ำบ้านลำพาย: {label} · {แนวโน้ม} · อัปเดต {hh:mm} — {action แรก (critical) | ข้อจำกัด (unknown)}`

---

## H. Audio Narration Design

### H1. คาแรกเตอร์
"นักเล่าข่าวประจำหมู่บ้าน" — พูดกับชาวบ้านโดยตรง มีเกริ่น ชี้ทาง ("เดี๋ยวเล่า 3 เรื่อง…") เชื่อมเรื่องด้วยประโยคเชื่อม อธิบายความหมายของตัวเลข สรุปซ้ำ ปิดแบบเป็นกันเอง ไม่อ่าน URL ไม่อ่าน label ของการ์ด

### H2. โครง 10 ช่วง (เป้าเวลารวม ~12:45 เพื่อเผื่อ margin เหนือ gate 10:00)

| # | ช่วง | เนื้อหา / แหล่งข้อมูล | เป้า |
|---|---|---|---|
| 1 | ทักทาย + เปิดรายการ | วัน/วันที่, ชื่อรายการ, บอกว่าวันนี้จะเล่าเรื่องอะไรบ้าง (ลำดับ) | 0:45 |
| 2 | สรุปสถานการณ์น้ำ | severity + summary ของ source, อธิบายความหมายระดับนั้นแบบชาวบ้าน (explainer) | 1:30 |
| 3 | จุด/สถานีสำคัญ | เล่าทีละสถานีจาก `station[i]` (ชื่อ ลำน้ำ ระดับ ระยะถึงตลิ่ง เวลาวัด) + อธิบายว่าตัวเลขแปลว่าอะไร | 2:00 |
| 4 | แนวโน้ม | trend + freshness + "ข้อมูลนี้ยังบอกอะไรไม่ได้บ้าง" | 1:15 |
| 5 | พื้นที่/ถนน | **เฉพาะเมื่อ source ยืนยัน**; ถ้าไม่มี → ช่วงทดแทน "สิ่งที่ยังไม่มีข้อมูล และวิธีตรวจ CCTV/เว็บ" (ไม่แต่งชื่อ) | 1:00 |
| 6 | อากาศวันนี้ | อุณหภูมิ ความชื้น ลม โอกาสฝน ช่วงเวลา (จาก weather facts) | 1:30 |
| 7 | ติดตามอากาศอย่างไร | อธิบายพยากรณ์ vs ระดับน้ำจริง, **ห้ามใช้ฝนเป็นหลักฐานว่าท่วม**, ชี้ปุ่มเรดาร์โดยไม่อ่าน URL | 1:15 |
| 8 | สิ่งที่ควรทำ | action ตาม severity จาก library + facts.actions, แยก "ทำตอนนี้ / เตรียมไว้ / สังเกต" | 1:45 |
| 9 | สรุปอีกครั้ง | ทวน severity/แนวโน้ม/สิ่งที่ต้องทำ ด้วยถ้อยคำใหม่ ไม่ใช่ copy | 1:00 |
| 10 | ปิดรายการ | นัดครั้งหน้า ตามธรรมชาติ ไม่มีข้อมูลใหม่ | 0:45 |

### H3. จะถึง >10 นาทีโดยไม่แต่งข้อมูลได้อย่างไร (สำคัญ)
ข้อมูลจริงต่อวันมีไม่กี่ fact; เวลาที่เพิ่มต้องมาจาก 3 แหล่งที่ **ไม่สร้าง fact ใหม่** เท่านั้น:
1. **Explainer library (คลังคำอธิบายที่ผ่านการอนุมัติ, versioned)** — ความหมายของระดับ ปกติ/น้ำมาก/ใกล้ล้นตลิ่ง/ล้นตลิ่ง, พยากรณ์ฝน ≠ น้ำท่วมจริง, วิธีอ่านค่า "ต่ำกว่าตลิ่ง", วิธีใช้ CCTV/เว็บ, checklist เตรียมตัวตามระดับ (ของจำเป็น ยา ชาร์จโทรศัพท์ ดูแลผู้สูงอายุ ฯลฯ) — เป็นความรู้ทั่วไปแบบ static ไม่ใช่ข้อมูลของวันนี้
2. **Gemini เรียบเรียงต่อ segment** — เชื่อมประโยค อธิบายบริบท ยกตัวอย่างเปรียบเทียบเชิงชีวิตประจำวัน (ไม่ใส่ตัวเลข/ชื่อใหม่)
3. **ส่วนทวน/สรุป/ปิด** — ทวนด้วยถ้อยคำใหม่

**ข้อควรรู้ (ความเสี่ยงด้านผลิตภัณฑ์):** ในวันที่ข้อมูลน้อยมาก เสียง 10+ นาทีจะประกอบด้วยคำอธิบายและการทวนเป็นส่วนใหญ่ — ผมทำตามที่กำหนด แต่แนะนำให้ใส่ "ป้ายบอกทาง" ในเสียง (เช่น บอกตอนต้นว่าสรุปสั้น ๆ อยู่ช่วงท้าย) เพื่อไม่ให้ผู้ฟังต้องฟังทั้งหมดเพื่อรู้ประเด็นหลัก

### H4. กลไกความยาว (duration control)
1. ประเมินจากจำนวนอักษรต่อ segment ด้วยค่า calibrate จริง (อัตรา chars/วินาที วัดจากเสียง TTS จริงของ voice ที่ใช้ — ไม่ใช่ค่าเดา 9 ตัวอักษร/วินาทีเดิม)
2. synth ต่อ segment → เก็บ cache รายส่วน → concat (เว้น 400–600 ms ระหว่างช่วง) → loudnorm → MP3 (mono, 64 kbps พอสำหรับเสียงพูด)
3. **ffprobe วัดความยาวจริง**; gate: `duration > 600.0 s` (เท่ากับ 600 ถือว่า FAIL)
4. ไม่ผ่าน → เติม tier ถัดไป (explainer เพิ่ม/ทวนขยาย) แล้ว synth เฉพาะส่วนที่เพิ่ม สูงสุด 2 รอบ
5. ยังไม่ผ่าน → **ไม่ส่ง Audio**; pipeline ส่ง Flex เท่านั้น (ข้อมูลน้ำสำคัญกว่า), บันทึก status `audio-withheld`, workflow แจ้ง fail ชัดเจน
6. ตั้งเพดานบนด้วย (เช่น ไม่เกิน ~18 นาที) กันบานปลาย

### H5. Thai speech normalizer (ลด TTS artifact)
แปลงก่อนส่ง TTS ด้วยกฎแน่นอน: ตัวเลข/ทศนิยม → คำอ่านไทย, เวลา `05:40` → "ตีห้าสี่สิบนาที", `%` → "เปอร์เซ็นต์", `°C` → "องศาเซลเซียส", `ม.` → "เมตร", ต./อ./จ. → คำเต็ม, `km/h` → "กิโลเมตรต่อชั่วโมง"; ตัวเลขที่อ่านออกมาต้องอยู่ใน allow-list (รูปคำพูดของ fact เดิม)

### H6. ป้องกัน "AI อ่านรายงาน"
- ตรวจ similarity: ห้ามมีลำดับคำยาวเกิน N คำซ้ำกับข้อความ Flex หรือ report draft (ยกเว้นชื่อเฉพาะ/ตัวเลขจาก fact)
- ตรวจโครง: ต้องมีครบ 10 ช่วง (ช่วง 5 ทดแทนได้), มีคำเปิด/ปิด, มี marker เชื่อมช่วง
- Narration ต้องยาวกว่าข้อความทั้งหมดบน Flex หลายเท่า (ตั้งเกณฑ์ขั้นต่ำ)

---

## I. Safety Constraints

1. **Severity เป็นของ adapter เท่านั้น** — ตัด `severity/priority/visualVariant` ออกจาก schema ที่ Gemini กรอก; Gemini เห็นได้แต่แก้ไม่ได้; ทุก output ตรวจว่าตรงกับ facts
2. **Allow-list ต่อ segment/การ์ด:** ตัวเลข, ชื่อสถานี, ชื่อลำน้ำ, ถนน, พื้นที่, เวลา — ทุก token ต้องอยู่ใน FactsSnapshot (รวมรูปคำพูดไทย) มิฉะนั้น reject (ขยายจากเดิมที่เช็กเฉพาะตัวเลข)
3. Gemini ตอบเป็น `{text, factIds[]}` — factId ต้องอยู่ใน `allowedFactIds` ของ segment นั้น
4. ห้ามเด็ดขาด (regex + test): "ปลอดภัยแน่นอน", "น้ำท่วมแน่นอน", "ยืนยันว่าเกิดน้ำท่วม", การอนุมานว่าฝนทำให้ท่วม, ราคาปาล์ม/ราคายาง/ข่าวทั่วไป; พูด URL ยาวในเสียง
5. **Stale ≠ severity:** คง severity เดิม + แสดง freshness; ถ้ายืนยันไม่ได้ → UNKNOWN; UNKNOWN ต้องไม่ใช้ token ภาพของ NORMAL
6. Action/คำแนะนำมาจาก facts หรือ library ที่ผ่านอนุมัติเท่านั้น (ไม่ให้ LLM เขียนคำแนะนำความปลอดภัยใหม่)
7. **Cross-channel consistency:** severity, trend, freshness, ชุดสถานีที่กล่าวถึงใน Audio ต้องเป็นเซตย่อยของที่ Flex/Facts มี และไม่ขัดกัน
8. Fail-closed: safety ไม่ผ่าน → retry จำกัดครั้ง → ใช้ deterministic fallback narration จากเทมเพลต+library → ยังไม่ผ่านเกณฑ์ → ถอน Audio (ไม่ส่งข้อความที่ไม่ผ่านตรวจ)
9. Library ถูกระบุเวอร์ชันและมีสถานะ "รอทบทวนโดยชุมชน" ก่อน production (ผมร่างและ merge ได้ตามที่สั่ง แต่ production ยัง NO-GO)
10. Secrets: ไม่เขียน token ลงไฟล์/ลิงก์/commit/log

---

## J. Test Plan

**J0 — ซ่อม baseline:** แก้ SyntaxError ใน `tests/safetyFirewall.test.js` ให้ `npm test` เขียวทั้งหมด; เพิ่มขั้นตอน CI ที่ fail เมื่อมีไฟล์ test ที่ parse ไม่ได้

**J1 — Contract/unit:** schema VisualPlan/NarrationPlan, FactsSnapshot (fact IDs, allow-list รวมรูปคำพูดไทย), Thai normalizer (ตาราง golden เลข/เวลา/หน่วย)

**J2 — Flex structural (matrix: 5 severity × fresh/stale × {ไม่มีสถานี, 1, 3+, ชื่อยาว} × {มี/ไม่มี weather})**
- Card 1 มี severity icon + label text + trend chip + freshness chip; มี visual block ≥ 1; ไม่มี text node ย่อหน้า; ไม่เกิน text budget
- CRITICAL: action strip อยู่ใน Card 1; UNKNOWN: มีข้อความ "ยังยืนยันไม่ได้" และไม่มีไอคอน/สี normal; STALE: มี "ข้อมูลล่าสุด" และ severity ไม่เปลี่ยน
- grayscale test: ลบสีออกแล้วแยก 5 สถานะได้จาก label/icon
- การ์ดแต่ละใบมี structure hash ไม่ซ้ำกันทั้งหมด; ทุกการ์ดมี heading; bubble size เท่ากัน; ≤ 12 bubble; payload < 50 KB; altText ≤ 400 และ flood-first
- ตัวเลข/ชื่อบนการ์ด ⊆ facts (เพราะมาจาก fact ID); CTA URI ตรง allow-list 3 ตัว
- golden JSON snapshot 6 fixtures + HTML preview เพื่อตรวจตาด้วยคน

**J3 — Narration:** ครบ 10 ช่วงตามลำดับ (ช่วง 5 conditional), มีเปิด/ปิด/ตัวเชื่อม, ไม่มี URL, negative tests ของ firewall (แต่งสถานี/ถนน/เวลา/ตัวเลข, "ปลอดภัยแน่นอน", ฝน→ท่วม, ปาล์ม/ยาง), similarity ต่อ Flex และ report, factIds ⊆ allowedFactIds, fallback narration ผ่านทุกข้อ

**J4 — Audio:** ไฟล์ทดสอบที่สร้างด้วย ffmpeg ความยาว 9:59 / 10:00 / 10:01 / 11:00 → ≤ 600 FAIL, > 600 PASS; validator ไม่ clamp; ffprobe vs header estimate ต่างกัน < 1%; size cap/bitrate รองรับ 20 นาที; LINE `duration` = ค่าที่วัดจริง; mock TTS ทดสอบ chunk+concat+gap; silencedetect (ไม่มีเงียบ > 3 วินาทีกลางไฟล์), clipping, loudness ใกล้เป้า; pipeline test: gate fail → ไม่มี audio message (Flex only) + status `audio-withheld`

**J5 — Pipeline integration (mock Gemini+TTS) 6 fixtures** และ regression ของ Decision 019 (ห้ามตลาด/ข่าว)

**J6 — Acceptance:** อัปเดต workflow `v1-5-line-test-acceptance` → รุ่นใหม่; บันทึก acceptance record; **ข้อจำกัดที่ต้องบอกตรง ๆ:** ผมฟังเสียงและดูใน LINE จริงไม่ได้ — "เสียงเป็นธรรมชาติ/ไม่มี artifact" และ "อ่านง่ายบนมือถือ" ยืนยันได้เต็มที่หลังคนตรวจใน LINE TEST; ส่วนที่ผมทำได้คือ test อัตโนมัติที่วัดได้ + preview

---

## Implementation Plan (แต่ละ phase merge → main เมื่อ CI เขียว)

| Phase | งาน | ผลที่ต้องเห็น |
|---|---|---|
| P0 | ซ่อม `safetyFirewall.test.js`; Decision 022; อัปเดต PRD/Phase docs/CHECKLIST ให้ตรง requirement ใหม่ (docs เท่านั้น) | `npm test` เขียว; เอกสารไม่ขัดกัน |
| P1 | `facts.js`, `visualPlan.js`, `narrationPlan.js`, explainer library + tests (ยังไม่แตะ runtime) | contract + fixture 6 state |
| P2 | Flex v2: tokens, components, variants, lint, builder ใหม่, HTML preview; ลบ dead code; เปิดใช้ใน pipeline | Flex 5 state ผ่านเมทริกซ์ J2 |
| P3 | Narrator per-segment, Thai normalizer, fallback narration, firewall v2 | narration ผ่าน J3 |
| P4 | Long-form TTS, ffprobe gate >600 s, ปลด clamp/size cap, withhold behavior, LINE duration จริง | ผ่าน J4 |
| P5 | แทน qualityScore ด้วย lint, cross-channel consistency, regression matrix | ผ่าน J5 |
| P6 | Workflow acceptance + LINE TEST + acceptance record | หลักฐานให้คนตรวจ |

ไม่แตะ: schedule production (NO-GO คงเดิม), flood adapter/ความหมาย severity, หัวข้อตลาด/ข่าว (ห้ามกลับมา)

## จุดที่ผมตัดสินใจเองด้วยค่า default (บอกไว้เพื่อให้แก้ได้)
1. Audio gate ไม่ผ่าน → ส่ง Flex อย่างเดียว ไม่ถือทั้งสองข้อความ
2. MP3 ใช้ mono 64 kbps และปรับ size cap ตามความยาวเป้า
3. Explainer library ผมร่างเอง ติดสถานะ "รอทบทวนโดยชุมชน"
4. ยังเก็บ MP3 ใน public repo ตามเดิม (ขนาดต่อวันจะโตขึ้น ~5–6 MB — ควรพิจารณา storage อื่นภายหลัง)
