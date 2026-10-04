const { getAllowedFactIds, getFact } = require('./facts');
const { getExplainer } = require('./explainers/th');

const SEGMENT_SPECS = Object.freeze([
  { id: 's01-opening', purpose: 'ทักทายและบอกทางรายการ', targetSeconds: 45, explainerIds: ['opening.orientation'], tone: 'friendly' },
  { id: 's02-flood-status', purpose: 'สรุปสถานการณ์น้ำและความหมายของระดับ', targetSeconds: 90, explainerIds: [], tone: 'calm' },
  { id: 's03-stations', purpose: 'เล่าจุดและสถานีที่มีข้อมูลยืนยัน', targetSeconds: 120, explainerIds: ['water.distance-to-bank'], tone: 'calm' },
  { id: 's04-trend-freshness', purpose: 'อธิบายแนวโน้มและความใหม่ของข้อมูล', targetSeconds: 75, explainerIds: [], tone: 'calm' },
  { id: 's05-area-road', purpose: 'รายงานพื้นที่หรือถนนที่ข้อมูลต้นทางยืนยัน', targetSeconds: 60, explainerIds: [], tone: 'calm' },
  { id: 's06-weather', purpose: 'รายงานสภาพอากาศที่เกี่ยวข้อง', targetSeconds: 90, explainerIds: [], tone: 'calm' },
  { id: 's07-weather-context', purpose: 'อธิบายความต่างระหว่างพยากรณ์ฝนกับสถานการณ์น้ำจริง', targetSeconds: 75, explainerIds: ['weather.rain-is-not-flood-proof'], tone: 'calm' },
  { id: 's08-actions', purpose: 'สรุปสิ่งที่ควรติดตามจากข้อมูลและคำอธิบายทั่วไป', targetSeconds: 105, explainerIds: ['preparedness.general'], tone: 'calm' },
  { id: 's09-recap', purpose: 'ทวนประเด็นสำคัญโดยไม่เพิ่มข้อเท็จจริง', targetSeconds: 60, explainerIds: ['recap.focus'], tone: 'calm' },
  { id: 's10-closing', purpose: 'ปิดรายการ', targetSeconds: 45, explainerIds: ['closing.next-update'], tone: 'friendly' },
]);
const EXPECTED_SEGMENT_IDS = Object.freeze(SEGMENT_SPECS.map((segment) => segment.id));
const SEVERITIES = Object.freeze(['normal', 'watch', 'affected', 'critical', 'unknown']);
const BASE_FACTS = Object.freeze(['flood.severity', 'flood.summary', 'flood.location.name', 'date.label']);
const TARGET_DURATION_SECONDS = SEGMENT_SPECS.reduce((sum, segment) => sum + segment.targetSeconds, 0);
const MINIMUM_DURATION_SECONDS = 601;
const MAXIMUM_DURATION_SECONDS = 1080;

function idsWithPrefix(snapshot, prefixes) {
  const prefixesArray = Array.isArray(prefixes) ? prefixes : [prefixes];
  return getAllowedFactIds(snapshot).filter((id) => prefixesArray.some((prefix) => id.startsWith(prefix)));
}
function includeExisting(snapshot, ids) {
  const available = new Set(getAllowedFactIds(snapshot));
  return [...new Set(ids)].filter((id) => available.has(id));
}
function severityExplainerId(severity) {
  return `severity.${SEVERITIES.includes(severity) ? severity : 'unknown'}`;
}
function unique(values) {
  return [...new Set(values)];
}

