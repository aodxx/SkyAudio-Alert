const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeFloodSituation } = require('../src/flood/contract');
const { buildFactsSnapshot } = require('../src/presentation/facts');
const { buildVisualPlan, validateVisualPlan } = require('../src/presentation/visualPlan');

function fixture(name) {
  return normalizeFloodSituation(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'flood', `${name}.json`), 'utf8')));
}
function snapshot(severity = 'watch', options = {}) {
  const floodSituation = { ...fixture(severity), ...options.floodSituation };
  return buildFactsSnapshot({
    floodSituation,
    location: floodSituation.location,
    weatherAnalysis: options.weatherAnalysis === undefined ? {
      current: { temperature: 28, humidity: 80, windSpeed: 9, description: { label: 'มีเมฆ' } },
      daily: { tempMin: 24, tempMax: 32, precipitationProbabilityMax: 65 },
    } : options.weatherAnalysis,
  });
}

 test('builds valid fact-backed cards for all five severity states', () => {
  for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
    const facts = snapshot(severity);
    const plan = buildVisualPlan(facts);
    assert.deepEqual(validateVisualPlan(plan, facts), []);
    assert.equal(plan.severity, severity);
    assert.equal(plan.cards[0].id, 'hero');
    assert.ok(plan.cards.length <= 5);
    assert.ok(plan.cards.every((card) => card.heading && card.slots));
  }
});

test('unknown has an explicit uncertainty hero and never a normal visual variant', () => {
  const facts = snapshot('unknown');
  const plan = buildVisualPlan(facts);
  assert.equal(plan.cards[0].role, 'uncertainty');
  assert.equal(plan.cards[0].slots.badge.variant, 'unknown');
  assert.notEqual(plan.cards[0].slots.badge.variant, 'normal');
  assert.ok(plan.cards.some((card) => card.role === 'why_unknown'));
  assert.match(plan.cards[0].microcopy, /ยังยืนยันไม่ได้/);
});

test('critical hero references an immediate source action and stale does not change severity', () => {
  const criticalFacts = snapshot('critical');
  const criticalPlan = buildVisualPlan(criticalFacts);
  assert.ok(criticalPlan.cards[0].slots.actionFactIds.length > 0);
  const staleFacts = snapshot('stale');
  const stalePlan = buildVisualPlan(staleFacts);
  assert.equal(stalePlan.severity, 'watch');
  assert.equal(stalePlan.cards[0].slots.badge.variant, 'watch');
  assert.equal(stalePlan.cards[0].slots.freshness.factId, 'flood.freshness.state');
});

test('groups stations and impact locations into typed slots without inventing facts', () => {
  const facts = snapshot('affected', {
    floodSituation: {
      stations: [{ name: 'สถานีตัวอย่าง', waterway: 'คลองตัวอย่าง', label: 'เฝ้าระวัง', distanceToBankMeters: 0.4, trend: 'rising' }],
      affectedAreas: ['พื้นที่ตัวอย่าง'], roads: ['ถนนตัวอย่าง'],
    },
  });
  const plan = buildVisualPlan(facts);
  const locations = plan.cards.find((card) => card.role === 'locations');
  assert.ok(locations);
  assert.equal(locations.slots.stations[0].nameFactId, 'flood.station.0.name');
  assert.deepEqual(locations.slots.impact.areaFactIds, ['flood.affectedArea.0']);
  assert.deepEqual(locations.slots.impact.roadFactIds, ['flood.road.0']);
  assert.ok(validateVisualPlan(plan, facts).length === 0);
});

test('omits absent weather and station cards instead of adding placeholders', () => {
  const facts = snapshot('normal', { weatherAnalysis: { current: {}, daily: {} } });
  const plan = buildVisualPlan(facts);
  assert.ok(!plan.cards.some((card) => card.role === 'weather'));
  assert.ok(!plan.cards.some((card) => card.role === 'stations' || card.role === 'locations'));
  assert.ok(validateVisualPlan(plan, facts).length === 0);
});

test('validator rejects unknown fact references, duplicates, wrong severity, and over-budget nodes', () => {
  const facts = snapshot('watch');
  const invalidRef = buildVisualPlan(facts);
  invalidRef.cards[0].slots.summary.factId = 'flood.station.99.name';
  assert.ok(validateVisualPlan(invalidRef, facts).some((error) => error.includes('fact ID')));
  const duplicate = buildVisualPlan(facts);
  duplicate.cards[1].id = duplicate.cards[0].id;
  assert.ok(validateVisualPlan(duplicate, facts).some((error) => error.includes('unique')));
  const wrongSeverity = buildVisualPlan(facts);
  wrongSeverity.severity = 'critical';
  assert.ok(validateVisualPlan(wrongSeverity, facts).some((error) => error.includes('severity')));
  const wrongBadge = buildVisualPlan(facts);
  wrongBadge.cards[0].slots.badge.variant = 'critical';
  assert.ok(validateVisualPlan(wrongBadge, facts).some((error) => error.includes('badge variant')));
  const tooLong = buildVisualPlan(facts);
  tooLong.cards[0].heading = 'ก'.repeat(41);
  assert.ok(validateVisualPlan(tooLong, facts).some((error) => error.includes('heading')));
  const tooMany = buildVisualPlan(facts);
  tooMany.cards.push({ id: 'extra', role: 'source', heading: 'เพิ่มเติม', slots: {}, microcopy: '' });
  assert.ok(validateVisualPlan(tooMany, facts).some((error) => error.includes('at most 5')));
  const unsourcedText = buildVisualPlan(facts);
  unsourcedText.cards[0].slots.forgedStationName = 'สถานีที่ไม่มีในข้อมูล';
  assert.ok(validateVisualPlan(unsourcedText, facts).some((error) => error.includes('unknown slot')));
});
