// src/flex/components.js
// Compact, mobile-first LINE Flex components.
// Phase 2: Flex is the visual "cover" for the audio report.
// Market prices and local news intentionally stay in audio only.

function headerBlock(location) {
  return {
    type: 'box', layout: 'vertical', spacing: 'xs',
    contents: [
      { type: 'text', text: location.name, weight: 'bold', size: 'lg', color: '#FFFFFF' },
      { type: 'text', text: `${location.district} • ${location.province}`, size: 'xs', color: '#AEB9C8' },
    ],
  };
}

function heroTempBlock(current) {
  return {
    type: 'box', layout: 'horizontal', margin: 'md', alignItems: 'center',
    contents: [
      { type: 'box', layout: 'vertical', flex: 1, justifyContent: 'center', contents: [
        { type: 'box', layout: 'baseline', contents: [
          { type: 'text', text: current.temperature !== null ? `${current.temperature}°` : '--°', size: '4xl', weight: 'bold', color: '#FFFFFF', flex: 0 },
          { type: 'text', text: current.icon || '🌤️', size: 'xl', margin: 'sm', flex: 0 },
        ] },
        { type: 'text', text: current.conditionLabel || 'สภาพอากาศวันนี้', size: 'sm', weight: 'bold', color: '#E6EDF5', margin: 'xs' },
        { type: 'text', text: `รู้สึก ${current.apparentTemperature ?? '--'}°`, size: 'xs', color: '#AEB9C8', margin: 'xs' },
      ] },
      { type: 'box', layout: 'vertical', flex: 0, alignItems: 'end', justifyContent: 'center', contents: [
        { type: 'text', text: 'วันนี้', size: 'xs', color: '#8FA0B4' },
        { type: 'text', text: current.todayRange || '', size: 'sm', weight: 'bold', color: '#FFFFFF', margin: 'xs' },
      ] },
    ],
  };
}

function quickIndicatorsBox(current, accentColor) {
  const item = (label, value) => ({
    type: 'box', layout: 'vertical', flex: 1, contents: [
      { type: 'text', text: label, size: 'xs', color: '#8392A6', align: 'center' },
      { type: 'text', text: value, size: 'sm', weight: 'bold', color: '#F3F6FA', align: 'center', margin: 'xs' },
    ],
  });
  return {
    type: 'box', layout: 'horizontal', margin: 'md', paddingAll: 'sm',
    backgroundColor: '#172338', cornerRadius: 'md', spacing: 'none',
    contents: [
      item('ความชื้น', `${current.humidity ?? '--'}%`),
      item('ลม', `${current.windSpeed ?? '--'}`),
      item('ฝนตอนนี้', `${current.precipitation ?? 0} มม.`),
    ],
  };
}

function hourlySection(slots, accentColor) {
  return {
    type: 'box', layout: 'horizontal', margin: 'md', spacing: 'none',
    contents: slots.map((s) => ({
      type: 'box', layout: 'vertical', flex: 1, alignItems: 'center',
      contents: [
        { type: 'text', text: s.label, size: 'xs', color: '#8291A5', align: 'center' },
        { type: 'text', text: s.icon || '🌤️', size: 'sm', margin: 'xs', align: 'center' },
        { type: 'text', text: s.temperature !== null ? `${s.temperature}°` : '--°', size: 'xs', weight: 'bold', color: '#F3F6FA', align: 'center' },
        { type: 'text', text: `${s.precipitationProbability}%`, size: 'xs', color: accentColor, margin: 'xs', align: 'center' },
      ],
    })),
  };
}

function rainProbabilityBox(daily, accentColor) {
  const probability = Math.max(0, Math.min(100, Number(daily.precipitationProbabilityMax ?? 0)));
  return {
    type: 'box', layout: 'vertical', margin: 'md',
    contents: [
      { type: 'box', layout: 'horizontal', contents: [
        { type: 'text', text: 'ฝนวันนี้', size: 'xs', color: '#8392A6', flex: 1 },
        { type: 'text', text: `${probability}%`, size: 'xs', weight: 'bold', color: accentColor, align: 'end' },
      ] },
      { type: 'box', layout: 'horizontal', margin: 'xs', height: '4px', cornerRadius: 'sm',
        contents: [
          { type: 'box', layout: 'vertical', flex: Math.max(1, probability), backgroundColor: accentColor, contents: [] },
          { type: 'box', layout: 'vertical', flex: Math.max(1, 100 - probability), backgroundColor: '#334156', contents: [] },
        ],
      },
    ],
  };
}

function footerBlock() {
  return {
    type: 'box', layout: 'horizontal', margin: 'md', paddingTop: 'sm',
    contents: [
      { type: 'text', text: 'ฟังรายละเอียดในข้อความเสียง • Open-Meteo', size: 'xs', color: '#718097', flex: 1, wrap: true },
      { type: 'text', text: 'น้องจุ่นจ้าน', size: 'xs', color: '#718097', align: 'end' },
    ],
  };
}

module.exports = { headerBlock, heroTempBlock, quickIndicatorsBox, hourlySection, rainProbabilityBox, footerBlock };
