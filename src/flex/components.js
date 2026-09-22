// src/flex/components.js
// Reusable LINE Flex components. Business logic stays outside this module.

function headerBlock(location) {
  return { type: 'box', layout: 'vertical', contents: [
    { type: 'text', text: 'น้องจุ่นจ้าน • รายงานเช้านี้', weight: 'bold', size: 'lg', color: '#FFFFFF' },
    { type: 'text', text: location.name, weight: 'bold', size: 'xl', color: '#FFFFFF', margin: 'sm' },
    { type: 'text', text: `${location.district} • ${location.province}`, size: 'sm', color: '#E3F2FD', margin: 'xs' },
  ] };
}

function heroTempBlock(current) {
  return { type: 'box', layout: 'vertical', margin: 'lg', contents: [
    { type: 'box', layout: 'baseline', contents: [
      { type: 'text', text: current.temperature !== null ? `${current.temperature}°` : '--°', size: '4xl', weight: 'bold', color: '#FFFFFF', flex: 0 },
      { type: 'text', text: current.icon, size: '3xl', margin: 'md', flex: 0 },
    ] },
    { type: 'text', text: current.conditionLabel, size: 'md', weight: 'bold', color: '#FFFFFF', margin: 'xs' },
    { type: 'text', text: `รู้สึกเหมือน ${current.apparentTemperature ?? '--'}°`, size: 'sm', color: '#E3F2FD', margin: 'xs' },
  ] };
}

function quickIndicatorsBox(current, accentColor) {
  const item = (icon, label, value) => ({ type: 'box', layout: 'vertical', flex: 1, contents: [
    { type: 'text', text: icon, size: 'sm', align: 'center' },
    { type: 'text', text: label, size: 'xxs', color: '#78909C', align: 'center', margin: 'xs' },
    { type: 'text', text: value, size: 'sm', weight: 'bold', color: accentColor, align: 'center', margin: 'xs' },
  ] });
  return { type: 'box', layout: 'horizontal', backgroundColor: '#F5F8FC', cornerRadius: 'lg', paddingAll: 'md', margin: 'lg', spacing: 'md', contents: [
    item('💧', 'ความชื้น', `${current.humidity ?? '--'}%`),
    item('💨', 'ลม', `${current.windSpeed ?? '--'} กม./ชม.`),
    item('🌧️', 'ฝนตอนนี้', `${current.precipitation ?? 0} มม.`),
  ] };
}

function hourlySection(slots, accentColor) {
  return { type: 'box', layout: 'horizontal', margin: 'md', spacing: 'sm', contents: slots.map((s) => ({
    type: 'box', layout: 'vertical', flex: 1, backgroundColor: '#F7F9FC', cornerRadius: 'md', paddingAll: 'sm', alignItems: 'center', contents: [
      { type: 'text', text: s.label, size: 'xxs', color: '#78909C', align: 'center' },
      { type: 'text', text: s.icon, size: 'lg', margin: 'xs', align: 'center' },
      { type: 'text', text: s.temperature !== null ? `${s.temperature}°` : '--°', size: 'sm', weight: 'bold', color: '#263238', align: 'center' },
      { type: 'text', text: `${s.precipitationProbability}%`, size: 'xxs', color: accentColor, margin: 'xs', align: 'center' },
    ]
  })) };
}

function rainProbabilityBox(daily, accentColor) {
  const probability = Math.max(0, Math.min(100, Number(daily.precipitationProbabilityMax ?? 0)));
  const filled = Math.max(1, probability);
  const empty = Math.max(1, 100 - probability);
  return { type: 'box', layout: 'vertical', margin: 'lg', paddingAll: 'md', backgroundColor: '#F5F8FC', cornerRadius: 'lg', contents: [
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: 'โอกาสฝนวันนี้', size: 'sm', weight: 'bold', color: '#263238', flex: 1 },
      { type: 'text', text: `${probability}%`, size: 'sm', weight: 'bold', color: accentColor, align: 'end' },
    ] },
    { type: 'box', layout: 'horizontal', margin: 'sm', height: '8px', cornerRadius: 'md', contents: [
      { type: 'box', layout: 'vertical', flex: filled, backgroundColor: accentColor, contents: [] },
      { type: 'box', layout: 'vertical', flex: empty, backgroundColor: '#E0E0E0', contents: [] },
    ] },
  ] };
}

function dailySummaryBox(daily, accentColor) {
  return { type: 'box', layout: 'horizontal', margin: 'lg', paddingAll: 'md', backgroundColor: '#FAFAFA', cornerRadius: 'lg', contents: [
    { type: 'box', layout: 'vertical', flex: 1, contents: [
      { type: 'text', text: 'อุณหภูมิต่ำสุด', size: 'xxs', color: '#78909C' },
      { type: 'text', text: `${daily.tempMin ?? '--'}°`, size: 'xl', weight: 'bold', color: '#455A64', margin: 'xs' },
    ] },
    { type: 'box', layout: 'vertical', flex: 1, contents: [
      { type: 'text', text: 'อุณหภูมิสูงสุด', size: 'xxs', color: '#78909C' },
      { type: 'text', text: `${daily.tempMax ?? '--'}°`, size: 'xl', weight: 'bold', color: accentColor, margin: 'xs' },
    ] },
  ] };
}

function adviceBox(adviceSentences) {
  if (!adviceSentences.length) return null;
  return { type: 'box', layout: 'vertical', backgroundColor: '#FFF8E1', cornerRadius: 'lg', paddingAll: 'md', margin: 'lg', contents: [
    { type: 'text', text: '💡 คำแนะนำวันนี้', weight: 'bold', size: 'sm', color: '#6D4C41' },
    { type: 'text', text: adviceSentences[0], size: 'sm', color: '#4E342E', wrap: true, margin: 'sm' },
  ] };
}

function footerBlock() {
  return { type: 'box', layout: 'vertical', margin: 'lg', contents: [
    { type: 'separator', color: '#E0E0E0' },
    { type: 'text', text: 'ข้อมูลจาก Open-Meteo • รายงานโดยน้องจุ่นจ้าน', size: 'xxs', color: '#9E9E9E', margin: 'md', align: 'center', wrap: true },
  ] };
}

module.exports = { headerBlock, heroTempBlock, quickIndicatorsBox, hourlySection, rainProbabilityBox, dailySummaryBox, adviceBox, footerBlock };