const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeFloodSituation } = require('../src/flood/contract');
const { buildFactsSnapshot } = require('../src/presentation/facts');
const {
  EXPLAINER_LIBRARY_VERSION,
  REVIEW_STATUS,
  EXPLAINERS,
  getExplainer,
} = require('../src/presentation/explainers/th');
const { buildNarrationPlan, validateNarrationPlan } = require('../src/presentation/narrationPlan');
const { renderNarrationPlan } = require('../src/presentation/narrationRenderer');

function fixture(name) {
  return normalizeFloodSituation(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'flood', `${name}.json`), 'utf8')));
}
function snapshot(severity = 'watch', options = {}) {
  const floodSituation = { ...fixture(severity), ...options.floodSituation };
  return buildFactsSnapshot({
    floodSituation,
    location: floodSituation.location,
    dateInfo: { date: '4 ตุลาคม 2569' },
    weatherAnalysis: {
      current: { temperature: 28, humidity: 80, windSpeed: 9, description: { label: 'มีเมฆ' } },
      daily: { tempMin: 24, tempMax: 32, precipitationProbabilityMax: 65 },
    },
  });
}

test('builds a valid narration plan for five severity fixtures plus stale', () => {
  for (const state of ['normal', 'watch', 'affected', 'critical', 'unknown', 'stale']) {
    const facts = snapshot(state);
    const plan = buildNarrationPlan(facts);
    assert.deepEqual(validateNarrationPlan(plan, facts), [], state);
    assert.equal(plan.segments.length, 10, state);
  }
});

test('explainer library is versioned and every entry remains pending community review', () => {
  assert.match(EXPLAINER_LIBRARY_VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(REVIEW_STATUS, 'pending_community_review');
  assert.ok(EXPLAINERS.length >= 8);
  assert.ok(EXPLAINERS.every((entry) => entry.reviewStatus === REVIEW_STATUS && entry.text.trim()));
  assert.equal(getExplainer('not-a-real-explainer'), undefined);
  assert.ok(!EXPLAINERS.some((entry) => /https?:\/\//i.test(entry.text)));
});

test('distance-to-bank explainer appears only when structured water facts support it', () => {
  const noDistance = buildNarrationPlan(snapshot('normal'));
  assert.ok(!noDistance.segments[2].explainerIds.includes('water.distance-to-bank'));
  const withDistance = snapshot('watch', {
    floodSituation: { water: { ...fixture('watch').water, distanceToBankMeters: 0.42 } },
  });
  const plan = buildNarrationPlan(withDistance);
  assert.ok(plan.segments[2].explainerIds.includes('water.distance-to-bank'));
});

test('creates ten ordered segments with a 765-second target and bounded max duration', () => {
  const plan = buildNarrationPlan(snapshot('watch'));
  assert.deepEqual(plan.segments.map((segment) => segment.id), [
    's01-opening', 's02-flood-status', 's03-stations', 's04-trend-freshness',
    's05-area-road', 's06-weather', 's07-weather-context', 's08-actions',
    's09-recap', 's10-closing',
  ]);
  assert.equal(plan.segments.length, 10);
  assert.equal(plan.targetDurationSeconds, 765);
  assert.equal(plan.minimumDurationSeconds, 601);
  assert.equal(plan.maximumDurationSeconds, 1080);
  assert.equal(plan.segments.reduce((sum, segment) => sum + segment.targetSeconds, 0), 765);
  assert.deepEqual(validateNarrationPlan(plan, snapshot('watch')), []);
});

test('segment 5 is a verified impact report only when impact facts exist', () => {
  const affectedSnapshot = snapshot('affected');
  const affectedPlan = buildNarrationPlan(affectedSnapshot);
  assert.match(affectedPlan.segments[4].purpose, /พื้นที่|ถนน/);
  assert.ok(affectedPlan.segments[4].allowedFactIds.some((id) => id.startsWith('flood.affectedArea.') || id.startsWith('flood.road.')));

  const noImpact = snapshot('watch', { floodSituation: { affectedAreas: [], roads: [] } });
  const substitutePlan = buildNarrationPlan(noImpact);
  assert.match(substitutePlan.segments[4].purpose, /ตรวจสอบ|ยังไม่มีข้อมูล/);
  assert.ok(substitutePlan.segments[4].explainerIds.includes('source.checking-limits'));
  assert.ok(!substitutePlan.segments[4].allowedFactIds.some((id) => id.startsWith('flood.affectedArea.') || id.startsWith('flood.road.')));
});

test('segment fact IDs and explainer IDs are valid and remain state-consistent', () => {
  const plan = buildNarrationPlan(snapshot('critical'));
  assert.ok(plan.segments.every((segment) => segment.allowedFactIds.every((id) => plan.snapshotFactIds.includes(id))));
  assert.ok(plan.segments.every((segment) => segment.explainerIds.every((id) => getExplainer(id))));
  assert.equal(plan.severity, 'critical');
  const invalid = structuredClone(plan);
  invalid.segments[2].allowedFactIds.push('flood.station.99.name');
  assert.ok(validateNarrationPlan(invalid, snapshot('critical')).some((error) => error.includes('fact ID')));
});

test('validator rejects missing, duplicated, unordered, or overlong plans', () => {
  const facts = snapshot('normal');
  const missing = buildNarrationPlan(facts);
  missing.segments.pop();
  assert.ok(validateNarrationPlan(missing, facts).some((error) => error.includes('10 ordered')));
  const duplicate = buildNarrationPlan(facts);
  duplicate.segments[1].id = duplicate.segments[0].id;
  assert.ok(validateNarrationPlan(duplicate, facts).some((error) => error.includes('unique')));
  const overlong = buildNarrationPlan(facts);
  overlong.maximumDurationSeconds = 2000;
  assert.ok(validateNarrationPlan(overlong, facts).some((error) => error.includes('maximumDurationSeconds')));
  const changedAllocation = buildNarrationPlan(facts);
  changedAllocation.segments[0].targetSeconds += 1;
  changedAllocation.targetDurationSeconds += 1;
  assert.ok(validateNarrationPlan(changedAllocation, facts).some((error) => error.includes('targetSeconds must match')));
});

test('runtime renderer consumes the ten segments, explainers, and verified station facts', () => {
  const facts = snapshot('watch');
  const plan = buildNarrationPlan(facts);
  const narration = renderNarrationPlan(plan, facts);
  assert.equal(narration.sections.length, 10);
  assert.match(narration.sections[2].text, /ระดับน้ำ/);
  assert.match(narration.sections[0].text, /รายการนี้จะแยกสิ่งที่ข้อมูลต้นทางยืนยันได้/);
  assert.ok(narration.totalCharacters > 7000);
  assert.ok(new Set(narration.sections.map((section) => section.text)).size >= 9);
});
