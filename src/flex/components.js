// src/flex/components.js
// Compact, mobile-first LINE Flex components.
// Visual direction: deep navy weather card, high contrast, minimal boxes,
// inspired by the user's real LINE screenshot. Audio carries the detailed report.

function headerBlock(location) {
  return {
    type: 'box', layout: 'vertical', spacing: 'xs',
    contents: [
      { type: 'text', text: location.name, weight: 'bold', size: 'xl', color: '#FFFFFF' },
      { type: 'text', text: `${location.district} • ${location.province}`, size: 'xs', color: '#AAB7C8' },
    ],
  };
}

// RESERVED SLOT — retained for the future village-announcement feature.
// Phase 2 keeps it deliberately compact so it never expands the weather card.
function announcementBoard(announcement) {
  return {
    type: 'box', layout: 'horizontal', height: '22px',
    backgroundColor: '#18263A', cornerRadius: 'sm', paddingAll: 'xs',
    contents: [
      { type: 'text', text: '📌', size: 'xs', flex: 0 },
      { type: 'text', text: announcement || 'ประกาศชุมชน', size: 'xs', color: '#B8C5D6', flex: 1, margin: 'xs', maxLines: 1, wrap: false },
    ],
  };
}

function heroTempBlock(current, announcement) {
  return {
    type: 'box', layout: 'horizontal', margin: 'lg', spacing: 'sm',
    contents: [
      {
        type: 'box', layout: 'vertical', flex: 1, justifyContent: 'center',
        contents: [
          { type: 'box', layout: 'horizontal', alignItems: 'center', contents: [
            { type: 'text', text: current.temperature !== null ? `${current.temperature}°` : '--°', size: '4xl', weight: 'bold', color: '#FFFFFF', flex: 0 },
            { type: 'text', text: current.icon, size: '3xl', margin: 'sm', flex: 0 },
          ]},
          { type: 'text', text: current.conditionLabel, size: 'sm', weight: 'bold', color: '#DCE6F2', margin: 'xs' },
          { type: 'text', text: `รู้สึกเหมือน ${current.apparentTemperature ?? '--'}°`, size: 'xs', color: '#AAB7C8', margin: 'xs' },
        ],
      },
      { type: 'box', layout: 'vertical', flex: 0, justifyContent: 'end', contents: [announcementBoard(announcement)] },
    ],
  };
}

function quickIndicatorsBox(current, accentColor) {
  const item = (icon, label, value) => ({
    type: 'box', layout: 'vertical', flex: 1, contents: [
      { type: 'text', text: icon, size: 'xs', align: 'center' },
      { type: 'text', text: label, size: 'xxs', color: '#8FA0B4', align: 'center', margin: 'xs' },
      { type: 'text', text: value, size: 'xs', weight: 'bold', color: '#FFFFFF', align: 'center', margin: 'xs' },
    ],
  });
  return {
    type: 'box', layout: 'horizontal', margin: 'md', paddingAll: 'sm',
    backgroundColor: '#1B293D', cornerRadius: 'lg', spacing: 'sm',
    contents: [
      item('💧', 'ความชื้น', `${current.humidity ?? '--'}%`),
      item('💨', 'ลม', `${current.windSpeed ?? '--'} กม./ชม.`),
      item('🌧️', 'ฝนตอนนี้', `${current.precipitation ?? 0} มม.`),
    ],
  };
}

function hourlySection(slots, accentColor) {
  return {
    type: 'box', layout: 'horizontal', margin: 'sm', paddingAll: 'sm',
    backgroundColor: '#1B293D', cornerRadius: 'lg', spacing: 'none',
    contents: slots.map((s) => ({
      type: 'box', layout: 'vertical', flex: 1, alignItems: 'center',
      contents: [
        { type: 'text', text: s.label, size: 'xxs', weight: 'bold', color: '#9FB0C4', align: 'center' },
        { type: 'text', text: s.icon, size: 'sm', margin: 'xs', align: 'center' },
        { type: 'text', text: s.temperature !== null ? `${s.temperature}°` : '--°', size: 'xs', weight: 'bold', color: '#FFFFFF', align: 'center' },
        { type: 'text', text: `${s.precipitationProbability}%`, size: 'xxs', color: accentColor, margin: 'xs', align: 'center' },
      ],
    })),
  };
}

function rainProbabilityBox(daily, accentColor) {
  const probability = Math.max(0, Math.min(100, Number(daily.precipitationProbabilityMax ?? 0)));
  const filled = Math.max(1, probability);
  const empty = Math.max(1, 100 - probability);
  return {
    type: 'box', layout: 'vertical', margin: 'sm', paddingAll: 'sm',
    contents: [
      { type: 'box', layout: 'horizontal', contents: [
        { type: 'text', text: 'ฝนวันนี้', size: 'xs', color: '#9FB0C4', flex: 1 },
        { type: 'text', text: `${probability}%`, size: 'xs', weight: 'bold', color: '#FFFFFF', align: 'end' },
      ]},
      { type: 'box', layout: 'horizontal', margin: 'xs', height: '4px', cornerRadius: 'sm', contents: [
        { type: 'box', layout: 'vertical', flex: filled, backgroundColor: accentColor, contents: [] },
        { type: 'box', layout: 'vertical', flex: empty, backgroundColor: '#27364B', contents: [] },
      ]},
    ],
  };
}

function footerBlock() {
  return {
    type: 'box', layout: 'vertical', margin: 'sm',
    contents: [
      { type: 'separator', color: '#27364B' },
      { type: 'text', text: 'ฟังรายละเอียดทั้งหมดได้จากข้อความเสียง • Open-Meteo', size: 'xxs', color: '#6F8096', margin: 'sm', align: 'center', wrap: true },
    ],
  };
}

function marketMiniRow(market) {
  const items = market.filter((x) => x && x.status === 'ok' && Number.isFinite(x.price)).slice(0, 2);
  if (!items.length) return null;
  return {
    type: 'box', layout: 'horizontal', margin: 'sm', paddingAll: 'sm',
    backgroundColor: '#1B293D', cornerRadius: 'lg', spacing: 'sm',
    contents: items.map((item) => ({
      type: 'box', layout: 'vertical', flex: 1, contents: [
        { type: 'text', text: item.kind === 'palm' ? '🌴 ปาล์ม' : '🧤 ยาง', size: 'xxs', color: '#9FB0C4' },
        { type: 'text', text: `${item.price.toFixed(2)} บาท/กก.`, size: 'xs', weight: 'bold', color: '#FFFFFF', margin: 'xs' },
      ],
    })),
  };
}

module.exports = { headerBlock, heroTempBlock, quickIndicatorsBox, hourlySection, rainProbabilityBox, footerBlock, marketMiniRow };
