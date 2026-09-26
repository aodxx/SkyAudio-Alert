# SkyAudio-Alert — น้องจุ่นจ้าน

ระบบพยากรณ์อากาศประจำวันสำหรับกลุ่มไลน์บ้านลำพาย ต.โคกชะงาย อ.เมือง จ.พัทลุง

ทุกเช้า 06:00 น. (เวลาไทย) ระบบจะ:
1. ดึงข้อมูลจาก Open-Meteo
2. วิเคราะห์อากาศด้วยกฎแบบ deterministic
3. ดึงราคาปาล์มน้ำมันและยางพาราจากแหล่งข้อมูลจังหวัดแบบ conservative
4. ดึงข่าวประชาสัมพันธ์ท้องถิ่นจากสำนักงานประชาสัมพันธ์จังหวัดพัทลุง
5. สร้าง LINE Flex ที่เปลี่ยนธีมตามสภาพอากาศ
6. สร้างเสียงภาษาไทยด้วย Gemini TTS โดยรวมอากาศ + ราคาผลผลิต + ข่าวสารไว้ในรายงานเสียงประมาณ 2–3 นาที สไตล์ผู้ประกาศเสียงตามสายของหมู่บ้าน
7. ส่ง Flex แล้วตามด้วย LINE Audio Message

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

ระบบมี duplicate guard สำหรับ Production: หากมีการส่งสำเร็จแล้วในวันเดียวกันตามเวลา Asia/Bangkok การรัน Production ซ้ำจะถูกข้าม เพื่อป้องกันประกาศซ้ำ ส่วน run ที่ล้มเหลวหรือส่งไม่สำเร็จยังสามารถรันซ้ำได้

ไม่ต้องมี `GOOGLE_TTS_API_KEY` สำหรับค่าเริ่มต้น

## TTS

ค่าเริ่มต้นใช้ **Gemini TTS** รุ่น `gemini-3.8-flash-tts` และเสียง `Sulafat` โดยบทพูดถูกออกแบบให้ยาวประมาณ 2–3 นาทีและมีจังหวะเหมือนประกาศเสียงตามสายของหมู่บ้าน: อบอุ่น เป็นกันเอง ชัดเจน พูดไม่รีบ และเว้นจังหวะตามหัวข้อ เพื่อให้ผู้สูงอายุฟังได้ง่าย

Edge TTS และ Google TTS ยังรองรับเป็นตัวเลือกสำหรับการทดสอบ/ย้อนกลับ โดยกำหนด `TTS_PROVIDER` ตาม provider ที่ต้องการ

หลังสร้างเสียง ระบบตรวจ MPEG frame และ duration ของ MP3 จริงก่อนจัดเก็บ โดยรองรับรายงานเสียงยาวถึงประมาณ 3 นาที สำหรับ production จะ push ไฟล์ก่อนสร้าง jsDelivr HTTPS URL และตรวจ HTTP 200 กับ `audio/mpeg` ก่อนเรียก LINE API

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


