// src/forecast/formatter.js
// Turns analysis into the plain-data shape the Flex builder consumes:
// picks meaningful hourly slots instead of showing all 24 hours (PRD 7.2).

const { describeWeatherCode } = require('../weather/weatherCodes');
const { buildAdvice } = require('./advice');
const { buildThaiScript } = require('./thaiScript');

const SLOT_HOURS = [6, 9, 12, 15, 18, 21];

function iconForCode(code) {
  const { key } = describeWeatherCode(code);
  const ICONS = {
    clear: '☀️',
    mostly_clear: '🌤️',
    partly_cloudy: '⛅',
    cloudy: '☁️',
    fog: '🌫️',
    drizzle: '🌦️',
    rain: '🌧️',
    heavy_rain: '⛈️',
    storm: '⛈️',
  };
  return ICONS[key] || '🌡️';
}

function pickSlots(hourlyToday) {
  return SLOT_HOURS.map((hour) => {
    const match = hourlyToday.find((h) => Number(h.time.slice(11, 13)) === hour);
    if (!match) return null;
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      icon: iconForCode(match.weatherCode),
      temperature: match.temperature !== null ? Math.round(match.temperature) : null,
      precipitationProbability: match.precipitationProbability ?? 0,
    };
  }).filter(Boolean);
}

function buildForecastData(analysis, location) {
  const adviceSentences = buildAdvice(analysis.adviceSignals);
  const thaiScript = buildThaiScript(analysis, adviceSentences, location);

  return {
    location,
    current: {
      temperature: analysis.current.temperature !== null ? Math.round(analysis.current.temperature) : null,
      apparentTemperature:
        analysis.current.apparentTemperature !== null ? Math.round(analysis.current.apparentTemperature) : null,
      humidity: analysis.current.humidity,
      windSpeed: analysis.current.windSpeed,
      precipitation: analysis.current.precipitation,
      conditionLabel: analysis.current.description.label,
      icon: iconForCode(analysis.current.weatherCode),
      isDay: analysis.isDay,
    },
    daily: {
      tempMin: analysis.daily.tempMin !== null ? Math.round(analysis.daily.tempMin) : null,
      tempMax: analysis.daily.tempMax !== null ? Math.round(analysis.daily.tempMax) : null,
      precipitationProbabilityMax: analysis.daily.precipitationProbabilityMax,
    },
    hourlySlots: pickSlots(analysis.hourlyToday),
    adviceSentences,
    theme: analysis.theme,
    thaiScript,
  };
}

module.exports = { buildForecastData, pickSlots, iconForCode };
