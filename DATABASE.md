# SkyAudio-Alert — Database

> **Scope review notice — 2026-10-03:** รอบ flood-first ยังไม่เพิ่ม database โดยอัตโนมัติ; ต้องตัดสินใจเฉพาะว่าต้องเก็บ flood history/freshness หรือไม่หลัง source contract ชัดเจน รายละเอียดและขอบเขตอยู่ที่ [`docs/SCOPE_REVIEW_REPORT.md`](docs/SCOPE_REVIEW_REPORT.md)

V1 has no database (Decision 007 in DECISIONS.md).

State that would normally need a database is avoided by design:

- **Weather data** is fetched fresh every run — nothing is stored.
- **Audio files** are committed to `public/audio/<date>.mp3` in this repo; git itself is the history/log.
- **Run logs** are structured JSON lines printed to the GitHub Actions log for that run — no external log store.

If a future version needs delivery history, deduplication, or multiple destinations, that is the trigger to introduce a lightweight store (e.g. a Supabase table, matching the stack already used in other projects) rather than adding one preemptively.
