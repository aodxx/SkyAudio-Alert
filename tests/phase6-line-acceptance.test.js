const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFlexV2 } = require('../src/flex/builder');
const { validateAudio } = require('../src/audio/validate');
const { createFlexInput } = require('./helpers/flexV2Fixtures');

for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
  test('Flex v2 LINE acceptance: ' + severity, () => {
    const message = buildFlexV2(createFlexInput({ severity }));
    assert.equal(message.type, 'flex');
    assert.equal(message.contents.type, 'carousel');
    assert.ok(message.contents.contents.length >= 2);
    assert.match(message.altText, /น้ำบ้านลำพาย/);
  });
}

test('critical first card is immediately understandable', () => {
  const message = buildFlexV2(createFlexInput({ severity: 'critical' }));
  assert.match(JSON.stringify(message.contents.contents[0]), /ทำทันที/);
});

test('unknown first card is explicitly uncertainty-labeled', () => {
  const message = buildFlexV2(createFlexInput({ severity: 'unknown' }));
  assert.match(JSON.stringify(message.contents.contents[0]), /ยังยืนยันไม่ได้/);
});

test('audio validator remains available for the later long-form audio phase', () => {
  assert.equal(typeof validateAudio, 'function');
});
