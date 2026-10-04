const { SEVERITY_LABELS, getAllowedFactIds, getFact } = require('./facts');

const CARD_ROLES = Object.freeze(['hero', 'uncertainty', 'why_unknown', 'stations', 'impact', 'locations', 'actions', 'weather', 'source']);
const CTA_IDS = Object.freeze(['cctv', 'flood-source', 'weather-radar']);
const MAX_CARDS = 5;
const MAX_HEADING_CODE_POINTS = 40;
const MAX_MICROCOPY_CODE_POINTS = 80;

function factIdsWithPrefix(snapshot, prefix) {
  return getAllowedFactIds(snapshot).filter((id) => id.startsWith(prefix));
}
function factRef(snapshot, id) {
  return getFact(snapshot, id) ? { factId: id } : undefined;
}
function refsForRoot(snapshot, root, fieldNames) {
  const refs = {};
  for (const field of fieldNames) {
    const id = `${root}.${field}`;
    if (getFact(snapshot, id)) refs[`${field}FactId`] = id;
  }
  return refs;
}
function stationSlots(snapshot) {
  const indexes = [...new Set(factIdsWithPrefix(snapshot, 'flood.station.').map((id) => id.match(/^flood\.station\.(\d+)\./)?.[1]).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
  return indexes.map((index) => ({
    ...refsForRoot(snapshot, `flood.station.${index}`, ['name', 'waterway', 'label', 'distanceToBankMeters', 'trend', 'observedAt']),
  })).filter((station) => station.nameFactId);
}
function metricSlots(snapshot) {
  const candidates = [
    ['temperature', 'weather.current.temperature'],
    ['temperature-low', 'weather.daily.tempMin'],
    ['temperature-high', 'weather.daily.tempMax'],
    ['humidity', 'weather.current.humidity'],
    ['wind-speed', 'weather.current.windSpeed'],
  ];
  const periods = ['morning', 'afternoon', 'evening'].map((period) => ({
    period,
    valueFactId: `weather.rainWindows.${period}.maxProbability`,
    detailFactId: `weather.rainWindows.${period}.label`,
  })).filter((period) => getFact(snapshot, period.valueFactId) && getFact(snapshot, period.detailFactId));
  if (periods.length) {
    periods.sort((left, right) => getFact(snapshot, right.valueFactId).value - getFact(snapshot, left.valueFactId).value);
    candidates.push(['rain-probability', periods[0].valueFactId, periods[0].detailFactId]);
  } else {
    candidates.push(['rain-probability', 'weather.daily.rainProbabilityMax']);
  }
  return candidates.filter(([, factId]) => getFact(snapshot, factId)).map(([id, valueFactId, detailFactId]) => ({
    id, valueFactId, ...(detailFactId ? { detailFactId } : {}),
  }));
}
function makeCard(id, role, heading, slots = {}, microcopy = '') {
  return { id, role, heading, slots, microcopy };
}
function buildVisualPlan(snapshot) {
  const severity = Object.hasOwn(SEVERITY_LABELS, snapshot?.severity) ? snapshot.severity : 'unknown';
  const known = new Set(getAllowedFactIds(snapshot));
  const cards = [];
  const heroActionIds = severity === 'critical' && known.has('flood.action.0') ? ['flood.action.0'] : [];
  const heroSlots = {
    badge: { factId: 'flood.severity', variant: severity },
    trend: factRef(snapshot, 'flood.trend'),
    freshness: factRef(snapshot, 'flood.freshness.state'),
    summary: factRef(snapshot, 'flood.summary'),
    actionFactIds: heroActionIds,
  };
  const isUnknown = severity === 'unknown';
  const heroMicrocopy = isUnknown
    ? 'ยังยืนยันไม่ได้ — อย่าเพิ่งสรุปว่าปลอดภัยหรือท่วม'
    : severity === 'critical'
      ? 'ติดตามประกาศจากหน่วยงานที่รับผิดชอบ'
      : '';
  cards.push(makeCard('hero', isUnknown ? 'uncertainty' : 'hero', 'สถานการณ์น้ำ', heroSlots, heroMicrocopy));

  const stations = stationSlots(snapshot);
  const areaFactIds = factIdsWithPrefix(snapshot, 'flood.affectedArea.');
  const roadFactIds = factIdsWithPrefix(snapshot, 'flood.road.');
  if (stations.length || areaFactIds.length || roadFactIds.length) {
    const role = stations.length && (areaFactIds.length || roadFactIds.length) ? 'locations'
      : stations.length ? 'stations' : 'impact';
    cards.push(makeCard(role, role, role === 'stations' ? 'จุดเฝ้าระวัง' : 'พื้นที่และเส้นทาง', {
      stations,
      impact: { areaFactIds, roadFactIds },
    }));
  }

  const actionFactIds = factIdsWithPrefix(snapshot, 'flood.action.');
  if (actionFactIds.length && severity !== 'unknown') {
    cards.push(makeCard('actions', 'actions', 'สิ่งที่ควรทำ', { actionFactIds }));
  }

  const metrics = metricSlots(snapshot);
  const conditionFactId = known.has('weather.current.condition') ? 'weather.current.condition' : undefined;
  if (metrics.length || conditionFactId) {
    cards.push(makeCard('weather', 'weather', 'อากาศวันนี้', {
      metrics,
      ...(conditionFactId ? { conditionFactId } : {}),
    }, 'พยากรณ์อากาศไม่ใช่หลักฐานยืนยันน้ำท่วม'));
  }

  if (isUnknown) {
    cards.push(makeCard('why-unknown', 'why_unknown', 'ตรวจสอบข้อมูลต้นทาง', {
      sourceNameFactId: known.has('flood.source.name') ? 'flood.source.name' : undefined,
      publisherFactId: known.has('flood.source.publisher') ? 'flood.source.publisher' : undefined,
      freshnessFactId: 'flood.freshness.state',
      ctaIds: ['flood-source', 'cctv'],
    }, 'ข้อมูลยังยืนยันไม่ได้'));
  }

  cards.push(makeCard('source', 'source', 'แหล่งข้อมูลและเวลาอัปเดต', {
    sourceNameFactId: known.has('flood.source.name') ? 'flood.source.name' : undefined,
    publisherFactId: known.has('flood.source.publisher') ? 'flood.source.publisher' : undefined,
    observedAtFactId: known.has('flood.observedAt') ? 'flood.observedAt' : undefined,
    retrievedAtFactId: known.has('flood.retrievedAt') ? 'flood.retrievedAt' : undefined,
    ctaIds: ['flood-source', 'cctv', ...(metrics.length ? ['weather-radar'] : [])],
  }));

  return { schemaVersion: '1.0', severity, cards };
}

function collectFactReferences(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectFactReferences(item, output);
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (/FactId$/i.test(key) && typeof nested === 'string') output.push(nested);
      else if (/FactIds$/i.test(key) && Array.isArray(nested)) output.push(...nested.filter((item) => typeof item === 'string'));
      else collectFactReferences(nested, output);
    }
  }
  return output;
}
function codePointLength(value) {
  return Array.from(String(value ?? '')).length;
}
const SLOT_KEYS_BY_ROLE = Object.freeze({
  hero: ['badge', 'trend', 'freshness', 'summary', 'actionFactIds'],
  uncertainty: ['badge', 'trend', 'freshness', 'summary', 'actionFactIds'],
  why_unknown: ['sourceNameFactId', 'publisherFactId', 'freshnessFactId', 'ctaIds'],
  stations: ['stations', 'impact'],
  impact: ['stations', 'impact'],
  locations: ['stations', 'impact'],
  actions: ['actionFactIds'],
  weather: ['metrics', 'conditionFactId'],
  source: ['sourceNameFactId', 'publisherFactId', 'observedAtFactId', 'retrievedAtFactId', 'ctaIds'],
});
const STATION_SLOT_KEYS = Object.freeze(['nameFactId', 'waterwayFactId', 'labelFactId', 'distanceToBankMetersFactId', 'trendFactId', 'observedAtFactId']);
const METRIC_SLOT_IDS = Object.freeze(['temperature', 'temperature-low', 'temperature-high', 'rain-probability', 'humidity', 'wind-speed']);

