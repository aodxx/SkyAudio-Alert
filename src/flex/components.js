// src/flex/components.js
// Reusable LINE Flex components. Business logic stays outside this module.

function headerBlock(location) {
  return { type: 'box', layout: 'vertical', contents: [
    { type: 'text', text: location.name, weight: 'bold', size: 'xxl', color: '#FFFFFF' },
    { type: 'text', text: `${location.district} • ${location.province}`, size: 'sm', color: '#E3F2FD', margin: 'xs' },
  ] };
}

function heroTempBlock(current) {
  return { type: 'box', layout: 'vertical', margin: 'lg', contents: [
    { type: 'box', layout: 'baseline', contents: [
      { type: 'text', text: current.temperature !== null ? `${current.temperature}°` : '--°', size: '4xl', weight: 'bold', color: '#FFFFFF', flex: 0 },
      { type: 'text', text: current.icon, size: '3xl', margin: 'md', flex: 0 },
    ] },
    { type: 'text', text: current.conditionLabel, size: 'lg', weight: 'bold', color: '#FFFFFF', margin: 'xs' },
    { type: 'text', text: `รู้สึกเหมือน ${current.apparentTemperature ?? '--'}°`, size: 'md', color: '#E3F2FD', margin: 'xs' },
  ] };
}

function quickIndicatorsBox(current, accentColor) {
  const item = (icon, label, value) => ({ type: 'box', layout: 'vertical', flex: 1, contents: [
    { type: 'text', text: icon, size: 'md', align: 'center' },
    { type: 'text', text: label, size: 'sm', color: '#78909C', align: 'center', margin: 'xs' },
    { type: 'text', text: value, size: 'md', weight: 'bold', color: accentColor, align: 'center', margin: 'xs' },
  ] });
  return { type: 'box', layout: 'horizontal', backgroundColor: '#F5F8FC', cornerRadius: 'lg', paddingAll: 'md', margin: 'lg', spacing: 'md', contents: [
    item('💧', 'ความชื้น', `${current.humidity ?? '--'}%`),
    item('💨', 'ลม', `${current.windSpeed ?? '--'} กม./ชม.`),
    item('🌧️', 'ฝนตอนนี้', `${current.precipitation ?? 0} มม.`),
  ] };
}

// Horizontal, full-width row. Card width auto-shrinks per slot (flex:1 each)
// so more slots = a denser, wider-reaching timeline instead of overflow.
function hourlySection(slots, accentColor) {
  return { type: 'box', layout: 'horizontal', margin: 'md', spacing: 'xs', contents: slots.map((s) => ({
    type: 'box', layout: 'vertical', flex: 1, backgroundColor: '#F7F9FC', cornerRadius: 'md', paddingAll: 'sm', alignItems: 'center', contents: [
      { type: 'text', text: s.label, size: 'xs', weight: 'bold', color: '#FF7043', align: 'center' },
      { type: 'text', text: s.icon, size: 'lg', margin: 'xs', align: 'center' },
      { type: 'text', text: s.temperature !== null ? `${s.temperature}°` : '--°', size: 'sm', weight: 'bold', color: '#263238', align: 'center' },
      { type: 'text', text: `${s.precipitationProbability}%`, size: 'xs', color: accentColor, margin: 'xs', align: 'center' },
    ]
  })) };
}

function rainProbabilityBox(daily, accentColor) {
  const probability = Math.max(0, Math.min(100, Number(daily.precipitationProbabilityMax ?? 0)));
  const filled = Math.max(1, probability);
  const empty = Math.max(1, 100 - probability);
  return { type: 'box', layout: 'vertical', margin: 'lg', paddingAll: 'md', backgroundColor: '#F5F8FC', cornerRadius: 'lg', contents: [
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: 'โอกาสฝนวันนี้', size: 'md', weight: 'bold', color: '#263238', flex: 1 },
      { type: 'text', text: `${probability}%`, size: 'md', weight: 'bold', color: accentColor, align: 'end' },
    ] },
    { type: 'box', layout: 'horizontal', margin: 'sm', height: '8px', cornerRadius: 'md', contents: [
      { type: 'box', layout: 'vertical', flex: filled, backgroundColor: accentColor, contents: [] },
      { type: 'box', layout: 'vertical', flex: empty, backgroundColor: '#E0E0E0', contents: [] },
    ] },
  ] };
}

function footerBlock() {
  return { type: 'box', layout: 'vertical', margin: 'lg', contents: [
    { type: 'separator', color: '#E0E0E0' },
    { type: 'text', text: 'ข้อมูลจาก Open-Meteo • ©2026 อ๊อด. All rights reseved', size: 'xs', color: '#9E9E9E', margin: 'md', align: 'center', wrap: false },
  ] };
}

module.exports = { headerBlock, heroTempBlock, quickIndicatorsBox, hourlySection, rainProbabilityBox, footerBlock };