function buildNarrationPlan(snapshot) {
  const severity = SEVERITIES.includes(snapshot?.severity) ? snapshot.severity : 'unknown';
  const impactIds = idsWithPrefix(snapshot, ['flood.affectedArea.', 'flood.road.']);
  const stationIds = idsWithPrefix(snapshot, 'flood.station.');
  const weatherIds = idsWithPrefix(snapshot, ['weather.current.', 'weather.daily.']);
  const actionIds = idsWithPrefix(snapshot, 'flood.action.');
  const sourceIds = idsWithPrefix(snapshot, ['flood.source.name', 'flood.source.publisher', 'flood.freshness.']);
  const hasBankDistance = Boolean(
    getFact(snapshot, 'flood.water.distanceToBankMeters')
    || getFact(snapshot, 'flood.water.level')?.unit?.includes('ตลิ่ง')
    || getAllowedFactIds(snapshot).some((id) => /^flood\.station\.\d+\.distanceToBankMeters$/.test(id)),
  );
  const recordsById = {
    's01-opening': [...BASE_FACTS.filter((id) => id !== 'flood.summary')],
    's02-flood-status': ['flood.severity', 'flood.summary'],
    's03-stations': stationIds.length ? stationIds : idsWithPrefix(snapshot, ['flood.water.', 'flood.summary']),
    's04-trend-freshness': ['flood.trend', 'flood.freshness.state', 'flood.freshness.ageMinutes', 'flood.observedAt', 'flood.retrievedAt'],
    's05-area-road': impactIds.length ? impactIds : sourceIds,
    's06-weather': weatherIds,
    's07-weather-context': idsWithPrefix(snapshot, ['weather.daily.rainProbabilityMax', 'weather.current.precipitation']),
    's08-actions': actionIds.length ? actionIds : ['flood.severity'],
    's09-recap': ['flood.severity', 'flood.trend', 'flood.freshness.state', ...actionIds.slice(0, 2)],
    's10-closing': ['date.label', 'flood.location.name'],
  };

  const segments = SEGMENT_SPECS.map((spec, index) => {
    const isImpactSubstitute = index === 4 && impactIds.length === 0;
    const isImpactSegment = index === 4 && impactIds.length > 0;
    const segmentExplainers = spec.explainerIds.filter((id) => id !== 'water.distance-to-bank' || hasBankDistance);
    if (index === 1) segmentExplainers.push(severityExplainerId(severity));
    if (index === 7) segmentExplainers.push(severityExplainerId(severity));
    if (isImpactSubstitute) segmentExplainers.push('source.checking-limits');
    const allowedFactIds = includeExisting(snapshot, recordsById[spec.id]);
    return {
      id: spec.id,
      purpose: isImpactSubstitute ? 'ข้อมูลยังไม่ระบุพื้นที่หรือถนนที่ได้รับผลกระทบ จึงอธิบายวิธีตรวจสอบแหล่งข้อมูล' : spec.purpose,
      allowedFactIds,
      explainerIds: unique(segmentExplainers),
      targetSeconds: spec.targetSeconds,
      tone: severity === 'critical' && ['s02-flood-status', 's08-actions'].includes(spec.id) ? 'urgent' : spec.tone,
      ...(isImpactSegment ? { conditional: 'has_verified_impact_facts' } : isImpactSubstitute ? { conditional: 'no_verified_impact_facts' } : {}),
    };
  });

  return {
    schemaVersion: '1.0',
    severity,
    targetDurationSeconds: TARGET_DURATION_SECONDS,
    minimumDurationSeconds: MINIMUM_DURATION_SECONDS,
    maximumDurationSeconds: MAXIMUM_DURATION_SECONDS,
    snapshotFactIds: getAllowedFactIds(snapshot),
    segments,
  };
}