function hasOnlyKeys(value, allowedKeys) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every((key) => allowedKeys.includes(key)));
}
function validateSlotShape(card) {
  const errors = [];
  const slots = card.slots;
  const allowed = SLOT_KEYS_BY_ROLE[card.role] || [];
  for (const key of Object.keys(slots || {})) {
    if (!allowed.includes(key)) errors.push(`card ${card.id || '?'} has unknown slot ${key}`);
  }
  if (slots?.badge !== undefined && !hasOnlyKeys(slots.badge, ['factId', 'variant'])) errors.push(`card ${card.id || '?'} badge slot is not typed`);
  for (const key of ['trend', 'freshness', 'summary']) {
    if (slots?.[key] !== undefined && !hasOnlyKeys(slots[key], ['factId'])) errors.push(`card ${card.id || '?'} ${key} slot is not typed`);
  }
  if (slots?.stations !== undefined) {
    if (!Array.isArray(slots.stations)) errors.push(`card ${card.id || '?'} stations slot must be an array`);
    else for (const station of slots.stations) {
      if (!hasOnlyKeys(station, STATION_SLOT_KEYS)) errors.push(`card ${card.id || '?'} station slot is not typed`);
    }
  }
  if (slots?.impact !== undefined) {
    if (!hasOnlyKeys(slots.impact, ['areaFactIds', 'roadFactIds'])) errors.push(`card ${card.id || '?'} impact slot is not typed`);
    else for (const key of ['areaFactIds', 'roadFactIds']) {
      if (slots.impact[key] !== undefined && (!Array.isArray(slots.impact[key]) || slots.impact[key].some((id) => typeof id !== 'string'))) {
        errors.push(`card ${card.id || '?'} ${key} must be an array of fact IDs`);
      }
    }
  }
  if (slots?.metrics !== undefined) {
    if (!Array.isArray(slots.metrics)) errors.push(`card ${card.id || '?'} metrics slot must be an array`);
    else for (const metric of slots.metrics) {
      if (!hasOnlyKeys(metric, ['id', 'valueFactId', 'detailFactId']) || !METRIC_SLOT_IDS.includes(metric.id)) errors.push(`card ${card.id || '?'} metric slot is not typed`);
      if (metric?.detailFactId !== undefined && typeof metric.detailFactId !== 'string') errors.push(`card ${card.id || '?'} metric detailFactId must be a fact ID`);
    }
  }
  if (slots?.actionFactIds !== undefined && (!Array.isArray(slots.actionFactIds) || slots.actionFactIds.some((id) => typeof id !== 'string'))) {
    errors.push(`card ${card.id || '?'} actionFactIds must be an array of fact IDs`);
  }
  if (slots?.ctaIds !== undefined && (!Array.isArray(slots.ctaIds) || slots.ctaIds.some((id) => typeof id !== 'string'))) {
    errors.push(`card ${card.id || '?'} ctaIds must be an array`);
  }
  for (const key of ['sourceNameFactId', 'publisherFactId', 'freshnessFactId', 'observedAtFactId', 'retrievedAtFactId', 'conditionFactId']) {
    if (slots?.[key] !== undefined && typeof slots[key] !== 'string') errors.push(`card ${card.id || '?'} ${key} must be a fact ID`);
  }
  return errors;
}

