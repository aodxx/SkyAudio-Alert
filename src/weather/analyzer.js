// src/weather/analyzer.js
// Deterministic weather analysis: temperature categories, rain windows,
// wind, heat, and advice signals. Thresholds are configurable (src/config).

const { describeWeatherCode } = require('./weatherCodes');

function tempCategory(apparent, thresholds) {
  if (apparent === null || apparent === undefined) return 'comfortable';
  if (apparent >= thresholds.hotApparent + 3) return 'very_hot';
  if (apparent >= thresholds.hotApparent) return 'hot';
  if (apparent <= thresholds.coolMorning - 3) return 'very_cool';
  if (apparent <= thresholds.coolMorning) return 'cool';
  return 'comfortable';
}

// Groups today's remaining hourly forecast into three community-friendly
// periods and reports the peak rain probability seen in each.
function buildRainWindows(hourlyToday, nowIso, thresholds) {
  const periods = {
    morning: { label: 'ช่วงเช้า', hours: [6, 11], maxProb: 0, maxMm: 0 },
    afternoon: { label: 'ช่วงบ่าย', hours: [12, 17], maxProb: 0, maxMm: 0 },
    evening: { label: 'ช่วงเย็น/ค่ำ', hours: [18, 23], maxProb: 0, maxMm: 0 },
  };

  for (const h of hourlyToday) {
    const hour = Number(h.time.slice(11, 13));
    for (const key of Object.keys(periods)) {
      const [start, end] = periods[key].hours;
      if (hour >= start && hour <= end) {
        periods[key].maxProb = Math.max(periods[key].maxProb, h.precipitationProbability || 0);
        periods[key].maxMm = Math.max(periods[key].maxMm, h.precipitation || 0);
      }
    }
  }

  const notable = Object.entries(periods)
    .filter(([, v]) => v.maxProb >= thresholds.rainProbNotable)
    .map(([key, v]) => ({ key, ...v }));

  return { periods, notable };
}

function analyzeWeather(weatherData, thresholds) {
  const { current, hourlyToday, daily } = weatherData;
  const today = daily[0] || {};

  const currentCategory = tempCategory(current.apparentTemperature, thresholds);
  const dayMaxCategory = tempCategory(today.tempMax, thresholds);
  const morningHour = hourlyToday.find((h) => h.time.endsWith('T06:00')) || hourlyToday[0];
  const morningCategory = tempCategory(
    morningHour ? morningHour.apparentTemperature : current.apparentTemperature,
    thresholds
  );

  const rain = buildRainWindows(hourlyToday, current.time, thresholds);
  const rainingNow = (current.precipitation || 0) > 0;

  const strongWind = (current.windSpeed || 0) >= thresholds.strongWindKmh;

  const currentDesc = describeWeatherCode(current.weatherCode);
  const maxSeverityToday = hourlyToday.reduce(
    (max, h) => Math.max(max, describeWeatherCode(h.weatherCode).severity),
    currentDesc.severity
  );

  // --- Advice signals -------------------------------------------------
  const adviceSignals = [];

  if (rainingNow) adviceSignals.push('RAIN_LIKELY_NOW');
  const eveningWindow = rain.notable.find((w) => w.key === 'evening');
  const morningWindow = rain.notable.find((w) => w.key === 'morning');
  const afternoonWindow = rain.notable.find((w) => w.key === 'afternoon');

  if (eveningWindow && eveningWindow.maxProb >= thresholds.rainProbHigh) {
    adviceSignals.push('RAIN_LIKELY_EVENING');
  } else if (eveningWindow) {
    adviceSignals.push('RAIN_POSSIBLE_EVENING');
  }
  if (morningWindow) adviceSignals.push('RAIN_LIKELY_MORNING');
  if (afternoonWindow) adviceSignals.push('RAIN_LIKELY_AFTERNOON');

  if (dayMaxCategory === 'hot' || dayMaxCategory === 'very_hot') {
    adviceSignals.push('HOT_MIDDAY');
  }
  if (current.apparentTemperature !== null && current.apparentTemperature >= thresholds.hotApparent) {
    adviceSignals.push('HIGH_APPARENT_TEMP');
  }
  if (strongWind) adviceSignals.push('STRONG_WIND');
  if (morningCategory === 'cool' || morningCategory === 'very_cool') {
    adviceSignals.push('COOL_MORNING');
  }
  if (maxSeverityToday >= 4) adviceSignals.push('OUTDOOR_ACTIVITY_CAUTION');

  // --- Theme priority: storm > heavy_rain > rain > hot/cool > cloudy >
  //     partly_cloudy > clear. Day/night is applied as a modifier, not a
  //     replacement, downstream in src/flex/themes.js.
  let theme = 'clear';
  if (maxSeverityToday === 5 || currentDesc.key === 'storm') theme = 'storm';
  else if (currentDesc.key === 'heavy_rain' || rain.notable.some((w) => w.maxMm >= thresholds.heavyRainMm)) theme = 'heavy_rain';
  else if (rainingNow || currentDesc.key === 'rain' || currentDesc.key === 'drizzle' || rain.notable.length > 0) theme = 'rain';
  else if (currentCategory === 'hot' || currentCategory === 'very_hot') theme = 'hot';
  else if (currentCategory === 'cool' || currentCategory === 'very_cool') theme = 'cool';
  else if (currentDesc.key === 'cloudy' || currentDesc.key === 'fog') theme = 'cloudy';
  else if (currentDesc.key === 'partly_cloudy') theme = 'partly_cloudy';
  else theme = 'clear';

  return {
    current: { ...current, category: currentCategory, description: currentDesc },
    daily: today,
    hourlyToday,
    rainWindows: rain,
    adviceSignals: [...new Set(adviceSignals)],
    theme,
    isDay: current.isDay,
  };
}

module.exports = { analyzeWeather, tempCategory, buildRainWindows };
