const { getFact } = require('../presentation/facts');
const { validateVisualPlan } = require('../presentation/visualPlan');
const { TOKENS, SEVERITY_TOKENS } = require('./tokens');
const { getVariant } = require('./variants');
const {
  textNode, badge, chip, stationRow, metricTile, actionRow, ctaFooter,
  heroBubble, stationsBubble, locationsBubble, impactBubble, actionsBubble, weatherBubble, sourceBubble, whyUnknownBubble,
} = require('./components');
const TREND_ARROWS = Object.freeze({ rising: '↗', stable: '→', falling: '↘', unknown: '–' });
const STATUS_SCALE = Object.freeze(['ปกติ', 'น้ำมาก', 'ใกล้ล้นตลิ่ง', 'ล้นตลิ่ง']);

function fact(snapshot, id) {
  return id ? getFact(snapshot, id) : undefined;
}
function factText(snapshot, id) {
  return fact(snapshot, id)?.displayValue || '';
}
function withUnit(item) {
  if (!item) return '';
  return item.displayValue + (item.unit ? ' ' + item.unit : '');
}
function formatThaiDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date);
}
function freshnessChip(snapshot) {
  const state = fact(snapshot, 'flood.freshness.state')?.value || 'unknown';
  const timestamp = fact(snapshot, 'flood.observedAt') || fact(snapshot, 'flood.publishedAt') || fact(snapshot, 'flood.retrievedAt');
  const formatted = formatThaiDateTime(timestamp?.value);
  if (state === 'stale') return '⏱ ข้อมูลล่าสุด' + (formatted ? ' ' + formatted : '') + ' · อาจไม่เป็นปัจจุบัน';
  if (state === 'fresh') return 'อัปเดต' + (formatted ? ' ' + formatted : 'แล้ว');
  return 'ยังไม่ทราบเวลาข้อมูล';
}
function trendChip(snapshot) {
  const item = fact(snapshot, 'flood.trend');
  const trend = item?.value || 'unknown';
  return (TREND_ARROWS[trend] || TREND_ARROWS.unknown) + ' ' + (item?.displayValue || 'ไม่ทราบแนวโน้ม');
}
function getPrimaryLocation(snapshot) {
  return factText(snapshot, 'flood.location.name') || factText(snapshot, 'location.name') || 'พื้นที่รายงาน';
}
function cardForRole(card) {
  return card.role === 'uncertainty' ? 'hero' : card.role;
}

function renderHero(card, snapshot) {
  const severity = snapshot.severity;
  const token = SEVERITY_TOKENS[severity] || SEVERITY_TOKENS.unknown;
  const location = getPrimaryLocation(snapshot);
  const district = factText(snapshot, 'location.district');
  const date = factText(snapshot, 'date.label');
  const header = ['น้องจุ่นจ้าน', location, district, date].filter(Boolean).join(' · ');
  const sourceSummary = factText(snapshot, card.slots?.summary?.factId) || card.microcopy || 'ยังไม่พบข้อความสรุปจากข้อมูลที่ยืนยันได้';
  const summary = severity === 'critical' ? 'สถานการณ์น้ำระดับวิกฤต' : sourceSummary;
  const contents = [
    textNode(header, { size: 'xs', color: TOKENS.text.secondary }),
    badge(severity),
    { type: 'box', layout: 'horizontal', spacing: 'xs', contents: [
      chip(trendChip(snapshot), { backgroundColor: token.band, color: token.foreground }),
      chip(freshnessChip(snapshot), { backgroundColor: '#F1F5F9', color: TOKENS.text.secondary }),
    ] },
    textNode(summary, { size: 'sm', weight: 'bold' }),
  ];
  if (severity === 'critical') {
    const firstActionId = card.slots?.actionFactIds?.[0];
    const actionText = factText(snapshot, firstActionId) || card.microcopy || 'ติดตามประกาศจากหน่วยงานที่รับผิดชอบ';
    contents.push(actionRow(actionText, { severity, label: 'ทำทันที' }));
    contents.push(ctaFooter([{ id: 'cctv' }], { severity, primaryId: 'cctv' }));
  } else if (severity === 'unknown') {
    contents.push(ctaFooter([{ id: 'cctv' }], { severity, primaryId: 'cctv' }));
  }
  return heroBubble({ severity, backgroundColor: token.surface, contents });
}

