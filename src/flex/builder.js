const { getFact } = require('../presentation/facts');
const { CTA_URLS, CARD_IMAGE_URLS, TOKENS } = require('./tokens');
const { textNode, ctaFooter } = require('./components');

const LOCATION_LINE = 'ศาลาอเนกประสงค์ บ้านลำพาย';
const PERIODS = Object.freeze([
  ['morning', 'ช่วงเช้า'],
  ['afternoon', 'ช่วงบ่าย'],
  ['evening', 'ช่วงเย็น/ค่ำ'],
]);
const IMAGE_CARDS = Object.freeze([
  { imageUrl: CARD_IMAGE_URLS.floodStatus, alt: 'อัปเดตระดับน้ำจังหวัดพัทลุง', ctaId: 'water-map' },
  { imageUrl: CARD_IMAGE_URLS.waterMap, alt: 'แผนที่ระดับน้ำจังหวัดพัทลุง', ctaId: 'weather-radar' },
  { imageUrl: CARD_IMAGE_URLS.cctv, alt: 'ภาพสด CCTV สำหรับติดตามสถานการณ์น้ำ', ctaId: 'cctv' },
]);

function fact(snapshot, id) {
  return getFact(snapshot, id);
}
function value(snapshot, id) {
  return fact(snapshot, id)?.displayValue || '';
}
function text(value, options = {}) {
  return textNode(value, options);
}
function sectionHeading(label) {
  return text(label, { size: 'sm', weight: 'bold', color: '#075985', margin: 'md' });
}
function divider() {
  return { type: 'separator', margin: 'sm', color: '#DBEAFE' };
}
function infoTile(label, detail) {
  return {
    type: 'box', layout: 'vertical', flex: 1, paddingAll: 'sm', cornerRadius: 'md',
    backgroundColor: '#EFF6FF', contents: [
      text(label, { size: 'xs', color: TOKENS.text.secondary }),
      text(detail, { size: 'sm', weight: 'bold', color: '#0C4A6E' }),
    ],
  };
}
function weatherRange(snapshot) {
  const low = value(snapshot, 'weather.daily.tempMin');
  const high = value(snapshot, 'weather.daily.tempMax');
  if (low && high) return `ต่ำ ${low}° · สูง ${high}°C`;
  if (low) return `ต่ำ ${low}°C`;
  if (high) return `สูง ${high}°C`;
  const current = value(snapshot, 'weather.current.temperature');
  return current ? `ขณะนี้ ${current}°C` : '';
}
function weatherPeriods(snapshot) {
  return PERIODS.flatMap(([period, label]) => {
    const probability = value(snapshot, `weather.rainWindows.${period}.maxProbability`);
    const millimeters = value(snapshot, `weather.rainWindows.${period}.maxPrecipitation`);
    if (!probability && !millimeters) return [];
    const details = [];
    if (probability) details.push(`ฝน ${probability}%`);
    if (millimeters && Number(millimeters) > 0) details.push(`${millimeters} มม.`);
    return [{
      type: 'box', layout: 'horizontal', spacing: 'sm', paddingAll: 'xs',
      contents: [
        text(label, { size: 'xs', weight: 'bold', color: TOKENS.text.secondary, flex: 1 }),
        text(details.join(' · ') || 'ไม่มีฝนที่คาดการณ์', { size: 'xs', weight: 'bold', align: 'end', color: '#0C4A6E' }),
      ],
    }];
  });
}
function otherWeather(snapshot) {
  const facts = [];
  const currentTemperature = value(snapshot, 'weather.current.temperature');
  const apparentTemperature = value(snapshot, 'weather.current.apparentTemperature');
  const humidity = value(snapshot, 'weather.current.humidity');
  const wind = value(snapshot, 'weather.current.windSpeed');
  if (currentTemperature) facts.push(`ขณะนี้ ${currentTemperature}°C`);
  if (apparentTemperature) facts.push(`รู้สึกเหมือน ${apparentTemperature}°C`);
  if (humidity) facts.push(`ความชื้น ${humidity}%`);
  if (wind) facts.push(`ลม ${wind} กม./ชม.`);
  return facts.join(' · ');
}
function makeBubble(bodyContents, ctaId, { padding = 'lg' } = {}) {
  return {
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box', layout: 'vertical', paddingAll: padding, backgroundColor: '#FFFFFF', contents: bodyContents,
    },
    footer: ctaFooter([{ id: ctaId }]),
    styles: { footer: { separator: true, backgroundColor: '#FFFFFF' } },
  };
}
function renderWeatherCard(snapshot) {
  const date = value(snapshot, 'date.label') || 'วันที่ไม่ได้ระบุ';
  const condition = value(snapshot, 'weather.current.condition');
  const dailyRain = value(snapshot, 'weather.daily.rainProbabilityMax');
  const periods = weatherPeriods(snapshot);
  const extras = otherWeather(snapshot);
  const tiles = [];
  const temperature = weatherRange(snapshot);
  if (temperature) tiles.push(infoTile('อุณหภูมิ', temperature));
  if (dailyRain) tiles.push(infoTile('โอกาสฝนสูงสุดวันนี้', `${dailyRain}%`));

  const contents = [
    text(date, { size: 'md', weight: 'bold', color: '#075985' }),
    text(LOCATION_LINE, { size: 'sm', weight: 'bold', color: TOKENS.text.primary }),
    divider(),
    text('พยากรณ์อากาศประจำวันนี้', { size: 'lg', weight: 'bold', color: '#0C4A6E' }),
  ];
  if (condition) contents.push(text(`สภาพอากาศ · ${condition}`, { size: 'sm', color: TOKENS.text.secondary }));
  if (tiles.length) contents.push({ type: 'box', layout: 'horizontal', spacing: 'sm', contents: tiles });
  if (!condition && !tiles.length && !periods.length && !extras) {
    contents.push(text('ยังไม่มีข้อมูลพยากรณ์ในขณะนี้', { size: 'sm', color: TOKENS.text.secondary }));
  }
  contents.push(sectionHeading('ช่วงเวลา'));
  contents.push(...(periods.length ? periods : [text('ยังไม่มีข้อมูลแยกช่วงเวลา', { size: 'xs', color: TOKENS.text.muted })]));
  contents.push(sectionHeading('อื่นๆ'));
  contents.push(text(extras || 'ยังไม่มีข้อมูลเพิ่มเติม', { size: 'xs', color: TOKENS.text.secondary }));
  return makeBubble(contents, 'flood-source');
}
function renderImageCard({ imageUrl, alt, ctaId }) {
  return makeBubble([{
    type: 'image',
    url: imageUrl,
    size: 'full',
    aspectRatio: '4:5',
    aspectMode: 'fit',
    align: 'center',
    gravity: 'center',
    alt,
  }], ctaId, { padding: 'none' });
}
function altText(snapshot) {
  const date = value(snapshot, 'date.label');
  return `พยากรณ์อากาศพัทลุง${date ? ` · ${date}` : ''}`.slice(0, TOKENS.budget.maxAltTextCodePoints);
}
function buildFlexV2({ factsSnapshot } = {}) {
  if (!factsSnapshot || !factsSnapshot.facts) throw new TypeError('buildFlexV2 requires a FactsSnapshot');
  const cards = [renderWeatherCard(factsSnapshot), ...IMAGE_CARDS.map(renderImageCard)];
  return {
    type: 'flex',
    altText: altText(factsSnapshot),
    contents: { type: 'carousel', contents: cards },
  };
}

module.exports = { buildFlexV2, altText, weatherPeriods, otherWeather };
