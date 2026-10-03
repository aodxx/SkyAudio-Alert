# Phase 2 Status — Real Flood/Weather Sources

**วันที่:** 2026-10-04  
**สถานะ:** Adapter implemented and verified read-only; pipeline production wiring remains pending

## Sources

| บทบาท | URL | ผลตรวจ |
|---|---|---|
| Flood center | `https://chachoengsao-flood.vercel.app/phatthalung` | server-rendered HTML มีรายการสถานี/ระดับน้ำ/เวลาวัด/แนวโน้มจริง |
| Weather page | `https://chachoengsao-flood.vercel.app/phatthalung/weather` | server-rendered HTML มีพยากรณ์ 3 วัน ฝน ลม และระบุ Open-Meteo |
| CCTV | `https://cctv.maholan.net/` | ตอบ 403 จาก sandbox; ใช้เป็น user-facing button เท่านั้น ไม่ใช่ machine adapter |
| Exact weather API | Open-Meteo adapter เดิม | ยังคงเป็นแหล่ง forecast หลักสำหรับพิกัดบ้านลำพาย เพราะให้ข้อมูลพิกัดตรงกว่า weather page ที่ระบุว่าเป็นกลางจังหวัด |

## Added code

- `src/flood/phatthalungCenter.js`
  - fetches the flood-center HTML read-only
  - parses station label, station name, waterway, distance below bank, trend, observation time, publisher
  - maps `ล้นตลิ่ง → affected`, `ใกล้ล้นตลิ่ง/น้ำมาก → watch`, `ปกติ → normal`
  - returns normalized `FloodSituation`
  - fails closed when recognizable station rows are missing
- `src/weather/phatthalungPage.js`
  - fetches the designated weather page read-only
  - parses today/tomorrow/day-after rainfall and probability snapshots
  - preserves URL and Open-Meteo attribution
  - remains a secondary snapshot; it does not replace the exact-coordinate Open-Meteo adapter
- `src/flood/contract.js`
  - expanded to preserve normalized station rows and distance-to-bank
- `tests/source-adapters.test.js`
  - validates HTML captured from the live source shape
  - validates fail-closed behavior

## Live read-only verification

The adapter fetched the live flood page and returned:

- 6 recognizable stations
- current aggregate severity: `watch`
- top station: น้ำตกโตนแพรทอง / คลองลำสิน, `ใกล้ล้นตลิ่ง`, 0.42 m below bank, stable
- second station: สะพานข้ามคลองบางม่วง / ทะเลหลวง, `น้ำมาก`, 0.94 m below bank, stable
- freshness calculated from the latest observed station time

The weather page returned 3 daily cards and Open-Meteo attribution.

## Important limitation

This is a strict HTML adapter, not a stable API integration. The page is rendered by Next.js and may change markup without notice. Until a machine-readable contract is confirmed, production should keep the adapter behind a source health check and use `unknown-weather` degraded behavior when parsing fails. Do not infer “flooded” from weather forecast alone.

## Next gate

Before wiring into the production pipeline:

- [ ] decide whether HTML adapter is acceptable for the first production trial
- [ ] add source health/status fields to `public/status/last-run.json`
- [ ] wire flood stage into pipeline with `FLOOD_DEGRADED_MODE`
- [ ] add Flex flood rendering and Gemini content input
- [x] keep market/news stages out of the new pipeline path — completed in Phase 3; see [`PHASE3_STATUS.md`](PHASE3_STATUS.md)
