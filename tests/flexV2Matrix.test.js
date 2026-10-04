const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFlexV2 } = require('../src/flex/builder');
const { lintFlexMessage } = require('../src/flex/lint');
const { createFlexInput } = require('./helpers/flexV2Fixtures');

const states = ['normal', 'watch', 'affected', 'critical', 'unknown'];
const freshness = [false, true];
const stationVariants = ['none', 'one', 'three-plus', 'long-name'];
const weatherVariants = [false, true];

test('80-case Flex acceptance matrix covers state × freshness × station variant × weather presence', () => {
  let cases = 0;
  for (const severity of states) for (const stale of freshness) for (const stationVariant of stationVariants) for (const weather of weatherVariants) {
    const input = createFlexInput({ severity, stale, stationVariant, weather });
    const message = buildFlexV2(input);
    const errors = lintFlexMessage(message, { factsSnapshot: input.factsSnapshot });
    assert.deepEqual(errors, [], JSON.stringify({ severity, stale, stationVariant, weather, errors }));
    assert.ok(message.altText.startsWith('น้ำบ้านลำพาย'));
    assert.ok(message.contents.contents.length >= 2 && message.contents.contents.length <= 12);
    if (!weather) assert.ok(!JSON.stringify(message.contents.contents).includes('อากาศวันนี้'));
    if (stationVariant === 'none') assert.ok(!JSON.stringify(message.contents.contents).includes('คลอง1'));
    cases += 1;
  }
  assert.equal(cases, 80);
});
