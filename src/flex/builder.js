// src/flex/builder.js
// Phase 2: compact mobile-first weather cover.
// Detailed market prices and local news are intentionally audio-only.

const { resolveThemeColors } = require('./themes');
const { headerBlock, heroTempBlock, quickIndicatorsBox, hourlySection, rainProbabilityBox, footerBlock } = require('./components');

function buildFlex(forecastData) {
  const colors = resolveThemeColors(forecastData.theme, forecastData.current.isDay);
  const range = forecastData.daily
    ? `${forecastData.daily.tempMin ?? '--'}° / ${forecastData.daily.tempMax ?? '--'}°`
    : '';
  const current = { ...forecastData.current, todayRange: range };

  const bodyContents = [
    headerBlock(forecastData.location),
    heroTempBlock(current),
    quickIndicatorsBox(current, colors.accent),
    { type: 'text', text: 'พยากรณ์รายชั่วโมง', weight: 'bold', size: 'sm', color: '#FFFFFF', margin: 'md' },
    hourlySection(forecastData.hourlySlots || [], colors.accent),
    rainProbabilityBox(forecastData.daily || {}, colors.accent),
    footerBlock(),
  ];

  const bubble = {
    type: 'bubble',
    size: 'mega',
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'lg',
      backgroundColor: colors.background,
      contents: bodyContents,
    },
  };

  const altText = `อากาศ ${forecastData.location.name} ${forecastData.current.temperature ?? '--'}° ${forecastData.current.conditionLabel}`;
  return { type: 'flex', altText: altText.slice(0, 400), contents: bubble };
}

module.exports = { buildFlex };