<!-- FLEX_ASSET_B64_BEGIN -->
iVBORw0KGgoAAAANSUhEUgAAAHgAAABNBAMAAACf/b3/AAAAJFBMVEW5s6iarLWakX1ti41pZ0ZkSTA6Sj4yKRkQEA8AAIoAAgAAAABoWXNbAAAAAXRSTlMAQObYZgAAB5JJREFUeNrNmE9sY0cdxz+/sXdjtxD/3kvVJls1Gb+UBSqVOutScd2q5VgWJP6c0AokuJZL4cgRTpQjPRVxbq8cylYrJKRqu0684rJC7fMkAtal2G+cisbJ1jMcnp042Wy2LReeZEvPM9/5/Znv7zu/Mfw/PpLo2RPMGVhF9HOCRWdfnwOsR0t8ZnAyHT0Lbc7C2nC2bTkj4NkT/X3AlQdjqSyMPwP4GDZrFFIbfwa3k8OU2ODu7/npbten0OZiz4O5tDD6hvvU4P0aYNaKwgPmO7KUP7w3/pRuH8/Xswqx40/x/B7LCz+rHf/hyWVAVkbjr/QfCH6+vrR6ex5rS2dWFj95tP8Ahv30Uswr5uslwmR8ycKk44FHGrsvn235xSZj7g7by//8oEbmdclCfKNwB8tQX3Fr7gxw1T5U27u7urebffXRWw81lx9ehnjTE4cHKyD1v/3wnfuCz13Zj772wUo9WZBkX+vS8sSbDqBEL//5pe59wOe/JXv7T/XH+4/1dVQv6m6jDzennk7R/1p1p4OfH9fHprY81oMVU0uSO80xvHs4dzi+AFIbN/qnZfuVSNa0MS8aPmnEYnOJGbbkTP4GIOmuPcXyz2XlYPFO34726nXGbC4F+LALyZgpM+PtCzVk5eGv3T5peSEWkS2v3ciOFjpMAgyuA8WRb+GaB9GFKycsVy+v1DefWhD2xsbW6//4KMLg7ZkWzooiugu1OLz9+MXb85bPXd6AZHNpjURUmWwHmLx9XEgBwltbELbOXZmvqu8izd6aYXIrG0bBtxyTNwFMAGOjJ43oSDvw5KoLpv34q0C1TFZBQhP8Yho9kaTErpcmKy2gDZPKpAPvBUyOf/nVKfhXhRZIw7PoQ5JDAvFNMN9snaDyBCDPyHJ4+VUqwAtJLsVODZD6MH2sn5SExvx4BrvRv3Cjf+fv/cf+CDBSktD9wkvvVKFKh0Qm77Nx61JjXa8lzAh9o9Jt0aHVlbgZAUpiB8CsXrtLhXNX9rW2V/nyeNyPD+n4L0dYw3/Gd+5AH6nEyjN9Whc6ABQJbK92qfLthpfoU/FAzw4SDoshticVZ4H2pALwHAfTMHIyG6yrnvMxsa6y5tQD742YK4Y2tOm24A9Xy7ejx1mgKg2z6oyabDhqZL1thcG8XNzocgN4DfjJPDi4VaiSEX2m+FR3h17nSHm0RRMqtE4UcHCWqgANrwzVTLbvxT7313K/yqgnx1etMnBqrFe7CafZnbwGV18Hzl89MeKo7jv5aA0gymnYA4Dz7anLlZOWjTZBi8apWM4/93SXDkycv3HP4SR8/5mRxGS4pUwL6UiiNihIog8mTDfAhLlh66o0RWISc4W4ecJs556jzbryM5OhfKTwvhyS8nDe/doYNxfzMIkbf9rWk1gMNjgTzKrDYsJOuVh2PGEyLAbbCps7didk85azYA7nG2vucSWvghbbCoNsXZ/1YU7HM0wGwd2/X6rS23AKA5elzcZbzrRtfqx/MYfO6Kghh0KcBolUodtyDJxZanZ/9KGzG7QpIJ7SRijqyz5Joi1jblrDwJn2hgmbKWIdtMlJfDrzOIs9KENOy74qmSWsdSuzxXq7MdzM5WlwZIDtDXdYnSWmOcPOmvipaFfZolh6YXiTXFILrmBTgaJXoSclp7LDDZI47e981BFUQYsOwaGS+i8CxAKQdRyFaPBKgu11LZAQXTINPypUsc4HjDTApwGSaT5lEnwCdqtIKk+4gZdLOSBqbMBlyHvZ7MRg6ku5qgeIU5VMTJg4KpdZjF40hpCX1SEIppzrAf9J8FAIIqACqRS+V7FET4Lxxy87HqWK0emLKB6IXkhABzSTiezGgE+ilEofDhPXSAUMATzDCNHjISHR0mlELyp2CzHNWBLNAjGQRYKPniqpCenxYgHwOm2736+QwuBRgGAExFjAJ0SqjC57kIYXpRgArF1PvCqA7flYWfUSnQS3CjgMEHZkLVqNGPASJRIxsVEWu+pRVmRDiXZtieBKlkXPTrBsNxhh8J7gB9taeOvLK0HPacRD6vDsCgI+FmXMURRb7mOkSky2nnAhXYXtRSAiTQF0QEBV31Um+dB4BxKIAiGH3G8ChiZPOOu61xONBggObc2ESNQ0oPC9Mv1mxqR8NsFHB4R8N3gAbw8lbgiQRIpLEEE12OMXCwM+szuLOcECFiNHA0TXw9PsKgWIwcxsRtbblzD8Jgf7rDWhJOmMb4DGwje3re/c9CQIZIvH77hVDtYbw1QNYnSSBSRSGJQg4MXSCqP4iQ/GKiHP7GG7HQteN/D7RwI0tZezvaQA0iiIXqxqRITd4FLxagAnhwTIc0cVxr/8ARTEm+lWEwHUN6OAePUKidqLDRkRgNCb3ckzCO8Y4OPXgajS2yhlxOde0LgNhsiuTZQYpZR+yLKpoKlWAUJRNETT7to1KurUZ5EoEOO/BwBpE2mWij2wRQcYVEC6rfKE+J2KmhxwiKJJgoAy9OXWGzG+NcynmzCVGf3Flenx8us4DFtlbweKLYoi+k6njDAA3nvcUe+sH3/vxaNO/7dGm4hBEJoZEYxdvD53Wmg6J90Hr1z9n//C+S+r71t94MTwqgAAAABJRU5ErkJggg==
<!-- FLEX_ASSET_B64_END -->
