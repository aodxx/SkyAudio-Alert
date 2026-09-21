// src/weather/openMeteo.js
// Adapter for the Open-Meteo forecast API. Free, no API key required.
// Only requests the variables the rest of the app actually uses (Non-Goal:
// do not over-fetch).

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

const CURRENT_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'cloud_cover',
  'is_day',
].join(',');

const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'precipitation_probability',
  'weather_code',
  'wind_speed_10m',
  'relative_humidity_2m',
  'cloud_cover',
].join(',');

const DAILY_VARS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'sunrise',
  'sunset',
].join(',');

/**
 * Fetch raw weather data from Open-Meteo.
 * @param {{lat:number, lon:number, timezone:string}} location
 * @param {{fetchImpl?: typeof fetch}} [opts]
 */
async function fetchOpenMeteo(location, opts = {}) {
  const doFetch = opts.fetchImpl || fetch;

  const url = new URL(BASE_URL);
  url.searchParams.set('latitude', String(location.lat));
  url.searchParams.set('longitude', String(location.lon));
  url.searchParams.set('timezone', location.timezone);
  url.searchParams.set('current', CURRENT_VARS);
  url.searchParams.set('hourly', HOURLY_VARS);
  url.searchParams.set('daily', DAILY_VARS);
  url.searchParams.set('forecast_days', '2');

  const res = await doFetch(url.toString());

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`Open-Meteo request failed: ${res.status}`);
    err.stage = 'weather.fetch';
    err.retryable = res.status >= 500 || res.status === 429;
    err.detail = body.slice(0, 300);
    throw err;
  }

  return res.json();
}

module.exports = { fetchOpenMeteo, BASE_URL };
