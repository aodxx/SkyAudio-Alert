# SkyAudio-Alert — น้องจุ่นจ้าน

ระบบพยากรณ์อากาศประจำวันสำหรับกลุ่มไลน์บ้านลำพาย ต.โคกชะงาย อ.เมือง จ.พัทลุง

ทุกเช้า 06:00 น. (เวลาไทย) ระบบจะ:
1. ดึงข้อมูลจาก Open-Meteo
2. วิเคราะห์อากาศด้วยกฎแบบ deterministic
3. สร้าง LINE Flex ที่เปลี่ยนธีมตามสภาพอากาศ
4. สร้างเสียงภาษาไทยด้วย Edge TTS ผ่าน `edge-tts` โดยไม่ต้องใช้ API key
5. ส่ง Flex แล้วตามด้วย LINE Audio Message

ต้นทุนเป้าหมาย: **0 บาท/เดือน**

## GitHub Actions

### ทดสอบแบบ Dry Run
Actions → **Manual weather test** → Run workflow → `dry_run=true`

Dry run จะดึงอากาศจริง สร้าง Flex และ MP3 จริง แต่ไม่ส่ง LINE และไม่ commit audio
หาก TTS, การตรวจ MP3 หรือขั้นตอนที่จำเป็นล้มเหลว job จะล้มเหลว ไม่รายงานว่าสำเร็จแบบ Flex-only

### ทดสอบส่งเข้า LINE Test
ตั้ง `dry_run=false` และต้องมี secrets:
- `LINE_CHANNEL_ACCESS_TOKEN_TEST`
- `LINE_GROUP_ID_TEST`

### Production
Workflow **Daily weather announcement** รันที่ 23:00 UTC ซึ่งตรงกับ 06:00 Asia/Bangkok
Production ต้องมี:
- `LINE_CHANNEL_ACCESS_TOKEN_PROD`
- `LINE_GROUP_ID_PROD`

ไม่ต้องมี `GOOGLE_TTS_API_KEY` สำหรับค่าเริ่มต้น

## TTS

ค่าเริ่มต้นใช้ `TTS_PROVIDER=edge` และเสียง `th-TH-PremwadeeNeural`
Google TTS ยังรองรับเป็นตัวเลือกโดยตั้ง `TTS_PROVIDER=google` และใส่ `GOOGLE_TTS_API_KEY`

หลังสร้างเสียง ระบบตรวจ MPEG frame และ duration ของ MP3 จริงก่อนจัดเก็บ สำหรับ production จะ push ไฟล์ก่อนสร้าง jsDelivr HTTPS URL และตรวจ HTTP 200 กับ `audio/mpeg` ก่อนเรียก LINE API

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

รายละเอียดเพิ่มเติม: `PRD.md`, `ARCHITECTURE.md`, `API.md`, `DECISIONS.md` และ `CHANGELOG.md`

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

