// src/flex/builder.js
// Compact mobile-first Flex. Detailed market/news content intentionally lives in audio.

const { resolveThemeColors } = require('./themes');
const { headerBlock, heroTempBlock, quickIndicatorsBox, hourlySection, rainProbabilityBox, footerBlock, marketMiniRow } = require('./components');

function buildFlex(forecastData) {
  const colors = resolveThemeColors(forecastData.theme, forecastData.current.isDay);
  const market = marketMiniRow(forecastData.marketBrief || []);
  const bodyContents = [
    headerBlock(forecastData.location),
    heroTempBlock(forecastData.current, forecastData.announcement),
    quickIndicatorsBox(forecastData.current, colors.accent),
    { type: 'text', text: 'พยากรณ์รายชั่วโมง', weight: 'bold', size: 'sm', color: '#FFFFFF', margin: 'md' },
    hourlySection(forecastData.hourlySlots, colors.accent),
    rainProbabilityBox(forecastData.daily, colors.accent),
  ];
  if (market) bodyContents.push(market);
  bodyContents.push(footerBlock());

  const bubble = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box', layout: 'vertical', paddingAll: 'lg',
      backgroundColor: colors.background,
      contents: bodyContents,
    },
  };
  const altText = `อากาศ ${forecastData.location.name} ${forecastData.current.temperature ?? '--'}° ${forecastData.current.conditionLabel}`;
  return { type: 'flex', altText: altText.slice(0, 400), contents: bubble };
}

module.exports = { buildFlex };
