const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeFloodSituation, validateFloodSituation } = require('../src/flood/contract');

function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'flood', name), 'utf8'));
}

test('all flood severity fixtures normalize to valid FloodSituation contracts', () => {
  for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
    const situation = normalizeFloodSituation(fixture(`${severity}.json`), { freshnessLimitMinutes: 180, location: { name: 'บ้านลำพาย', province: 'พัทลุง' } });
    assert.equal(situation.severity, severity);
    assert.equal(situation.schemaVersion, '1.0');
    assert.equal(validateFloodSituation(situation).length, 0);
  }
});

test('stale fixture is explicitly stale and never silently becomes fresh', () => {
  const situation = normalizeFloodSituation(fixture('stale.json'), { freshnessLimitMinutes: 180 });
  assert.equal(situation.freshness.state, 'stale');
  assert.ok(situation.freshness.ageMinutes > 180);
});

test('unknown fixture keeps source uncertainty explicit', () => {
  const situation = normalizeFloodSituation(fixture('unknown.json'));
  assert.equal(situation.severity, 'unknown');
  assert.equal(situation.freshness.state, 'unknown');
  assert.match(situation.summary, /ยังยืนยัน/);
  assert.equal(validateFloodSituation(situation).length, 0);
});
