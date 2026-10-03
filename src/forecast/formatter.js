// src/forecast/formatter.js
// Builds the data contract consumed by the flood-first Flex renderer.
// Narrative text comes from Gemini content generation, not a fixed script.

const { describeWeatherCode } = require('../weather/weatherCodes');
const { buildAdvice } = require('./advice');
const { buildThaiDateInfo } = require('./thaiDate');

const SLOT_HOURS = [6, 8, 10, 12, 14, 16, 18, 20];
function iconForCode(code) {
  const { key } = describeWeatherCode(code);
  const ICONS = { clear: '☀️', mostly_clear: '🌤️', partly_cloudy: '⛅', cloudy: '☁️', fog: '🌫️', drizzle: '🌦️', rain: '🌧️', heavy_rain: '⛈️', storm: '⛈️' };
  return ICONS[key] || '🌡️';
}
function pickSlots(hourlyToday = []) {
  return SLOT_HOURS.map((hour) => {
    const match = hourlyToday.find((h) => Number(h.time.slice(11, 13)) === hour);
    if (!match) return null;
    return { hour, label: `${String(hour).padStart(2, '0')}:00`, icon: iconForCode(match.weatherCode), temperature: match.temperature !== null ? Math.round(match.temperature) : null, precipitationProbability: match.precipitationProbability ?? 0 };
  }).filter(Boolean);
}
function buildForecastData(analysis, floodSituation = null, location = {}, reportDraft = null) {
  // The fallback argument order keeps old unit fixtures loadable while all runtime callers use floodSituation.
  if (floodSituation && !floodSituation.severity && floodSituation.name) {
    location = floodSituation;
    floodSituation = null;
  }
  const adviceSentences = buildAdvice(analysis.adviceSignals);
  const dateInfo = buildThaiDateInfo(analysis.current.time);
  return {
    location,
    dateInfo,
    flood: floodSituation || { severity: 'unknown', summary: 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้', trend: 'unknown', freshness: { state: 'unknown' }, stations: [], actions: [] },
    current: {
      temperature: analysis.current.temperature !== null ? Math.round(analysis.current.temperature) : null,
      apparentTemperature: analysis.current.apparentTemperature !== null ? Math.round(analysis.current.apparentTemperature) : null,
      humidity: analysis.current.humidity,
      windSpeed: analysis.current.windSpeed,
      precipitation: analysis.current.precipitation,
      conditionLabel: analysis.current.description.label,
      icon: iconForCode(analysis.current.weatherCode),
      isDay: analysis.isDay,
    },
    daily: { tempMin: analysis.daily.tempMin !== null ? Math.round(analysis.daily.tempMin) : null, tempMax: analysis.daily.tempMax !== null ? Math.round(analysis.daily.tempMax) : null, precipitationProbabilityMax: analysis.daily.precipitationProbabilityMax },
    hourlySlots: pickSlots(analysis.hourlyToday),
    adviceSentences,
    theme: analysis.theme,
    report: reportDraft,
    spokenText: reportDraft?.spokenText || '',
  };
}
module.exports = { buildForecastData, pickSlots, iconForCode };
