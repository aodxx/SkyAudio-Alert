# SkyAudio-Alert — Product Requirements Document (PRD)

**Version:** 0.2.0  
**Phase:** 1 — Product Definition & Foundation  
**Date:** 2026-09-22  
**Product:** SkyAudio-Alert  
**Community assistant:** น้องจุ่นจ้าน  
**Primary repository:** `aodxx/SkyAudio-Alert`

---

## 1. Executive Summary

SkyAudio-Alert is a small, autonomous weather-announcement system for the LINE group serving บ้านลำพาย, ต.โคกชะงาย, อ.เมือง, จ.พัทลุง.

The system is designed around a simple community need:

> Every morning, residents should receive a useful weather announcement that is easy to understand and easy to listen to.

The system will automatically run at **06:00 Thailand time**, retrieve weather data for the configured location, interpret the data into practical information, create a visually clear LINE Flex Message, create a Thai spoken announcement, and send both to the LINE group.

The production runtime must **not depend on Manus, an AI Agent, or a human operator**.

The first version is deliberately deterministic. Weather analysis, advice, visual themes, and the speech script are generated from explicit rules and templates. This makes the service inexpensive, predictable, testable, and easy to maintain.

---

# 2. Product Vision

SkyAudio-Alert should behave like a friendly local morning weather announcer rather than a generic weather API.

The service should answer practical questions such as:

- ตอนนี้อากาศเป็นอย่างไร?
- วันนี้ร้อนแค่ไหน?
- ฝนจะมาตอนไหน?
- ช่วงไหนควรระวังฝน?
- ถ้าจะออกไปทำงานหรือเดินทาง ควรเตรียมอะไร?
- ผู้สูงอายุที่อ่านข้อความไม่ได้สามารถฟังประกาศได้หรือไม่?

The product is successful when a resident can open the LINE group in the morning and understand the day's weather within a few seconds, either by reading the Flex Message or by pressing play on the audio message.

---

# 3. Target Community

## 3.1 Primary audience

Residents of:

- บ้านลำพาย
- ต.โคกชะงาย
- อ.เมือง
- จ.พัทลุง

## 3.2 Accessibility audience

Older residents and people who have difficulty reading small text.

Audio is therefore not an optional enhancement. It is a core product requirement.

## 3.3 Secondary audience

Other residents who want a quick morning briefing before:

- going to work
- farming/gardening
- traveling
- sending children to school
- doing outdoor activities
- preparing for rain

---

# 4. Location Configuration

V1 is intentionally limited to one primary location.

| Field | Value |
|---|---|
| Location | บ้านลำพาย |
| Subdistrict | ต.โคกชะงาย |
| District | อ.เมือง |
| Province | พัทลุง |
| Latitude | 7.619729 |
| Longitude | 100.005932 |
| Timezone | Asia/Bangkok |

The location must be configuration-driven rather than hard-coded throughout the application.

Future versions may support multiple locations and multiple LINE groups.

---

# 5. Product Goals

## G1 — Reliable morning announcement

Deliver the daily forecast around 06:00 Asia/Bangkok without requiring a human to operate the system.

## G2 — Useful information

Do not merely repeat raw weather-provider values. Convert them into understandable information and practical advice.

## G3 — Accessibility

Provide a spoken Thai announcement directly through LINE.

## G4 — Readability

Use a large, high-contrast Flex design suitable for mobile screens.

## G5 — Low operating cost

Target V1 operating cost: **0 THB/month** where practical.

## G6 — Maintainability

A single person should be able to understand, test, modify, and recover the system.

## G7 — Provider independence

Weather, TTS, and storage providers should be replaceable through adapters.

## G8 — Security

No credentials or private configuration values may be committed to Git.

---

# 6. Non-Goals for V1

The following are intentionally excluded from the first production version:

- Full weather website.
- Mobile application.
- User accounts.
- Individual personalization.
- Chatbot conversation.
- Automatic collection of LINE member profiles.
- Complex database.
- AI Agent orchestration.
- Continuous minute-by-minute weather monitoring.
- Commercial weather subscription.
- Advanced machine-learning prediction.
- Multiple villages as a required V1 feature.

These may be considered later only when the core daily service is stable.

---

# 7. User Experience

## 7.1 Morning sequence

At approximately 06:00:

```text
LINE group
    ↓
Flex Message
    ↓
Audio Message
```

The two messages should be sent as close together as possible.

## 7.2 Flex Message

The Flex Message is the visual dashboard.

It should contain:

### Header
- บ้านลำพาย
- ต.โคกชะงาย • พัทลุง
- date/update information

### Main temperature
- current temperature
- large typography
- weather condition
- feels-like temperature

### Quick indicators
- humidity
- wind
- rain now / recent rain

### Hourly forecast
Display selected important hours rather than every hour.

Suggested V1 slots:

