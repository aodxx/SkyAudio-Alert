# SkyAudio-Alert — API and Integration Contract

## 1. External APIs

### Open-Meteo

Purpose:
- Current weather.
- Hourly forecast.
- Daily forecast.
- Weather variables required by the analyzer.

Initial coordinates:
- latitude: 7.619729
- longitude: 100.005932
- timezone: Asia/Bangkok

The application should request only the variables it actually uses.

### LINE Messaging API

Purpose:
- Push Flex Message.
- Push Audio Message.

Target:
- Configured LINE group ID.

The LINE Channel Access Token must be supplied through a secret.

Conceptual request:

```json
{
  "to": "<LINE_GROUP_ID>",
  "messages": [
    {
      "type": "flex",
      "altText": "พยากรณ์อากาศบ้านลำพาย",
      "contents": {}
    },
    {
      "type": "audio",
      "originalContentUrl": "https://...",
      "duration": 30000
    }
  ]
}
```

The application must never write the actual token into this document.

## 2. Internal application contract

### getWeather()

Input:
- latitude
- longitude
- timezone
- forecast options

Output:
- normalized WeatherData.

### analyzeWeather(weatherData)

Output:

```
{
  current,
  daily,
  hourly,
  rainWindows,
  alerts,
  adviceSignals,
  theme
}
```

### buildThaiForecast(analysis)

Output:
- Flex-ready structured data.
- Thai audio script.

### buildFlex(data)

Output:
- LINE Flex JSON.

### synthesizeSpeech(script)

Output:
- MP3 buffer.

The pipeline then validates the real MP3 duration, stores the file, creates a public HTTPS URL, and builds the LINE Audio payload.

### sendLine(messages)

Input:
- LINE destination.
- array of LINE message objects.

Output:
- success/failure metadata.

## 3. Environment contract

Required at runtime (names are split by test/production mode):

```
LINE_CHANNEL_ACCESS_TOKEN_TEST
LINE_GROUP_ID_TEST

LINE_CHANNEL_ACCESS_TOKEN_PROD
LINE_GROUP_ID_PROD

WEATHER_LAT
WEATHER_LON
WEATHER_TIMEZONE
LOCATION_NAME
```

In `DRY_RUN=true`, LINE credentials are optional because the LINE API is not called.

TTS-specific secrets are provider-dependent.

## 4. Error contract

Errors should have:
- stage,
- code,
- human-readable message,
- retryable boolean.

Example:

```
{
  "stage": "weather",
  "code": "WEATHER_TIMEOUT",
  "message": "Weather provider timed out",
  "retryable": true
}
```

## 5. Versioning

Internal contracts should use semantic versioning where breaking changes are introduced.

External API responses must be parsed defensively because providers may add fields or change optional data availability.