function stationRank(label) {
  const normalized = String(label || '').trim();
  if (/ใกล้\s*ล้นตลิ่ง/.test(normalized)) return 3;
  if (/ล้นตลิ่ง/.test(normalized)) return 4;
  if (/น้ำมาก/.test(normalized)) return 2;
  if (/ปกติ/.test(normalized)) return 1;
  return 0;
}
function stationModel(snapshot, slots) {
  const labelFact = fact(snapshot, slots.labelFactId);
  const trendFact = fact(snapshot, slots.trendFactId);
  const distanceFact = fact(snapshot, slots.distanceToBankMetersFactId);
  const trendKey = trendFact?.value || 'unknown';
  return {
    name: factText(snapshot, slots.nameFactId),
    waterway: factText(snapshot, slots.waterwayFactId),
    label: labelFact?.displayValue || '',
    distance: distanceFact ? 'ต่ำกว่าตลิ่ง ' + withUnit(distanceFact) : '',
    distanceMeters: distanceFact ? Number(distanceFact.value) : Number.POSITIVE_INFINITY,
    trend: (TREND_ARROWS[trendKey] || TREND_ARROWS.unknown) + ' ' + (trendFact?.displayValue || 'ไม่ทราบแนวโน้ม'),
    rank: stationRank(labelFact?.value),
    normal: /ปกติ/.test(labelFact?.value || ''),
  };
}
function impactRows(snapshot, impact = {}) {
  const rows = [];
  for (const id of (impact.areaFactIds || []).slice(0, 3)) {
    const value = factText(snapshot, id);
    if (value) rows.push({ type: 'box', layout: 'horizontal', paddingAll: 'sm', cornerRadius: 'sm', backgroundColor: TOKENS.surface.subtle,
      contents: [textNode('📍 พื้นที่ · ' + value, { size: 'sm', weight: 'bold' })] });
  }
  for (const id of (impact.roadFactIds || []).slice(0, 2)) {
    const value = factText(snapshot, id);
    if (value) rows.push({ type: 'box', layout: 'horizontal', paddingAll: 'sm', cornerRadius: 'sm', backgroundColor: '#EFF6FF',
      contents: [textNode('🛣️ ถนน · ' + value, { size: 'sm', weight: 'bold' })] });
  }
  return rows;
}
function renderLocations(card, snapshot) {
  const models = (card.slots?.stations || []).map((slots) => stationModel(snapshot, slots))
    .filter((item) => item.name)
    .sort((left, right) => right.rank - left.rank || left.distanceMeters - right.distanceMeters);
  const visible = models.slice(0, 3);
  const contents = visible.map((model) => stationRow(model));
  const normalExtras = models.slice(3);
  if (normalExtras.length && normalExtras.every((station) => station.normal)) {
    contents.push(textNode('+' + normalExtras.length + ' สถานีอยู่ในเกณฑ์ปกติ', { size: 'xs', color: TOKENS.text.secondary }));
  }
  contents.push(...impactRows(snapshot, card.slots?.impact));
  if (!contents.length) return null;
  const makeBubble = card.role === 'stations' ? stationsBubble : card.role === 'impact' ? impactBubble : locationsBubble;
  return makeBubble({ heading: card.heading, severity: snapshot.severity, contents });
}