function validateVisualPlan(plan, snapshot) {
  const errors = [];
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return ['VisualPlan must be an object'];
  if (plan.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (!Object.hasOwn(SEVERITY_LABELS, plan.severity)) errors.push('severity is invalid');
  if (snapshot?.severity && plan.severity !== snapshot.severity) errors.push('severity does not match FactsSnapshot');
  if (!Array.isArray(plan.cards) || plan.cards.length < 1 || plan.cards.length > MAX_CARDS) errors.push(`cards must contain at least 1 and at most ${MAX_CARDS} items`);
  if (!Array.isArray(plan.cards)) return errors;

  const ids = plan.cards.map((card) => card?.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) errors.push('card IDs must be unique');
  const availableFactIds = new Set(getAllowedFactIds(snapshot));
  for (const card of plan.cards) {
    if (!card || typeof card !== 'object') {
      errors.push('each card must be an object');
      continue;
    }
    if (!CARD_ROLES.includes(card.role)) errors.push(`card ${card.id || '?'} role is invalid`);
    if (!String(card.heading || '').trim()) errors.push(`card ${card.id || '?'} heading is required`);
    if (codePointLength(card.heading) > MAX_HEADING_CODE_POINTS) errors.push(`card ${card.id || '?'} heading exceeds ${MAX_HEADING_CODE_POINTS} characters`);
    if (codePointLength(card.microcopy) > MAX_MICROCOPY_CODE_POINTS) errors.push(`card ${card.id || '?'} microcopy exceeds ${MAX_MICROCOPY_CODE_POINTS} characters`);
    if (!card.slots || typeof card.slots !== 'object' || Array.isArray(card.slots)) errors.push(`card ${card.id || '?'} slots must be an object`);
    errors.push(...validateSlotShape(card));
    for (const factId of collectFactReferences(card.slots)) {
      if (!availableFactIds.has(factId)) errors.push(`card ${card.id || '?'} has unknown fact ID ${factId}`);
    }
    for (const ctaId of card.slots?.ctaIds || []) {
      if (!CTA_IDS.includes(ctaId)) errors.push(`card ${card.id || '?'} has unknown CTA ID ${ctaId}`);
    }
  }

  const hero = plan.cards[0];
  if (!hero || hero.id !== 'hero') errors.push('first card must be hero');
  if (plan.severity === 'unknown') {
    if (hero?.role !== 'uncertainty') errors.push('unknown hero must use uncertainty role');
    if (hero?.slots?.badge?.variant === 'normal') errors.push('unknown must not use normal severity visual token');
    if (!/ยังยืนยันไม่ได้/.test(hero?.microcopy || '')) errors.push('unknown hero must disclose uncertainty');
    if (!plan.cards.some((card) => card.role === 'why_unknown')) errors.push('unknown plan needs a why_unknown card');
  } else if (hero?.role !== 'hero') {
    errors.push('known severity hero must use hero role');
  }
  if (hero?.slots?.badge?.variant !== plan.severity) errors.push('hero badge variant must match verified severity');
  if (hero && hero.slots?.badge?.factId !== 'flood.severity') errors.push('hero badge must reference flood.severity');
  return [...new Set(errors)];
}

module.exports = {
  CARD_ROLES,
  CTA_IDS,
  MAX_CARDS,
  MAX_HEADING_CODE_POINTS,
  MAX_MICROCOPY_CODE_POINTS,
  buildVisualPlan,
  validateVisualPlan,
};
