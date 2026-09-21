# SkyAudio-Alert — Repository Structure

## Phase 1 target

```text
SkyAudio-Alert/
├── .github/
│   └── workflows/
│       ├── weather-test.yml
│       └── weather-daily.yml
│
├── src/
│   ├── config/
│   │   └── index.js
│   ├── weather/
│   │   ├── openMeteo.js
│   │   ├── normalize.js
│   │   ├── analyzer.js
│   │   └── weatherCodes.js
│   ├── forecast/
│   │   ├── advice.js
│   │   ├── thaiScript.js
│   │   └── formatter.js
│   ├── flex/
│   │   ├── builder.js
│   │   ├── themes.js
│   │   └── components.js
│   ├── audio/
│   │   ├── tts.js
│   │   ├── validate.js
│   │   └── storage.js
│   ├── line/
│   │   └── messagingApi.js
│   ├── core/
│   │   ├── pipeline.js
│   │   ├── retry.js
│   │   └── logger.js
│   └── index.js
│
├── tests/
│   ├── weather/
│   ├── forecast/
│   ├── flex/
│   ├── audio/
│   └── line/
│
├── fixtures/
│   └── weather/
│
├── docs/
│   └── examples/
│
├── PRD.md
├── ARCHITECTURE.md
├── DATABASE.md
├── API.md
├── DECISIONS.md
├── CONTEXT.md
├── CHANGELOG.md
├── README.md
├── package.json
├── .env.example
└── .gitignore
```

## Responsibilities

### `src/config`
Centralizes environment/config parsing and validation.

### `src/weather`
Owns the weather-provider adapter, normalization, weather codes, and deterministic analysis.

### `src/forecast`
Turns analysis into practical Thai advice and speech-ready text.

### `src/flex`
Builds LINE Flex JSON and chooses the visual theme.

### `src/audio`
Handles TTS, audio validation, and asset delivery/storage.

### `src/line`
Contains only LINE Messaging API integration.

### `src/core`
Orchestrates the pipeline, retries, and structured logging.

### `tests`
Unit/integration tests by domain.

### `fixtures`
Stable weather examples for testing sunny, cloudy, rain, heavy rain, hot, and cool scenarios.

### `.github/workflows`
Manual test workflow and daily scheduled workflow.

## Dependency direction

```text
core
 ├── weather
 ├── forecast
 ├── flex
 ├── audio
 └── line

weather  → external weather provider
audio    → TTS/storage provider
line     → LINE Messaging API
```

Domain logic should not import GitHub Actions-specific code.

## Phase 2 implementation order

1. `src/config`
2. `src/weather/openMeteo.js`
3. `src/weather/normalize.js`
4. `src/weather/weatherCodes.js`
5. `src/weather/analyzer.js`
6. `src/forecast/advice.js`
7. `src/forecast/thaiScript.js`
8. `src/flex/themes.js`
9. `src/flex/components.js`
10. `src/flex/builder.js`
11. `src/core/pipeline.js`

TTS, LINE, and workflows follow after the deterministic forecast core is testable.
