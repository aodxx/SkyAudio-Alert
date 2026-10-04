const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildFlexV2 } = require('../src/flex/builder');
const { createFlexInput } = require('./helpers/flexV2Fixtures');

for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
  test('golden Flex snapshot: ' + severity, () => {
    const actual = buildFlexV2(createFlexInput({ severity }));
    const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'snapshots', 'flex-v2', `${severity}.json`), 'utf8'));
    assert.deepEqual(actual, expected);
  });
}

test('golden Flex snapshot: stale watch', () => {
  const actual = buildFlexV2(createFlexInput({ severity: 'watch', stale: true }));
  const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'snapshots', 'flex-v2', 'watch-stale.json'), 'utf8'));
  assert.deepEqual(actual, expected);
});
