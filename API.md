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
- audio file/asset URL.
- duration in milliseconds.

### sendLine(messages)

Input:
- LINE destination.
- array of LINE message objects.

Output:
- success/failure metadata.

## 3. Environment contract

Required:

```
LINE_CHANNEL_ACCESS_TOKEN
LINE_GROUP_ID
WEATHER_LAT
WEATHER_LON
WEATHER_TIMEZONE
LOCATION_NAME
```

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
