// src/flex/builder.js
// Assembles the complete LINE Flex bubble from forecast data + theme.

const { resolveThemeColors } = require('./themes');
const { headerBlock, heroTempBlock, quickIndicatorsBox, hourlySection, rainProbabilityBox, footerBlock } = require('./components');

function buildFlex(forecastData) {
  const colors = resolveThemeColors(forecastData.theme, forecastData.current.isDay);
  const hero = { type: 'box', layout: 'vertical', paddingAll: 'xl', backgroundColor: colors.from, contents: [headerBlock(forecastData.location), heroTempBlock(forecastData.current, forecastData.announcement)] };
  const bodyContents = [
    quickIndicatorsBox(forecastData.current, colors.to),
    { type: 'text', text: 'พยากรณ์วันนี้', weight: 'bold', size: 'md', color: '#263238', margin: 'lg' },
    hourlySection(forecastData.hourlySlots, colors.to),
    rainProbabilityBox(forecastData.daily, colors.to),
  ];
  const market = (forecastData.marketBrief || []).filter((x) => x && x.status === 'ok' && Number.isFinite(x.price));
  if (market.length) {
    bodyContents.push({ type: 'box', layout: 'vertical', margin: 'lg', paddingAll: 'md', backgroundColor: '#F5F8FC', cornerRadius: 'lg', contents: [
      { type: 'text', text: 'ราคาผลผลิตล่าสุด', size: 'md', weight: 'bold', color: '#263238' },
      ...market.slice(0, 2).map((item) => ({ type: 'text', text: `${item.kind === 'palm' ? '🌴 ปาล์มน้ำมัน' : '🥇 ยางพารา'}  ${item.price.toFixed(2)} บาท/กก.`, size: 'sm', color: '#455A64', margin: 'sm' })),
      { type: 'text', text: 'แหล่งข้อมูล: สำนักงานเกษตรและสหกรณ์จังหวัดพัทลุง', size: 'xs', color: '#9E9E9E', margin: 'sm', wrap: true },
    ] });
  }
  bodyContents.push(footerBlock());
  const bubble = { type: 'bubble', size: 'giga', header: hero, body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: bodyContents } };
  const altText = `พยากรณ์อากาศ ${forecastData.location.name} ${forecastData.current.temperature ?? '--'}° ${forecastData.current.conditionLabel}`;
  return { type: 'flex', altText: altText.slice(0, 400), contents: bubble };
}

module.exports = { buildFlex };
