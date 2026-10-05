const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFlexV2 } = require('../src/flex/builder');
const { validateAudio } = require('../src/audio/validate');
const { CTA_URLS, CARD_IMAGE_URLS } = require('../src/flex/tokens');
const { createFlexInput } = require('./helpers/flexV2Fixtures');

for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
  test(`Flex v2 LINE acceptance: ${severity} retains all four cards`, () => {
    const message = buildFlexV2(createFlexInput({ severity }));
    assert.equal(message.type, 'flex');
    assert.equal(message.contents.type, 'carousel');
    assert.equal(message.contents.contents.length, 4);
    assert.deepEqual(message.contents.contents.map((card) => card.size), ['kilo', 'kilo', 'kilo', 'kilo']);
    assert.match(message.altText, /พยากรณ์อากาศพัทลุง/);
    assert.deepEqual(message.contents.contents.slice(1).map((card) => card.body.contents[0].url), [
      CARD_IMAGE_URLS.floodStatus, CARD_IMAGE_URLS.waterMap, CARD_IMAGE_URLS.cctv,
    ]);
    assert.deepEqual(message.contents.contents.map((card) => card.footer.contents[0].action.uri), [
      CTA_URLS['flood-source'], CTA_URLS['water-map'], CTA_URLS['weather-radar'], CTA_URLS.cctv,
    ]);
  });
}

test('first card remains text-only and begins with the daily forecast rather than a severity hero', () => {
  const message = buildFlexV2(createFlexInput({ severity: 'critical' }));
  const first = message.contents.contents[0];
  assert.equal(first.body.contents.some((node) => node.type === 'image'), false);
  assert.match(JSON.stringify(first.body), /พยากรณ์อากาศประจำวันนี้/);
  assert.match(JSON.stringify(first.footer), /ศูนย์ช่วยเหลือพัทลุง/);
});

test('audio validator remains available for the later long-form audio phase', () => {
  assert.equal(typeof validateAudio, 'function');
});
