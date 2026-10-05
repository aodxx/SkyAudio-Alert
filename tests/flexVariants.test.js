const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFlexV2 } = require('../src/flex/builder');
const { CARD_IMAGE_URLS, CTA_URLS } = require('../src/flex/tokens');
const { createFlexInput } = require('./helpers/flexV2Fixtures');

function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((child) => walk(child, visit));
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const key of ['contents', 'body', 'footer']) if (node[key]) walk(node[key], visit);
}
function nodes(node, type) {
  const result = [];
  walk(node, (item) => { if (item.type === type) result.push(item); });
  return result;
}
function texts(node) {
  return nodes(node, 'text').map((item) => item.text);
}

for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
  test(`Flex state ${severity} keeps the same four-card carousel`, () => {
    const message = buildFlexV2(createFlexInput({ severity }));
    const cards = message.contents.contents;
    assert.equal(cards.length, 4);
    assert.deepEqual(cards.map((card) => nodes(card.body, 'image').map((image) => image.url)), [
      [], [CARD_IMAGE_URLS.floodStatus], [CARD_IMAGE_URLS.waterMap], [CARD_IMAGE_URLS.cctv],
    ]);
    assert.deepEqual(cards.map((card) => nodes(card.footer, 'button')[0].action.uri), [
      CTA_URLS['flood-source'], CTA_URLS['water-map'], CTA_URLS['weather-radar'], CTA_URLS.cctv,
    ]);
    assert.ok(texts(cards[0]).includes('พยากรณ์อากาศประจำวันนี้'));
    assert.match(message.altText, /พยากรณ์อากาศพัทลุง/);
  });
}

test('stale or critical flood status does not replace the requested weather-first card content', () => {
  for (const options of [{ severity: 'critical' }, { severity: 'watch', stale: true }]) {
    const message = buildFlexV2(createFlexInput(options));
    assert.ok(texts(message.contents.contents[0]).includes('พยากรณ์อากาศประจำวันนี้'));
    assert.equal(message.contents.contents.length, 4);
  }
});

test('missing weather facts remain explicit and do not remove fixed image cards', () => {
  const message = buildFlexV2(createFlexInput({ severity: 'unknown', stationVariant: 'none', weather: false }));
  assert.match(texts(message.contents.contents[0]).join(' '), /ยังไม่มีข้อมูลพยากรณ์/);
  assert.equal(message.contents.contents.length, 4);
  for (const bubble of message.contents.contents) {
    const cardText = texts(bubble.body).join('');
    assert.ok(Array.from(cardText).length <= 1200);
    assert.doesNotMatch(cardText, /undefined|null|NaN|--/i);
  }
});