function validateNarrationPlan(plan, snapshot) {
  const errors = [];
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return ['NarrationPlan must be an object'];
  if (plan.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (!SEVERITIES.includes(plan.severity)) errors.push('severity is invalid');
  if (snapshot?.severity && plan.severity !== snapshot.severity) errors.push('severity does not match FactsSnapshot');
  if (!Array.isArray(plan.segments) || plan.segments.length !== 10 || plan.segments.some((segment, index) => segment?.id !== EXPECTED_SEGMENT_IDS[index])) {
    errors.push('NarrationPlan must contain 10 ordered segments');
  }
  if (Array.isArray(plan.segments)) {
    const ids = plan.segments.map((segment) => segment?.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) errors.push('segment IDs must be unique');
    const snapshotFactIds = getAllowedFactIds(snapshot);
    const allowedFactIds = new Set(snapshotFactIds);
    for (const [index, segment] of plan.segments.entries()) {
      const spec = SEGMENT_SPECS[index];
      if (!spec) continue;
      if (segment?.targetSeconds !== spec.targetSeconds) errors.push(`segment ${segment?.id || '?'} targetSeconds must match segment specification`);
      if (typeof segment?.purpose !== 'string' || !segment.purpose.trim()) errors.push(`segment ${segment?.id || '?'} purpose is required`);
      if (!Array.isArray(segment?.allowedFactIds) || new Set(segment.allowedFactIds).size !== segment.allowedFactIds.length) errors.push(`segment ${segment?.id || '?'} allowedFactIds must be a unique array`);
      if (!Array.isArray(segment?.explainerIds) || new Set(segment.explainerIds).size !== segment.explainerIds.length) errors.push(`segment ${segment?.id || '?'} explainerIds must be a unique array`);
      const expectedTone = plan.severity === 'critical' && ['s02-flood-status', 's08-actions'].includes(spec.id) ? 'urgent' : spec.tone;
      if (segment?.tone !== expectedTone) errors.push(`segment ${segment?.id || '?'} tone does not match severity policy`);
      if (!Number.isInteger(segment?.targetSeconds) || segment.targetSeconds <= 0) errors.push(`segment ${segment?.id || '?'} targetSeconds must be a positive integer`);
      if (!['calm', 'friendly', 'urgent'].includes(segment?.tone)) errors.push(`segment ${segment?.id || '?'} tone is invalid`);
      for (const factId of segment?.allowedFactIds || []) {
        if (!allowedFactIds.has(factId)) errors.push(`segment ${segment?.id || '?'} has unknown fact ID ${factId}`);
      }
      for (const explainerId of segment?.explainerIds || []) {
        if (!getExplainer(explainerId)) errors.push(`segment ${segment?.id || '?'} has unknown explainer ID ${explainerId}`);
      }
    }
    const impactFactIds = snapshotFactIds.filter((id) => id.startsWith('flood.affectedArea.') || id.startsWith('flood.road.'));
    const impactSegment = plan.segments[4];
    if (impactFactIds.length) {
      if (impactSegment?.conditional !== 'has_verified_impact_facts' || !impactFactIds.every((id) => impactSegment.allowedFactIds?.includes(id))) {
        errors.push('segment 5 must be limited to verified impact facts');
      }
    } else if (impactSegment?.conditional !== 'no_verified_impact_facts' || !impactSegment.explainerIds?.includes('source.checking-limits')) {
      errors.push('segment 5 must use the source-checking substitute when impact facts are absent');
    }
  }
  const targetSeconds = Array.isArray(plan.segments) ? plan.segments.reduce((sum, segment) => sum + (Number.isInteger(segment?.targetSeconds) ? segment.targetSeconds : 0), 0) : 0;
  if (plan.targetDurationSeconds !== TARGET_DURATION_SECONDS || plan.targetDurationSeconds !== targetSeconds || targetSeconds <= 600) errors.push(`targetDurationSeconds must match segment specifications (${TARGET_DURATION_SECONDS}) and exceed 600 seconds`);
  if (plan.minimumDurationSeconds !== MINIMUM_DURATION_SECONDS) errors.push(`minimumDurationSeconds must equal ${MINIMUM_DURATION_SECONDS}`);
  if (plan.maximumDurationSeconds !== MAXIMUM_DURATION_SECONDS || plan.maximumDurationSeconds < targetSeconds) errors.push(`maximumDurationSeconds must contain the target and equal ${MAXIMUM_DURATION_SECONDS}`);
  const expectedFactIds = getAllowedFactIds(snapshot);
  if (!Array.isArray(plan.snapshotFactIds) || new Set(plan.snapshotFactIds).size !== plan.snapshotFactIds.length || plan.snapshotFactIds.length !== expectedFactIds.length || expectedFactIds.some((id) => !plan.snapshotFactIds.includes(id))) {
    errors.push('snapshotFactIds must match the FactsSnapshot');
  }
  return [...new Set(errors)];
}

module.exports = { SEGMENT_SPECS, buildNarrationPlan, validateNarrationPlan };