function renderActions(card, snapshot) {
  const contents = (card.slots?.actionFactIds || []).slice(0, 3)
    .map((id) => factText(snapshot, id))
    .filter(Boolean)
    .map((value) => actionRow(value, { severity: snapshot.severity }));
  if (!contents.length) return null;
  return actionsBubble({ heading: card.heading, severity: snapshot.severity, contents });
}
function metricValue(snapshot, metrics, id) {
  const entry = metrics.find((metric) => metric.id === id);
  return entry ? { entry, source: fact(snapshot, entry.valueFactId) } : undefined;
}
function displayTemperature(snapshot, metrics, id) {
  const item = metricValue(snapshot, metrics, id)?.source;
  return item ? item.displayValue + '°C' : '';
}
function renderWeather(card, snapshot) {
  const metrics = card.slots?.metrics || [];
  const tiles = [];
  const current = metricValue(snapshot, metrics, 'temperature')?.source;
  const low = metricValue(snapshot, metrics, 'temperature-low')?.source;
  const high = metricValue(snapshot, metrics, 'temperature-high')?.source;
  const temperature = current || low || high;
  if (temperature) {
    const range = low && high ? 'ต่ำ ' + low.displayValue + '° · สูง ' + high.displayValue + '°' : '';
    tiles.push(metricTile({ icon: '🌡️', label: 'อุณหภูมิ', value: (current ? current.displayValue + '°C' : range), detail: current ? range : '' }));
  }
  const rain = metricValue(snapshot, metrics, 'rain-probability');
  if (rain?.source) {
    const detail = rain.entry.detailFactId ? factText(snapshot, rain.entry.detailFactId) : '';
    tiles.push(metricTile({ icon: '🌧️', label: 'โอกาสฝนสูงสุด', value: rain.source.displayValue + '%', detail }));
  }
  const humidity = metricValue(snapshot, metrics, 'humidity')?.source;
  if (humidity) tiles.push(metricTile({ icon: '💧', label: 'ความชื้น', value: humidity.displayValue + '%' }));
  const wind = metricValue(snapshot, metrics, 'wind-speed')?.source;
  if (wind) tiles.push(metricTile({ icon: '💨', label: 'ลม', value: wind.displayValue + ' กม./ชม.' }));
  const condition = factText(snapshot, card.slots?.conditionFactId);
  if (!tiles.length && condition) tiles.push(metricTile({ icon: '🌤️', label: 'สภาพอากาศ', value: condition }));
  if (!tiles.length) return null;
  const contents = [];
  for (let index = 0; index < tiles.length; index += 2) {
    contents.push({ type: 'box', layout: 'horizontal', spacing: 'sm', contents: tiles.slice(index, index + 2) });
  }
  contents.push(textNode(card.microcopy || 'พยากรณ์นี้ไม่ได้ยืนยันว่ามีน้ำท่วม', { size: 'xs', color: TOKENS.text.secondary }));
  return weatherBubble({ heading: card.heading, severity: snapshot.severity, contents });
}
function renderWhyUnknown(card, snapshot) {
  const contents = [badge('unknown')];
  if (card.microcopy) contents.push(textNode(card.microcopy, { size: 'sm', weight: 'bold' }));
  const source = factText(snapshot, card.slots?.sourceNameFactId);
  if (source) contents.push(textNode('แหล่งข้อมูล: ' + source, { size: 'xs', color: TOKENS.text.secondary }));
  contents.push(chip(freshnessChip(snapshot), { backgroundColor: SEVERITY_TOKENS.unknown.band, color: SEVERITY_TOKENS.unknown.foreground }));
  const ctas = (card.slots?.ctaIds || []).filter((id) => id === 'cctv' || id === 'flood-source').map((id) => ({ id }));
  if (ctas.length) contents.push(ctaFooter(ctas, { severity: 'unknown', primaryId: 'cctv' }));
  return whyUnknownBubble({ heading: card.heading, severity: 'unknown', contents });
}
function renderSource(card, snapshot) {
  const contents = [];
  const metadata = [];
  const source = factText(snapshot, card.slots?.sourceNameFactId);
  const publisher = factText(snapshot, card.slots?.publisherFactId);
  const observed = fact(snapshot, card.slots?.observedAtFactId);
  const retrieved = fact(snapshot, card.slots?.retrievedAtFactId);
  if (source) metadata.push(textNode('แหล่ง · ' + source, { size: 'xs', color: TOKENS.text.secondary }));
  if (publisher && publisher !== source) metadata.push(textNode('ผู้เผยแพร่ · ' + publisher, { size: 'xs', color: TOKENS.text.secondary }));
  if (observed) metadata.push(textNode('เวลาสังเกต · ' + (formatThaiDateTime(observed.value) || observed.displayValue), { size: 'xs', color: TOKENS.text.secondary }));
  if (retrieved) metadata.push(textNode('เวลาดึงข้อมูล · ' + (formatThaiDateTime(retrieved.value) || retrieved.displayValue), { size: 'xs', color: TOKENS.text.secondary }));
  if (metadata.length) contents.push({ type: 'box', layout: 'vertical', paddingAll: 'sm', cornerRadius: 'md', backgroundColor: TOKENS.surface.base, contents: metadata });
  const ids = (card.slots?.ctaIds || []).filter((id) => id !== 'weather-radar' || snapshot.severity !== 'critical').map((id) => ({ id }));
  if (ids.length) contents.push(ctaFooter(ids, { severity: snapshot.severity, primaryId: snapshot.severity === 'critical' ? 'cctv' : undefined }));
  if (!contents.length) return null;
  return sourceBubble({ heading: card.heading, severity: snapshot.severity, contents });
}
function renderCard(card, snapshot) {
  if (card.role === 'hero' || card.role === 'uncertainty') return renderHero(card, snapshot);
  if (card.role === 'why_unknown') return renderWhyUnknown(card, snapshot);
  if (['stations', 'locations', 'impact'].includes(card.role)) return renderLocations(card, snapshot);
  if (card.role === 'actions') return renderActions(card, snapshot);
  if (card.role === 'weather') return renderWeather(card, snapshot);
  if (card.role === 'source') return renderSource(card, snapshot);
  return null;
}
function altText(snapshot) {
  const label = SEVERITY_TOKENS[snapshot.severity]?.label || SEVERITY_TOKENS.unknown.label;
  const state = fact(snapshot, 'flood.freshness.state')?.value || 'unknown';
  const freshness = state === 'stale' ? 'ข้อมูลเก่า' : state === 'fresh' ? 'ข้อมูลใหม่' : 'ยังไม่ทราบความสดใหม่';
  const action = snapshot.severity === 'critical'
    ? factText(snapshot, 'flood.action.0') || 'ติดตามประกาศจากหน่วยงานที่รับผิดชอบ'
    : snapshot.severity === 'unknown' ? 'ข้อมูลยังยืนยันไม่ได้' : '';
  const parts = ['น้ำ' + getPrimaryLocation(snapshot), label, trendChip(snapshot), freshness, action].filter(Boolean);
  return parts.join(' · ').slice(0, TOKENS.budget.maxAltTextCodePoints);
}
function buildFlexV2({ factsSnapshot, visualPlan } = {}) {
  if (!factsSnapshot || !visualPlan) throw new TypeError('buildFlexV2 requires FactsSnapshot and VisualPlan');
  const errors = validateVisualPlan(visualPlan, factsSnapshot);
  if (errors.length) throw new Error('Invalid VisualPlan: ' + errors.join('; '));
  const variant = getVariant(factsSnapshot.severity);
  const order = new Map(variant.roleOrder.map((role, index) => [role, index]));
  const cards = [...visualPlan.cards].sort((left, right) => {
    const leftRole = cardForRole(left);
    const rightRole = cardForRole(right);
    return (order.get(leftRole) ?? Number.MAX_SAFE_INTEGER) - (order.get(rightRole) ?? Number.MAX_SAFE_INTEGER);
  });
  const bubbles = cards.map((card) => renderCard(card, factsSnapshot)).filter(Boolean);
  if (!bubbles.length || bubbles[0].type !== 'bubble') throw new Error('Flex v2 did not produce a hero bubble');
  return { type: 'flex', altText: altText(factsSnapshot), contents: { type: 'carousel', contents: bubbles } };
}

module.exports = { buildFlexV2, formatThaiDateTime, stationRank };
