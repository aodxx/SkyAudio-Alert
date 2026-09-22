# SkyAudio-Alert — Architecture

## Data flow

```text
GitHub Actions (cron 06:00 Asia/Bangkok, or manual)
        │
        ▼
src/index.js
        │
        ▼
core/pipeline.js
        │
        ├─▶ weather/openMeteo.js   → raw Open-Meteo JSON (free, no key)
        ├─▶ weather/normalize.js   → stable WeatherData shape
        ├─▶ weather/analyzer.js    → theme + adviceSignals (deterministic rules)
        │
        ├─▶ forecast/formatter.js  → hourly slots, advice sentences, Thai script
        ├─▶ flex/builder.js        → LINE Flex JSON (visual message)
        │
        ├─▶ audio/tts.js           → Edge TTS (free default; Google optional)
        ├─▶ audio/validate.js      → duration/size checks
        ├─▶ audio/storage.js       → commit MP3 to this repo, serve via jsDelivr
        │
        └─▶ line/messagingApi.js   → push Flex + Audio to the LINE group
```

## Why this is free (PRD G5)

| Component | Cost |
|---|---|
| Weather data | Open-Meteo — free, no API key |
| Scheduler/runner | GitHub Actions — free minutes on a public repo |
| Audio hosting | The repo itself + jsDelivr CDN — free, HTTPS, no bucket |
| Text-to-speech | Edge TTS via `edge-tts` (free default); Google TTS remains optional |
| Messaging | LINE Messaging API — free push messages within LINE's own limits |

No server runs 24/7. The only recurring job is the scheduled GitHub Actions run.

## Failure policy (PRD 13.3)

- Weather fetch fails → whole run fails, nothing is sent (never fabricate weather).
- TTS/audio fails → required stage fails the run; no LINE delivery is attempted.
- LINE push fails → retried once for transient (5xx/429) errors, then the run fails loudly in the Actions log.

## Provider independence (PRD G7)

Every external call sits behind one small adapter file (`openMeteo.js`, `tts.js`, `messagingApi.js`). Swapping a provider means rewriting one file, not the pipeline.
