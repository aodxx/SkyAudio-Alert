# 🔒 FLOOD-FIRST DOCUMENT LOCK — 2026-10-04

สถานะปัจจุบันของระบบคือ **Flood-first + supporting weather + Gemini adaptive content + Gemini TTS** เท่านั้น ราคาปาล์ม ราคายาง ข่าวทั่วไป และ fixed 2–3 minute audio เป็น historical scope และห้ามนำกลับเข้า production runtime.

# SkyAudio-Alert — น้องจุ่นจ้าน

ระบบรายงานสถานการณ์น้ำท่วมเป็นหลัก พร้อมพยากรณ์อากาศประจำวัน สำหรับกลุ่มไลน์บ้านลำพาย ต.โคกชะงาย อ.เมือง จ.พัทลุง โดยมีน้องจุ่นจ้านเป็นผู้ประกาศ

ทุกเช้า 06:00 น. (เวลาไทย) ระบบจะ:
1. รวบรวม/รายงานสถานการณ์น้ำท่วมและระดับน้ำของพัทลุงตามแหล่งข้อมูลที่กำหนด
2. ดึงพยากรณ์อากาศจาก Open-Meteo และวิเคราะห์ด้วยกฎแบบ deterministic
3. สร้าง LINE Flex carousel 4 ใบ: สรุปอากาศแบบไม่มีภาพ → ภาพระดับน้ำ → แผนที่ → CCTV; ค่าพยากรณ์ดึงจาก FactsSnapshot และแยกจากบทพูดเสียง
4. สร้าง narration เสียงจากข้อมูลน้ำ/อากาศโดยอิสระ ผ่าน safety check แล้วใช้ Gemini TTS สร้างเสียงภาษาไทย (เลือกโปรไฟล์หญิง/ชายและ model ผ่าน config)
5. ส่ง Flex แล้วจึงส่ง LINE Audio Message ด้วยคำขอแยกเข้า LINE กลุ่มบ้านลำพาย เมื่อเสียงผ่าน gate

**สถานะปัจจุบัน:** scheduled workflow ใช้ `RUN_MODE=test` และส่งไปยัง LINE TEST เท่านั้น ยังไม่ได้เปิด production schedule หรือ PROD destination

