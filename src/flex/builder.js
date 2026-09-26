// src/flex/builder.js
// Phase 3: visual polish for the compact mobile-first weather cover.
// Flex is intentionally glanceable; full market/news detail remains in audio.

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
    { type: 'separator', margin: 'md', color: '#243246' },
    { type: 'text', text: 'วันนี้', weight: 'bold', size: 'sm', color: '#F3F6FA', margin: 'md' },
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
      paddingAll: 'md',
      backgroundColor: colors.background,
      contents: bodyContents,
    },
  };

  const altText = `อากาศ ${forecastData.location.name} ${forecastData.current.temperature ?? '--'}° ${forecastData.current.conditionLabel}`;
  return { type: 'flex', altText: altText.slice(0, 400), contents: bubble };
}

module.exports = { buildFlex };