- 06:00
- 09:00
- 12:00
- 15:00
- 18:00
- 21:00

Each slot may show:
- weather icon
- temperature
- rain probability

### Daily summary
- minimum temperature
- maximum temperature
- expected rainfall/rain probability

### Practical advice
A short community-oriented recommendation.

Examples:

- "ช่วงเย็นมีโอกาสฝนสูง ควรเตรียมร่มก่อนออกจากบ้าน"
- "วันนี้อากาศร้อนช่วงเที่ยง ควรดื่มน้ำให้เพียงพอ"
- "ช่วงเช้าอากาศค่อนข้างเย็น ใครออกไปทำงานควรเตรียมเสื้อคลุมบาง ๆ"

### Footer
- source
- last update
- system identity: น้องจุ่นจ้าน

---

# 8. Dynamic Visual Theme

The Flex background must change according to weather conditions.

The design should not use one fixed background.

## 8.1 Theme inputs

The theme engine receives:

- weather code
- precipitation
- precipitation probability
- cloud cover
- temperature
- apparent temperature
- day/night
- wind
- severe weather signals if available

## 8.2 Theme classes

V1 should support at least:

1. Clear / sunny
2. Partly cloudy
3. Cloudy
4. Rain
5. Heavy rain
6. Storm / thunder
7. Hot
8. Cool / morning
9. Night

The exact colors are implementation details and can evolve.

## 8.3 Priority rules

When multiple conditions apply, severe precipitation/weather should take precedence over temperature-only themes.

Conceptual priority:

```text
storm
  >
heavy rain
  >
rain
  >
hot/cool modifier
  >
cloudy
  >
partly cloudy
  >
clear
```

Day/night can modify the final palette without replacing the weather condition.

---

# 9. Weather Data Requirements

The weather provider must supply, where available:

## Current

- temperature
- apparent temperature
- relative humidity
- precipitation
- weather condition/code
- wind speed
- wind direction
- wind gust
- cloud cover

## Hourly

- temperature
- apparent temperature
- precipitation
- precipitation probability
- weather code
- wind
- humidity
- cloud cover

## Daily

- minimum temperature
- maximum temperature
- precipitation sum
- precipitation probability
- sunrise
- sunset

## Optional

- visibility
- UV index
- pressure
- additional alert indicators

The application must tolerate optional fields being unavailable.

---

# 10. Weather Analysis

Raw weather data must pass through an analysis layer.

The analyzer should identify:

## 10.1 Temperature

- current temperature category
- morning temperature
- daytime maximum
- night temperature
- apparent heat/cool conditions

Example categories:

```text
very_cool
cool
comfortable
warm
hot
very_hot
```

Thresholds must be configurable.

## 10.2 Rain

Identify:

- rain now
- first significant rain period
- strongest rain period
- evening rain risk
- prolonged rain window
- dry window

Rain probability alone must not automatically be described as certain rain.

The language should distinguish:

```text
มีโอกาสฝน
มีโอกาสฝนค่อนข้างสูง
มีแนวโน้มฝนตก
กำลังมีฝน
ฝนตกหนัก
```

according to evidence.

## 10.3 Wind

Identify:

- normal wind
- strong wind
- gust concern

Only mention wind prominently when it is meaningful to residents.

## 10.4 Heat

A hot-weather warning should consider apparent temperature where available rather than temperature alone.

## 10.5 Daily advice

The analyzer generates advice signals. The advice engine converts them into Thai sentences.

Possible advice signals:

```text
TAKE_UMBRELLA
RAIN_LIKELY_EVENING
RAIN_LIKELY_MORNING
HOT_MIDDAY
HIGH_APPARENT_TEMP
STRONG_WIND
COOL_MORNING
OUTDOOR_ACTIVITY_CAUTION
```

---

# 11. Thai Forecast Text

The text generator must produce natural, friendly Thai.

It should avoid sounding like a machine-generated weather table.

## 11.1 Tone

- friendly
- concise
- respectful
- understandable
- community-oriented
- not alarmist

## 11.2 Example structure

```text
สวัสดีตอนเช้าครับพี่น้องบ้านลำพาย
น้องจุ่นจุ่นจ้านรายงานอากาศประจำวันนี้ครับ

ตอนนี้อุณหภูมิประมาณ 25 องศา
ท้องฟ้ามีเมฆเป็นส่วนมาก และรู้สึกประมาณ 28 องศา

วันนี้อุณหภูมิจะอยู่ประมาณ 25 ถึง 32 องศา
ช่วงเช้ายังมีโอกาสฝนเล็กน้อย
ช่วงบ่ายอากาศจะร้อนขึ้น
และช่วงเย็นมีโอกาสฝนค่อนข้างสูง

ใครมีธุระต้องออกจากบ้านช่วงเย็น
แนะนำให้เตรียมร่มติดตัวไว้ครับ

ขอให้ทุกคนเดินทางปลอดภัยและมีวันที่ดีครับ
```

