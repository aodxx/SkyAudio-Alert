# SkyAudio-Alert — Database

V1 has no database (Decision 007 in DECISIONS.md).

State that would normally need a database is avoided by design:

- **Weather data** is fetched fresh every run — nothing is stored.
- **Audio files** are committed to `public/audio/<date>.mp3` in this repo; git itself is the history/log.
- **Run logs** are structured JSON lines printed to the GitHub Actions log for that run — no external log store.

If a future version needs delivery history, deduplication, or multiple destinations, that is the trigger to introduce a lightweight store (e.g. a Supabase table, matching the stack already used in other projects) rather than adding one preemptively.