ปุ่มท้ายการ์ดใน Flex:
- การ์ด 1 — [ศูนย์ช่วยเหลือพัทลุง](https://chachoengsao-flood.vercel.app/phatthalung)
- การ์ด 2 — [แผนที่ระดับน้ำพัทลุง](https://chachoengsao-flood.vercel.app/phatthalung/map)
- การ์ด 3 — [พยากรณ์อากาศ / เรดาร์](https://chachoengsao-flood.vercel.app/phatthalung/weather)
- การ์ด 4 — [ภาพสด / CCTV](https://cctv.maholan.net/)

> ราคาปาล์ม ราคายาง และข่าวสารทั่วไปถูกตัดออกจากรายงาน production ใหม่แล้ว

ต้นทุนเป้าหมาย: **0 บาท/เดือน**

## GitHub Actions — Flood-first

### ทดสอบแบบ Dry Run
Actions → **Manual Flood-first test** → Run workflow → `dry_run=true`

Dry run จะดึงอากาศจริง สร้าง Flex และ MP3 จริง แต่ไม่ส่ง LINE และไม่ commit audio
ระบบวัดระยะ MP3 จริงด้วย `ffprobe`; ไม่มีเป้าหมายเวลาและไม่ยืดเสียงให้ครบความยาว ใช้เพียง guard ทางเทคนิค 10 วินาที–5 นาทีและขนาดไฟล์ไม่เกิน 16 MiB หากเสียงสังเคราะห์/ตรวจสอบ/จัดเก็บไม่ผ่าน จะไม่ส่ง Audio ที่ใช้ไม่ได้ แต่ Flex ที่ผ่าน lint ยังส่งได้ พร้อมบันทึก `audio.withheld` และทำให้ workflow จบแบบ degraded/non-zero

### ทดสอบส่งเข้า LINE Test
ตั้ง `dry_run=false` และต้องมี secrets:
- `LINE_CHANNEL_ACCESS_TOKEN_TEST`
- `LINE_GROUP_ID_TEST`

### Scheduled TEST และ Production
Workflow `Daily Flood-first announcement (TEST target)` รันที่ 23:00 UTC (06:00 Asia/Bangkok) และใช้ `RUN_MODE=test` พร้อม `LINE_CHANNEL_ACCESS_TOKEN_TEST` / `LINE_GROUP_ID_TEST` เท่านั้น

**Production ยังไม่เปิดใช้งาน.** ห้ามเปลี่ยน workflow ไปใช้ PROD secrets หรือเปิด schedule สำหรับกลุ่มจริง จนกว่า B1–B4 และการตรวจรับ Flex/Audio โดยมนุษย์จะผ่านครบ. เมื่อได้รับอนุมัติในอนาคต Production จะใช้ `LINE_CHANNEL_ACCESS_TOKEN_PROD` และ `LINE_GROUP_ID_PROD` แยกจาก TEST.

เมื่อเปิด Production ในอนาคต duplicate guard จะป้องกันการส่ง Flex ซ้ำในวันเดียวกัน แม้ Audio จะถูก withheld; หากล้มเหลวก่อนส่ง Flex จึงจะรันซ้ำได้

ไม่ต้องมี `GOOGLE_TTS_API_KEY` สำหรับค่าเริ่มต้น

## TTS

เสียงสร้างแยกจาก Flex โดยใช้บท 4 ช่วงจากข้อมูลน้ำ/อากาศ ผ่าน safety firewall ก่อนเข้า **Gemini TTS** เพียงหนึ่งครั้ง ตาม `TTS_PROFILE` หญิง/ชายและ `GEMINI_TTS_MODEL` ที่ตั้งค่าไว้ เช่น Gemini Flash TTS หรือ Flash-Lite TTS โดยต้องตรวจสอบ model availability กับ API จริงก่อน deploy ให้ความยาวเป็นไปตามข้อมูลจริง ไม่กำหนด target นาทีและไม่เติมคำซ้ำ บทควรฟังเหมือนคนเล่าให้เพื่อนบ้านฟัง เปิดด้วยคำทักทาย มีคำเชื่อมธรรมชาติ สรุปสั้น ๆ ฝากความปรารถนาดี ขอบคุณ บอกลา และกล่าวพบกันใหม่ได้ โดยคำพูดอบอุ่นเหล่านี้ห้ามเพิ่มข้อเท็จจริงของสถานการณ์ เสียงต้องชัดเจนและเหมาะกับผู้สูงอายุ

Production scope uses Gemini TTS. Other providers are historical/testing-only and must not become the production default without a new decision.

หลังสร้างเสียง ระบบตรวจ MPEG frame, ffprobe-measured duration จริง 10,000–300,000 ms (10 วินาที–5 นาที) และขนาดไฟล์ไม่เกิน 16 MiB ก่อนจัดเก็บ ไม่กำหนดเป้าหมายความยาว สำหรับ production จะ push ไฟล์ก่อนสร้าง jsDelivr HTTPS URL และตรวจ HTTP 200 กับ `audio/mpeg` ก่อนเรียก LINE API

## ทดสอบในเครื่อง

```bash
python3 -m pip install edge-tts
npm run dryrun
npm test
```

## ความปลอดภัย
- ห้าม commit LINE token/API key
- credential ที่เคยเผยแพร่ในแชทให้ถือว่า exposed และควร revoke/rotate ก่อนใช้งานจริง
- ใช้ GitHub Actions Secrets สำหรับค่าลับ

สถานะการรื้อ runtime อยู่ที่ [Phase 3 Status](docs/PHASE3_STATUS.md); ส่วน [Scope Review Report](docs/SCOPE_REVIEW_REPORT.md) เป็นจุดอ้างอิงกลางของ In/Out/Deferred, blocker และ release gate

รายละเอียดเพิ่มเติม: `PRD.md`, `ARCHITECTURE.md`, `API.md`, `DECISIONS.md` และ `CHANGELOG.md`

เอกสาร [`docs/REFACTOR_PLAN_FLOOD_WEATHER.md`](docs/REFACTOR_PLAN_FLOOD_WEATHER.md) เป็นประวัติแผนเปลี่ยนจากราคา/ข่าวสารมาเป็น Flood-first; runtime ปัจจุบันทำงานตามขอบเขตนี้แล้ว ให้ใช้ [CHECKLIST](CHECKLIST.md) และ [Phase 3 Status](docs/PHASE3_STATUS.md) ตรวจความพร้อมล่าสุด

รายละเอียดเสียงรายวันอยู่ที่ [`docs/DESIGN_AUDIO_FLEX_FLOOD_DAILY.md`](docs/DESIGN_AUDIO_FLEX_FLOOD_DAILY.md); Flex ตามเอกสารเก่าเป็นประวัติและถูกแทนที่ด้วยสเปก 4 ใบใน Decision 024

## 🌿 บริบทสถานที่จริงและ Design Reference

โปรเจกต์นี้ออกแบบสำหรับการใช้งานจริงในชุมชนบ้านลำพาย จึงควรดูบริบทของพื้นที่ ผู้คน จุดรวมตัว และสภาพแวดล้อมจริงก่อนออกแบบหน้าตา ข้อความ หรือรูปแบบการประกาศเพิ่มเติม

**Google Drive — รูปภาพ/วิดีโอ/เอกสารบริบทพื้นที่สำหรับทีมพัฒนาและ AI Agent**

[เปิดโฟลเดอร์ Design & Community Context](https://drive.google.com/drive/folders/1k7q_5zSLQWZRdjfSclRW_K-4WlsY093c)

ใช้โฟลเดอร์นี้เป็นแหล่งอ้างอิงด้านบริบท (ไม่ใช่แหล่งข้อมูลสภาพอากาศ) เช่น:
- ศาลาเอนกประสงค์และพื้นที่ส่วนกลาง
- บรรยากาศและสภาพแวดล้อมของหมู่บ้าน
- ลักษณะการใช้งานของคนในชุมชน
- ไอเดียสำหรับ visual theme, iconography, สี, ภาษา และ layout
- แนวทางออกแบบให้เหมาะกับผู้สูงอายุและผู้ใช้ที่อ่านข้อมูลได้ยาก

### แนวทางสำหรับ AI Agent / ทีมพัฒนารุ่นต่อไป

ก่อนปรับ Design ให้เปิดดูข้อมูลในโฟลเดอร์นี้และตอบให้ได้ว่า:
1. พื้นที่จริงมีลักษณะอย่างไร
2. คนในชุมชนใช้งานพื้นที่อย่างไร
3. อะไรควรสะท้อนความเป็นท้องถิ่นโดยไม่ทำให้ UI รก
4. สี/ภาพ/ไอคอนแบบใดช่วยให้ผู้สูงอายุเข้าใจเร็ว
5. สิ่งใดควรเป็นข้อมูลจริงจาก API และสิ่งใดเป็นเพียง Design reference

**ข้อควรระวัง:** ห้ามนำรูปบุคคลหรือข้อมูลส่วนบุคคลจากโฟลเดอร์ไปใช้ใน production โดยอัตโนมัติ ต้องตรวจสิทธิ์การใช้งานและความเหมาะสมก่อนเสมอ


## 📌 Current Release Readiness — 2026-10-07

**Production: NO-GO.** LINE TEST run `37612281724` ส่ง Flex และ Audio สำเร็จ; narration ใน run นั้นใช้ `quota-safe-fallback`, ส่วน Gemini TTS สร้าง MP3 จริงยาว 112.968 วินาทีและ LINE รับ Audio สำเร็จ. Live Gemini Content → TTS acceptance ผ่านตาม Decision 020; แต่ production ต้องรอ official flood API และ human review. Config hard-lock การส่ง production แม้ตั้ง PROD secrets แล้ว.

- **B1 — OPEN:** รอ official API provider Base URL, access method และ station mapping สำหรับพัทลุง; HTML source ปัจจุบันใช้ได้เฉพาะ TEST.
- **B2 — PASS:** ผู้ใช้เลือก `no-send`; flood fetch error, stale/unknown severity หรือไม่มี station readings ที่ยืนยันได้ จะหยุดก่อนส่ง LINE.
- **B3 — PASS:** มี live Content → TTS acceptance; การ fallback ไม่เปลี่ยนข้อเท็จจริง และ run ล่าสุดยืนยัน Gemini TTS/LINE Audio.
- **B4 — กำลังปิด:** ปรับ config, pipeline, workflows และเอกสารให้ตรงนโยบาย; ต้องผ่าน full tests และ PR CI.
- **Human review — PENDING:** ยังต้องตรวจ Flex บน LINE client จริงและกดเล่น Audio.

ไฟล์สถานะหลัก: [CHECKLIST](CHECKLIST.md), [Phase 3 Status](docs/PHASE3_STATUS.md), [Scope Review Report](docs/SCOPE_REVIEW_REPORT.md).

## Historical — V1.5 Visual & UX Execution Plan — 2026-10-04

แผนด้านล่างเป็นบันทึกย้อนหลัง ไม่ใช่รายการงานปัจจุบัน; ให้ยึด production readiness gates ด้านบนและ CHECKLIST.md แทน

เอกสาร `docs/V1_5_VISUAL_UX_BLUEPRINT.md` เป็นแผนลงมือทำแบบเป็นเฟส ตั้งแต่ baseline, visual design, presentation contract, adaptive Flex, adaptive Audio, safety/QA, LINE TEST จนถึง production release gate

ในแต่ละเฟสกำหนดไว้ 4 เรื่อง:
- งานที่ต้องทำ
- ไฟล์/พื้นที่ที่เกี่ยวข้อง
- สิ่งที่ต้องเห็นเมื่อเสร็จ
- Exit criteria ก่อนอนุญาตให้ไปเฟสถัดไป

**หลักการ:** ทำทีละเฟสและหยุดตรวจผลทุกครั้ง เพื่อไม่ให้ UI, Gemini prompt, Audio และ pipeline ต้องรื้อซ้ำ

**Production ยัง NO-GO** จนกว่า release gates และ human acceptance จะผ่านครบ