The actual wording must be generated from current data, not copied verbatim.

---

# 12. Audio Requirements

## 12.1 Delivery

Audio must be delivered using the LINE Audio Message type.

Users should not need to open a web page to listen.

## 12.2 Format

V1 should generate an audio format accepted by LINE's Audio Message requirements.

The implementation must validate:
- HTTPS accessibility of asset URL
- file availability
- duration
- content type/encoding

## 12.3 Length

Target:
- approximately 30–90 seconds

Avoid unnecessarily long announcements.

## 12.4 Voice

The voice should sound:
- natural
- friendly
- clear
- suitable for older listeners

Voice provider is an implementation choice and must remain replaceable.

---

# 13. LINE Delivery

## 13.1 Destination

V1 sends to one configured LINE group.

The group ID must be a secret/configuration value and never be embedded in source code.

## 13.2 Message order

Required:

```text
1. Flex
2. Audio
```

## 13.3 Failure behavior

If weather retrieval fails:
- do not send fabricated weather.

If TTS fails:
- the system should record the failure.
- V1 may choose either:
  - send Flex only, or
  - fail the complete run.

The final policy should be selected during implementation testing.

If LINE fails:
- record the API response/status without exposing credentials.
- retry only when the error is classified as transient.

---

# 14. Automation

## 14.1 Scheduled run

Target:

```text
06:00
Asia/Bangkok
Every day
```

The schedule must be configuration-controlled and documented.

## 14.2 Manual run

A manual workflow must exist for testing.

Example:

```text
GitHub Actions
→ Run workflow
→ test mode
→ generate forecast
→ send to test LINE group
```

## 14.3 Test mode

Test mode must allow:
- separate LINE credentials
- separate destination group
- optional dry-run
- verbose logging

---

# 15. Test and Production Separation

The system must support at least:

```text
TEST
PRODUCTION
```

Test mode must not accidentally send to the production group.

Recommended secret names:

```text
LINE_CHANNEL_ACCESS_TOKEN_TEST
LINE_GROUP_ID_TEST

LINE_CHANNEL_ACCESS_TOKEN_PROD
LINE_GROUP_ID_PROD
```

Actual values must never be stored in the repository.

Any credential previously pasted into a chat should be treated as exposed and replaced before production use.

---

# 16. Cost Requirements

V1 target:

**0 THB/month**

The architecture should avoid:
- always-on servers
- paid AI agents
- paid databases
- unnecessary paid APIs

Possible costs may arise if a selected TTS provider or storage provider exceeds its free allowance. The implementation must document such limits rather than silently assuming unlimited free use.

---

# 17. Reliability Requirements

## R1
A transient weather API failure should be retried.

## R2
A transient LINE failure should be retried where safe.

## R3
A TTS failure must be clearly identified.

## R4
The system must never publish fabricated weather data.

## R5
Each run should have a unique run identifier.

## R6
Logs must identify the failed stage.

Example stages:

```text
weather.fetch
weather.normalize
weather.analyze
forecast.render
audio.synthesize
audio.validate
line.send
```

---

# 18. Security Requirements

Never commit:

- LINE access token
- API keys
- TTS credentials
- private storage credentials
- signed private URLs

Do not print Authorization headers.

Do not print secret values in error messages.

Use GitHub Actions Secrets or equivalent secret storage.

`.gitignore` must exclude local `.env` files.

---

# 19. Observability

Every run should produce structured information similar to:

```json
{
  "runId": "2026-09-22-lampai-v1",
  "location": "บ้านลำพาย",
  "stage": "line.send",
  "status": "success",
  "timestamp": "..."
}
```

The system should record:
- start time
- completion time
- weather provider status
- generated forecast status
- audio status
- LINE delivery status
- retry count
- failure stage

Do not log secrets.

---

# 20. Configuration

Non-secret configuration:

```text
WEATHER_LAT=7.619729
WEATHER_LON=100.005932
WEATHER_TIMEZONE=Asia/Bangkok

LOCATION_NAME=บ้านลำพาย
DISTRICT_NAME=ต.โคกชะงาย
PROVINCE_NAME=พัทลุง

SCHEDULE_TIME=06:00
```

Secrets:

```text
LINE_CHANNEL_ACCESS_TOKEN_TEST
LINE_GROUP_ID_TEST

LINE_CHANNEL_ACCESS_TOKEN_PROD
LINE_GROUP_ID_PROD
```

TTS secrets are provider-specific.

---

# 21. Proposed Repository Structure

