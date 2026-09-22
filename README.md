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