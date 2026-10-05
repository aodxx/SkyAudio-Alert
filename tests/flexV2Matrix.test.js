const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFlexV2 } = require('../src/flex/builder');
const { lintFlexMessage } = require('../src/flex/lint');
const { CARD_IMAGE_URLS, CTA_URLS } = require('../src/flex/tokens');
const { createFlexInput } = require('./helpers/flexV2Fixtures');

const states = ['normal', 'watch', 'affected', 'critical', 'unknown'];
const freshness = [false, true];
const stationVariants = ['none', 'one', 'three-plus', 'long-name'];
const weatherVariants = [false, true];
const EXPECTED_IMAGES = [null, CARD_IMAGE_URLS.floodStatus, CARD_IMAGE_URLS.waterMap, CARD_IMAGE_URLS.cctv];
const EXPECTED_CTAS = [CTA_URLS['flood-source'], CTA_URLS['water-map'], CTA_URLS['weather-radar'], CTA_URLS.cctv];

function descendants(node, visit) {
  if (Array.isArray(node)) return node.forEach((child) => descendants(child, visit));
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const key of ['contents', 'body', 'footer']) if (node[key]) descendants(node[key], visit);
}

test('80-case Flex acceptance matrix preserves four exact cards across state × freshness × stations × weather', () => {
  let cases = 0;
  for (const severity of states) for (const stale of freshness) for (const stationVariant of stationVariants) for (const weather of weatherVariants) {
    const input = createFlexInput({ severity, stale, stationVariant, weather });
    const message = buildFlexV2(input);
    const cards = message.contents.contents;
    const errors = lintFlexMessage(message, { factsSnapshot: input.factsSnapshot });
    assert.deepEqual(errors, [], JSON.stringify({ severity, stale, stationVariant, weather, errors }));
    assert.equal(message.altText.startsWith('พยากรณ์อากาศพัทลุง'), true);
    assert.equal(cards.length, 4);
    assert.deepEqual(cards.map((card) => {
      const images = [];
      descendants(card.body, (node) => { if (node.type === 'image') images.push(node.url); });
      return images[0] || null;
    }), EXPECTED_IMAGES);
    assert.deepEqual(cards.map((card) => card.footer.contents[0].action.uri), EXPECTED_CTAS);
    if (!weather) assert.match(JSON.stringify(cards[0]), /ยังไม่มีข้อมูลพยากรณ์/);
    if (stationVariant === 'none') assert.ok(!JSON.stringify(cards).includes('คลอง1'));
    cases += 1;
  }
  assert.equal(cases, 80);
});
