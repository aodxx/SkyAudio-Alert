// src/flex/themes.js
// Compact weather-card palette. Dark navy stays consistent; accent changes with weather.

const THEMES = {
  clear: { background: '#0D1726', accent: '#4FC3F7' },
  partly_cloudy: { background: '#0D1726', accent: '#90CAF9' },
  cloudy: { background: '#0D1726', accent: '#B0BEC5' },
  rain: { background: '#0D1726', accent: '#64B5F6' },
  heavy_rain: { background: '#09121F', accent: '#4DD0E1' },
  storm: { background: '#080D16', accent: '#BA68C8' },
  hot: { background: '#1B1210', accent: '#FFAB91' },
  cool: { background: '#0D1726', accent: '#81D4FA' },
};

const NIGHT_ACCENTS = {
  clear: '#90CAF9', partly_cloudy: '#81D4FA', cloudy: '#90A4AE',
  rain: '#64B5F6', heavy_rain: '#4DD0E1', storm: '#CE93D8', hot: '#FFAB91', cool: '#81D4FA',
};

function resolveThemeColors(themeKey, isDay) {
  const base = THEMES[themeKey] || THEMES.clear;
  return { background: isDay ? base.background : '#070C15', accent: isDay ? base.accent : (NIGHT_ACCENTS[themeKey] || '#90CAF9') };
}

module.exports = { THEMES, resolveThemeColors };
