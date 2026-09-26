// src/flex/components.js
// Compact, mobile-first LINE Flex components.
// Phase 4: the header uses a real cutout of the village hall to establish local identity.
// Market prices and local news intentionally stay in audio only.

const VILLAGE_HALL_IMAGE_URL = 'https://raw.githubusercontent.com/aodxx/SkyAudio-Alert/main/assets/flex/village-hall-cutout.png';

function headerBlock(location) {
  return {
    type: 'box',
    layout: 'vertical',
    margin: 'none',
    paddingAll: 'md',
    cornerRadius: 'xl',
    background: { type: 'linearGradient', angle: '180deg', startColor: '#8DDEFF', centerColor: '#49B8F4', endColor: '#2578B8', centerPosition: '55%' },
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            flex: 5,
            justifyContent: 'center',
            contents: [
              { type: 'text', text: location.name, weight: 'bold', size: 'xl', color: '#07335C' },
              { type: 'text', text: `${location.district} • ${location.province}`, size: 'sm', color: '#0A477A', margin: 'xs' },
              { type: 'box', layout: 'vertical', margin: 'sm', height: '3px', backgroundColor: '#BFEFFF', cornerRadius: 'sm', contents: [] },
            ],
          },
          {
            type: 'image',
            url: VILLAGE_HALL_IMAGE_URL,
            flex: 6,
            size: 'full',
            aspectRatio: '1.55:1',
            aspectMode: 'fit',
            margin: 'sm',
          },
        ],
      },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        paddingTop: 'xs',
        contents: [
          { type: 'text', text: 'ศาลาเอนกประสงค์ประจำหมู่บ้าน', size: 'xs', color: '#EAF9FF', flex: 1, wrap: true },
          { type: 'text', text: 'หมู่ 4 • โคกชะงาย', size: 'xs', color: '#D8F4FF', align: 'end' },
        ],
      },
    ],
  };
}

function heroTempBlock(current) {
  return {
    type: 'box', layout: 'horizontal', margin: 'md',
    contents: [
      { type: 'box', layout: 'vertical', flex: 1, justifyContent: 'center', contents: [
        { type: 'box', layout: 'baseline', contents: [
          { type: 'text', text: current.temperature !== null ? `${current.temperature}°` : '--°', size: '3xl', weight: 'bold', color: '#FFFFFF', flex: 0 },
          { type: 'text', text: current.icon || '🌤️', size: 'xl', margin: 'sm', flex: 0 },
        ] },
        { type: 'text', text: current.conditionLabel || 'สภาพอากาศวันนี้', size: 'sm', weight: 'bold', color: '#E6EDF5', margin: 'xs' },
        { type: 'text', text: `รู้สึก ${current.apparentTemperature ?? '--'}°`, size: 'xs', color: '#AEB9C8', margin: 'xs' },
      ] },
      { type: 'box', layout: 'vertical', flex: 0, justifyContent: 'center', contents: [
        { type: 'text', text: 'วันนี้', size: 'xs', color: '#8FA0B4' },
        { type: 'text', text: current.todayRange || '', size: 'sm', weight: 'bold', color: '#FFFFFF', margin: 'xs' },
      ] },
    ],
  };
}

function quickIndicatorsBox(current) {
  const item = (label, value) => ({
    type: 'box', layout: 'vertical', flex: 1, contents: [
      { type: 'text', text: label, size: 'xs', color: '#8392A6', align: 'center' },
      { type: 'text', text: value, size: 'sm', weight: 'bold', color: '#F3F6FA', align: 'center', margin: 'xs' },
    ],
  });
  return {
    type: 'box', layout: 'horizontal', margin: 'sm', paddingAll: 'sm',
    backgroundColor: '#172B43', cornerRadius: 'md', spacing: 'none',
    contents: [
      item('ความชื้น', `${current.humidity ?? '--'}%`),
      item('ลม', `${current.windSpeed ?? '--'}`),
      item('ฝนตอนนี้', `${current.precipitation ?? 0} มม.`),
    ],
  };
}

function hourlySection(slots, accentColor) {
  return {
    type: 'box', layout: 'horizontal', margin: 'sm', spacing: 'none',
    contents: slots.map((s) => ({
      type: 'box', layout: 'vertical', flex: 1,
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
    type: 'box', layout: 'vertical', margin: 'sm',
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
    type: 'box', layout: 'horizontal', margin: 'sm', paddingTop: 'xs',
    contents: [
      { type: 'text', text: 'ฟังรายละเอียดในข้อความเสียง • Open-Meteo', size: 'xs', color: '#718097', flex: 1, wrap: true },
      { type: 'text', text: 'น้องจุ่นจ้าน', size: 'xs', color: '#718097', align: 'end' },
    ],
  };
}

module.exports = { headerBlock, heroTempBlock, quickIndicatorsBox, hourlySection, rainProbabilityBox, footerBlock };
