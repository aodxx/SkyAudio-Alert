// src/flex/builder.js
// Assembles the complete LINE Flex bubble from forecast data + theme.

const { resolveThemeColors } = require('./themes');
const {
  headerBlock,
  heroTempBlock,
  quickIndicatorsBox,
  hourlyRow,
  dailySummaryBox,
  adviceBox,
  footerBlock,
} = require('./components');

function buildFlex(forecastData) {
  const colors = resolveThemeColors(forecastData.theme, forecastData.current.isDay);

  const heroBox = {
    type: 'box',
    layout: 'vertical',
    paddingAll: 'lg',
    backgroundColor: colors.from,
    contents: [headerBlock(forecastData.location), heroTempBlock(forecastData.current)],
  };

  const bodyContents = [
    quickIndicatorsBox(forecastData.current),
    { type: 'text', text: 'พยากรณ์รายชั่วโมง', weight: 'bold', size: 'sm', color: '#212121', margin: 'lg' },
    hourlyRow(forecastData.hourlySlots),
    dailySummaryBox(forecastData.daily),
  ];

  const advice = adviceBox(forecastData.adviceSentences);
  if (advice) bodyContents.push(advice);
  bodyContents.push(footerBlock());

  const bubble = {
    type: 'bubble',
    size: 'giga',
    header: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '0px',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          paddingAll: 'lg',
          backgroundColor: colors.to,
          contents: [heroBox],
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'lg',
      contents: bodyContents,
    },
  };

  // Simpler, single-gradient header (LINE Flex has no native CSS gradient;
  // using the darker "to" color as the outer box background approximates it
  // cheaply with two nested solid boxes).
  bubble.header.contents[0].backgroundColor = colors.from;

  const altText = `พยากรณ์อากาศ${forecastData.location.name} ${forecastData.current.temperature ?? '--'}° ${forecastData.current.conditionLabel}`;

  return { type: 'flex', altText: altText.slice(0, 400), contents: bubble };
}

module.exports = { buildFlex };
