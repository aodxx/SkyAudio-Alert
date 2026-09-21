// src/flex/components.js
// Small, reusable LINE Flex component builders. Kept free of business logic
// — all data is passed in already formatted.

function headerBlock(location) {
  return {
    type: 'box',
    layout: 'vertical',
    contents: [
      { type: 'text', text: location.name, weight: 'bold', size: 'xl', color: '#FFFFFF' },
      {
        type: 'text',
        text: `${location.district} • ${location.province}`,
        size: 'sm',
        color: '#E0E0E0',
        margin: 'xs',
      },
    ],
  };
}

function heroTempBlock(current) {
  return {
    type: 'box',
    layout: 'vertical',
    margin: 'lg',
    contents: [
      {
        type: 'text',
        text: current.temperature !== null ? `${current.temperature}°` : '--°',
        size: '3xl',
        weight: 'bold',
        color: '#FFFFFF',
      },
      {
        type: 'box',
        layout: 'baseline',
        margin: 'sm',
        contents: [
          { type: 'text', text: `${current.icon} ${current.conditionLabel}`, size: 'sm', color: '#F5F5F5' },
          {
            type: 'text',
            text: `  รู้สึกเหมือน ${current.apparentTemperature ?? '--'}°`,
            size: 'sm',
            color: '#D0D0D0',
          },
        ],
      },
    ],
  };
}

function quickIndicatorsBox(current) {
  const item = (label, value) => ({
    type: 'box',
    layout: 'vertical',
    contents: [
      { type: 'text', text: label, size: 'xs', color: '#8A8A8A' },
      { type: 'text', text: value, size: 'md', weight: 'bold', color: '#212121', margin: 'xs' },
    ],
  });

  return {
    type: 'box',
    layout: 'horizontal',
    backgroundColor: '#F5F7FA',
    cornerRadius: 'md',
    paddingAll: 'md',
    margin: 'lg',
    contents: [
      item('ความชื้น', `${current.humidity ?? '--'}%`),
      item('ลม', `${current.windSpeed ?? '--'} กม./ชม.`),
      item('ฝนตอนนี้', `${current.precipitation ?? 0} มม.`),
    ],
  };
}

function hourlyRow(slots) {
  return {
    type: 'box',
    layout: 'horizontal',
    margin: 'lg',
    contents: slots.map((s) => ({
      type: 'box',
      layout: 'vertical',
      alignItems: 'center',
      contents: [
        { type: 'text', text: s.label, size: 'xxs', color: '#8A8A8A' },
        { type: 'text', text: s.icon, size: 'md', margin: 'xs' },
        {
          type: 'text',
          text: s.temperature !== null ? `${s.temperature}°` : '--°',
          size: 'sm',
          weight: 'bold',
          color: '#212121',
          margin: 'xs',
        },
        {
          type: 'text',
          text: `${s.precipitationProbability}%`,
          size: 'xxs',
          color: '#1E88E5',
          margin: 'xs',
        },
      ],
    })),
  };
}

function dailySummaryBox(daily) {
  return {
    type: 'box',
    layout: 'horizontal',
    margin: 'lg',
    contents: [
      { type: 'text', text: `ต่ำสุด ${daily.tempMin ?? '--'}°`, size: 'sm', color: '#546E7A' },
      { type: 'text', text: `สูงสุด ${daily.tempMax ?? '--'}°`, size: 'sm', color: '#546E7A', align: 'end' },
    ],
  };
}

function adviceBox(adviceSentences) {
  if (!adviceSentences.length) return null;
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: '#FFF8E1',
    cornerRadius: 'md',
    paddingAll: 'md',
    margin: 'lg',
    contents: [
      { type: 'text', text: 'คำแนะนำวันนี้', weight: 'bold', size: 'sm', color: '#795548' },
      { type: 'text', text: adviceSentences[0], size: 'sm', color: '#5D4037', wrap: true, margin: 'xs' },
    ],
  };
}

function footerBlock() {
  return {
    type: 'box',
    layout: 'vertical',
    margin: 'lg',
    contents: [
      { type: 'separator' },
      {
        type: 'text',
        text: `ข้อมูลจาก Open-Meteo • อัปเดตล่าสุดโดยน้องจุ่นจ้าน`,
        size: 'xxs',
        color: '#B0B0B0',
        margin: 'md',
        wrap: true,
      },
    ],
  };
}

module.exports = {
  headerBlock,
  heroTempBlock,
  quickIndicatorsBox,
  hourlyRow,
  dailySummaryBox,
  adviceBox,
  footerBlock,
};
