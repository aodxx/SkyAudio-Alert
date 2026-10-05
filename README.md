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

ปุ่มท้ายการ์ดใน Flex:
- การ์ด 1 — [ศูนย์ช่วยเหลือพัทลุง](https://chachoengsao-flood.vercel.app/phatthalung)
- การ์ด 2 — [แผนที่ระดับน้ำพัทลุง](https://chachoengsao-flood.vercel.app/phatthalung/map)
- การ์ด 3 — [พยากรณ์อากาศ / เรดาร์](https://chachoengsao-flood.vercel.app/phatthalung/weather)
- การ์ด 4 — [ภาพสด / CCTV](https://chachoengsao-flood.vercel.app/phatthalung/weather)

> ราคาปาล์ม ราคายาง และข่าวสารทั่วไปถูกตัดออกจากรายงาน production ใหม่แล้ว

ต้นทุนเป้าหมาย: **0 บาท/เดือน**

## GitHub Actions — Flood-first

### ทดสอบแบบ Dry Run
Actions → **Manual Flood-first test** → Run workflow → `dry_run=true`

Dry run จะดึงอากาศจริง สร้าง Flex และ MP3 จริง แต่ไม่ส่ง LINE และไม่ commit audio
ระบบวัดระยะ MP3 จริงด้วย `ffprobe`; ใน production หากเสียงสังเคราะห์/ตรวจสอบ/จัดเก็บไม่ผ่าน หรือความยาวอยู่นอก 3–5 นาที จะไม่ส่ง Audio ที่ใช้ไม่ได้ แต่ Flex ที่ผ่าน lint ยังส่งได้ พร้อมบันทึก `audio.withheld` และทำให้ workflow จบแบบ degraded/non-zero

### ทดสอบส่งเข้า LINE Test
ตั้ง `dry_run=false` และต้องมี secrets:
- `LINE_CHANNEL_ACCESS_TOKEN_TEST`
- `LINE_GROUP_ID_TEST`

### Production
Workflow **Daily Flood-first announcement** รันที่ 23:00 UTC ซึ่งตรงกับ 06:00 Asia/Bangkok
Production ต้องมี:
- `LINE_CHANNEL_ACCESS_TOKEN_PROD`
- `LINE_GROUP_ID_PROD`

ระบบมี duplicate guard สำหรับ Production: เมื่อ Flex ถูกส่งสำเร็จแล้วในวันเดียวกันตามเวลา Asia/Bangkok จะข้ามการรันซ้ำเพื่อป้องกัน Flex ซ้ำ แม้ Audio จะถูก withheld; หากล้มเหลวก่อนส่ง Flex จึงจะรันซ้ำได้

ไม่ต้องมี `GOOGLE_TTS_API_KEY` สำหรับค่าเริ่มต้น

## TTS

เสียงสร้างแยกจาก Flex โดยใช้บท 4 ช่วงจากข้อมูลน้ำ/อากาศ ผ่าน safety firewall ก่อนเข้า **Gemini TTS** เพียงหนึ่งครั้ง ตาม `TTS_PROFILE` หญิง/ชายและ `GEMINI_TTS_MODEL` ที่ตั้งค่าไว้ เช่น Gemini Flash TTS หรือ Flash-Lite TTS โดยต้องตรวจสอบ model availability กับ API จริงก่อน deploy เป้าหมายคือ 3–5 นาที โดยไม่เติมคำซ้ำเพื่อให้ครบเวลา บทควรฟังเหมือนคนเล่าให้เพื่อนบ้านฟัง เปิดด้วยคำทักทาย มีคำเชื่อมธรรมชาติ สรุปสั้น ๆ ฝากความปรารถนาดี ขอบคุณ บอกลา และกล่าวพบกันใหม่ได้ โดยคำพูดอบอุ่นเหล่านี้ห้ามเพิ่มข้อเท็จจริงของสถานการณ์ เสียงต้องชัดเจนและเหมาะกับผู้สูงอายุ

Production scope uses Gemini TTS. Other providers are historical/testing-only and must not become the production default without a new decision.

หลังสร้างเสียง ระบบตรวจ MPEG frame, ffprobe-measured duration จริง 180–300 วินาที (รวมขอบ) และขนาดไฟล์ไม่เกิน 16 MiB ก่อนจัดเก็บ สำหรับ production จะ push ไฟล์ก่อนสร้าง jsDelivr HTTPS URL และตรวจ HTTP 200 กับ `audio/mpeg` ก่อนเรียก LINE API

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

แผนปรับผลิตภัณฑ์จากรายงานราคา/ข่าวสารเป็น **สถานการณ์น้ำท่วมเป็นหลัก + พยากรณ์อากาศ** อยู่ที่ [`docs/REFACTOR_PLAN_FLOOD_WEATHER.md`](docs/REFACTOR_PLAN_FLOOD_WEATHER.md) โดยยังคงช่องทาง LINE Flex และ Audio Message ไว้ แต่กำหนดให้รื้อเนื้อหาและ layout ใหม่

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


## 📌 Project Status — Milestone 4A Live Acceptance — 2026-10-04

**สถานะล่าสุด: Milestone 4A — Gemini Live Acceptance ผ่านแล้ว ✅**

ยืนยันจากการทดสอบจริงว่า:
- Gemini Content สามารถสร้างรายงานจาก facts ที่กำหนดได้
- Gemini TTS สร้างเสียงภาษาไทยได้จริง
- Audio ที่ได้ผ่านการตรวจสอบ MP3/duration ของระบบ
- เส้นทาง Gemini Content → Gemini TTS ทำงานครบใน live acceptance
- Unit tests ล่าสุดผ่าน **40/40**

### ขั้นถัดไป
**Milestone 4B — LINE Test Acceptance**: ทดสอบสายงานจริง Flood → Weather → Gemini → Flex → Gemini TTS → LINE Test และตรวจ Flex บนมือถือ + การเล่น Audio จริง

**Production: ยังเป็น NO-GO** จนกว่าจะผ่าน LINE Test, human review และ B1/B2/B4 release gates


## 🧪 Milestone 4B — LINE Test Acceptance

ใช้ GitHub Actions workflow **Milestone 4B — LINE Test Acceptance** สำหรับส่งรายงานจริงเข้า LINE TEST เท่านั้น โดย workflow จะรัน `DRY_RUN=false` และใช้ `LINE_CHANNEL_ACCESS_TOKEN_TEST` / `LINE_GROUP_ID_TEST` แยกจาก production

ก่อนกด Run ต้องตรวจว่า TEST group เป็นกลุ่มทดสอบ ไม่ใช่กลุ่ม production จริง หลังส่งแล้วต้องตรวจ Flex บนมือถือและฟัง Audio จริงก่อนบันทึกผลเป็น PASS


## 📌 Milestone 4B Delivery Update — 2026-10-04

**ล่าสุด: LINE TEST delivery ผ่านแล้ว ✅**

จากการรันจริง `DRY_RUN=false` ระบบส่งทั้ง **Flex Message** และ **Audio Message** เข้ากลุ่ม LINE TEST ได้สำเร็จ

สิ่งที่ยังต้องตรวจเพื่อปิด Milestone 4B:
- ตรวจการแสดงผล Flex บนมือถือจริง
- ยืนยันว่า Flex มาก่อน Audio ตามที่ออกแบบ
- กดเล่นและฟัง Audio จริง
- ตรวจเนื้อหาว่าไม่มีราคาปาล์ม/ยางพารา/ข่าวทั่วไป
- บันทึก human acceptance

**Production: ยังเป็น NO-GO**

## 🎨 V1.5 Visual & UX Execution Plan — 2026-10-04

เอกสาร `docs/V1_5_VISUAL_UX_BLUEPRINT.md` เป็นแผนลงมือทำแบบเป็นเฟส ตั้งแต่ baseline, visual design, presentation contract, adaptive Flex, adaptive Audio, safety/QA, LINE TEST จนถึง production release gate

ในแต่ละเฟสกำหนดไว้ 4 เรื่อง:
- งานที่ต้องทำ
- ไฟล์/พื้นที่ที่เกี่ยวข้อง
- สิ่งที่ต้องเห็นเมื่อเสร็จ
- Exit criteria ก่อนอนุญาตให้ไปเฟสถัดไป

**หลักการ:** ทำทีละเฟสและหยุดตรวจผลทุกครั้ง เพื่อไม่ให้ UI, Gemini prompt, Audio และ pipeline ต้องรื้อซ้ำ

**Production ยัง NO-GO** จนกว่า release gates และ human acceptance จะผ่านครบ
