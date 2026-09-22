// src/flex/builder.js
// Assembles the complete LINE Flex bubble from forecast data + theme.

const { resolveThemeColors } = require('./themes');
const { headerBlock, heroTempBlock, quickIndicatorsBox, hourlySection, rainProbabilityBox, footerBlock } = require('./components');

function buildFlex(forecastData) {
  const colors = resolveThemeColors(forecastData.theme, forecastData.current.isDay);
  const hero = { type: 'box', layout: 'vertical', paddingAll: 'xl', backgroundColor: colors.from, contents: [headerBlock(forecastData.location), heroTempBlock(forecastData.current)] };
  const bodyContents = [
    quickIndicatorsBox(forecastData.current, colors.to),
    { type: 'text', text: 'พยากรณ์วันนี้', weight: 'bold', size: 'md', color: '#263238', margin: 'lg' },
    hourlySection(forecastData.hourlySlots, colors.to),
    rainProbabilityBox(forecastData.daily, colors.to),
  ];
  bodyContents.push(footerBlock());
  const bubble = { type: 'bubble', size: 'giga', header: hero, body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: bodyContents } };
  const altText = `พยากรณ์อากาศ ${forecastData.location.name} ${forecastData.current.temperature ?? '--'}° ${forecastData.current.conditionLabel}`;
  return { type: 'flex', altText: altText.slice(0, 400), contents: bubble };
}

module.exports = { buildFlex };
