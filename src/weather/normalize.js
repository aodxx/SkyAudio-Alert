// src/weather/normalize.js
// Converts the raw Open-Meteo response into a normalized, stable shape that
// the rest of the app depends on. Tolerates missing optional fields (AT-02).

function pick(arr, i, fallback = null) {
  return Array.isArray(arr) && arr[i] !== undefined ? arr[i] : fallback;
}

function normalizeWeather(raw, nowIso = new Date().toISOString()) {
  if (!raw || !raw.current || !raw.hourly || !raw.daily) {
    const err = new Error('Open-Meteo response is missing current/hourly/daily blocks');
    err.stage = 'weather.normalize';
    err.retryable = false;
    throw err;
  }

  const current = {
    time: raw.current.time,
    temperature: raw.current.temperature_2m ?? null,
    apparentTemperature: raw.current.apparent_temperature ?? null,
    humidity: raw.current.relative_humidity_2m ?? null,
    precipitation: raw.current.precipitation ?? 0,
    weatherCode: raw.current.weather_code ?? 0,
    windSpeed: raw.current.wind_speed_10m ?? null,
    windGusts: raw.current.wind_gusts_10m ?? null,
    cloudCover: raw.current.cloud_cover ?? null,
    isDay: raw.current.is_day === 1,
  };

  const times = raw.hourly.time || [];
  const hourly = times.map((t, i) => ({
    time: t,
    temperature: pick(raw.hourly.temperature_2m, i),
    apparentTemperature: pick(raw.hourly.apparent_temperature, i),
    precipitation: pick(raw.hourly.precipitation, i, 0),
    precipitationProbability: pick(raw.hourly.precipitation_probability, i, 0),
    weatherCode: pick(raw.hourly.weather_code, i, 0),
    windSpeed: pick(raw.hourly.wind_speed_10m, i),
    humidity: pick(raw.hourly.relative_humidity_2m, i),
    cloudCover: pick(raw.hourly.cloud_cover, i),
  }));

  const d = raw.daily;
  const daily = (d.time || []).map((t, i) => ({
    date: t,
    tempMax: pick(d.temperature_2m_max, i),
    tempMin: pick(d.temperature_2m_min, i),
    precipitationSum: pick(d.precipitation_sum, i, 0),
    precipitationProbabilityMax: pick(d.precipitation_probability_max, i, 0),
    sunrise: pick(d.sunrise, i),
    sunset: pick(d.sunset, i),
  }));

  // Hourly entries for "today" only, used for slot selection and rain-window analysis.
  const today = daily[0] ? daily[0].date : nowIso.slice(0, 10);
  const hourlyToday = hourly.filter((h) => h.time.startsWith(today));

  return {
    fetchedAt: nowIso,
    current,
    hourly,
    hourlyToday,
    daily,
  };
}

module.exports = { normalizeWeather };