```text
SkyAudio-Alert/
│
├── .github/
│   └── workflows/
│       ├── weather-test.yml
│       └── weather-daily.yml
│
├── src/
│   ├── config/
│   │   └── index.js
│   │
│   ├── weather/
│   │   ├── openMeteo.js
│   │   ├── normalize.js
│   │   ├── analyzer.js
│   │   └── weatherCodes.js
│   │
│   ├── forecast/
│   │   ├── advice.js
│   │   ├── thaiScript.js
│   │   └── formatter.js
│   │
│   ├── flex/
│   │   ├── builder.js
│   │   ├── themes.js
│   │   └── components.js
│   │
│   ├── audio/
│   │   ├── tts.js
│   │   ├── validate.js
│   │   └── storage.js
│   │
│   ├── line/
│   │   └── messagingApi.js
│   │
│   ├── core/
│   │   ├── pipeline.js
│   │   ├── retry.js
│   │   └── logger.js
│   │
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

This is a proposed structure; implementation may simplify it where a file would otherwise contain only trivial code.

---

# 22. Phase Plan

## Phase 1 — Foundation
- PRD
- architecture
- API contract
- database strategy
- decisions
- context
- changelog
- repository structure

## Phase 2 — Weather Engine
- Open-Meteo client
- normalized model
- weather-code mapping
- hourly selection
- rain-window analysis
- temperature/heat analysis
- advice signals

## Phase 3 — Flex Engine
- visual component system
- theme engine
- responsive/readable layout
- hourly cards
- advice section
- footer

## Phase 4 — Audio
- Thai script generator
- TTS adapter
- MP3/M4A validation
- public asset delivery

## Phase 5 — LINE
- Messaging API adapter
- Flex + Audio send
- error handling
- test destination

## Phase 6 — Automation
- manual GitHub Actions workflow
- 06:00 Asia/Bangkok schedule
- retry
- logging

## Phase 7 — Stability
- repeated test runs
- rain scenarios
- sunny scenarios
- hot scenarios
- TTS failures
- LINE failures
- weather API failures
- duplicate-run checks

## Phase 8 — Production
- replace test credentials
- final acceptance
- production schedule
- monitoring

---

# 23. Acceptance Test Matrix

| ID | Test | Expected result |
|---|---|---|
| AT-01 | Fetch weather | Valid normalized weather |
| AT-02 | Missing optional field | Pipeline continues safely |
| AT-03 | Rain forecast | Rain advice appears |
| AT-04 | Hot forecast | Heat advice appears |
| AT-05 | Clear weather | Clear/sunny theme |
| AT-06 | Rain weather | Rain theme |
| AT-07 | Heavy rain | Stronger rain theme/advice |
| AT-08 | Generate Flex | Valid LINE Flex JSON |
| AT-09 | Generate audio | Valid audio asset |
| AT-10 | Send LINE | Flex + Audio delivered |
| AT-11 | Audio playback | Plays inside LINE |
| AT-12 | Weather API timeout | Retry + clear error |
| AT-13 | TTS failure | Clear failure state |
| AT-14 | LINE transient error | Retry where safe |
| AT-15 | Secret scan | No credentials committed |
| AT-16 | Manual workflow | Runs successfully |
| AT-17 | Scheduled workflow | Configured for 06:00 Bangkok |
| AT-18 | Test/prod separation | Test cannot silently target production |

---

# 24. Definition of Done — V1

V1 is considered complete only when all of the following are true:

- [ ] Weather retrieval works.
- [ ] Weather normalization works.
- [ ] Forecast analysis works.
- [ ] Practical Thai advice works.
- [ ] Dynamic themes work.
- [ ] Flex JSON is valid.
- [ ] Thai speech is generated.
- [ ] Audio meets LINE requirements.
- [ ] LINE receives Flex and Audio.
- [ ] Audio plays directly in LINE.
- [ ] Manual test workflow works.
- [ ] Daily 06:00 workflow exists.
- [ ] Retry handling exists.
- [ ] Failure logs are understandable.
- [ ] Test and production secrets are separated.
- [ ] No secrets are committed.
- [ ] Documentation matches implementation.
- [ ] Changelog is updated.

---

# 25. Future Enhancements

Potential later features:

- Multiple village locations.
- Multiple LINE groups.
- Severe weather alerts.
- Rain-nowcasting notices.
- Agricultural advice.
- School/commute-specific advice.
- Configurable voice.
- Multiple voices.
- Web dashboard.
- Forecast history.
- Automatic health check.
- Notification when the 06:00 job fails.
- Optional LLM rewriting layer with deterministic fallback.
- Village announcement board fed by a companion PWA (+ possibly a database). UI slot is already reserved in the Flex header — see DECISIONS.md Decision 009.

None of these is required for V1.

---

# 26. Product Principle

The system should always prefer:

**useful → understandable → reliable → simple**

over:

**complex → clever → expensive**

SkyAudio-Alert is a community utility. Its value comes from delivering the right information at the right time in a form that local residents can actually use.
