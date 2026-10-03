

## 7. Phase 2 source adapters

### Flood center HTML adapter

`src/flood/phatthalungCenter.js` reads `https://chachoengsao-flood.vercel.app/phatthalung` with a normal GET and parses only server-rendered station rows. It does not use browser automation, submit forms, or infer readings from charts. Each recognized row preserves station name, waterway, source label, distance below bank, trend, observation time, and publisher.

The adapter maps source labels conservatively: `ล้นตลิ่ง` to `affected`, `ใกล้ล้นตลิ่ง` or `น้ำมาก` to `watch`, and `ปกติ` to `normal`. If no recognizable station rows remain, it throws `flood.parse` rather than returning `normal`.

### Phatthalung weather page adapter

`src/weather/phatthalungPage.js` reads `https://chachoengsao-flood.vercel.app/phatthalung/weather` and preserves the page snapshot for today, tomorrow, and the following day. It records the page attribution to Open-Meteo. The existing `src/weather/openMeteo.js` remains the exact-coordinate forecast source for บ้านลำพาย; the designated page is a secondary public reference, not a replacement.

The CCTV URL `https://cctv.maholan.net/` is intentionally not an automated source. It remains a LINE URI button because the live host returned HTTP 403 to the sandbox and the page is intended for human viewing.
