// src/flex/themes.js
// Visual theme palette per weather class (PRD section 8). Colors are an
// implementation detail and can evolve without touching analysis logic.

const THEMES = {
  clear: { from: '#4FC3F7', to: '#0288D1' },
  partly_cloudy: { from: '#90A4C0', to: '#546E8A' },
  cloudy: { from: '#78909C', to: '#37474F' },
  rain: { from: '#4A6572', to: '#1C2B36' },
  heavy_rain: { from: '#37474F', to: '#0D1B24' },
  storm: { from: '#2C3E50', to: '#0B0F1A' },
  hot: { from: '#FF8A65', to: '#D84315' },
  cool: { from: '#81D4FA', to: '#0277BD' },
};

const NIGHT_OVERLAY = { from: '#1A237E', to: '#050818' };

/**
 * Resolve final theme colors, applying a night modifier without replacing
 * the underlying weather-driven theme class (PRD 8.3).
 */
function resolveThemeColors(themeKey, isDay) {
  const base = THEMES[themeKey] || THEMES.clear;
  if (isDay) return base;
  // Night: blend toward a deep navy while keeping some hue distinction for storm/rain.
  if (themeKey === 'storm' || themeKey === 'heavy_rain') return { from: '#10131C', to: '#000000' };
  return NIGHT_OVERLAY;
}

module.exports = { THEMES, resolveThemeColors };
