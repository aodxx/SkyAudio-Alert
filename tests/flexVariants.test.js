const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFlexV2 } = require('../src/flex/builder');
const { SEVERITY_TOKENS } = require('../src/flex/tokens');
const { createFlexInput } = require('./helpers/flexV2Fixtures');

function texts(node) {
  const output = [];
  if (Array.isArray(node)) node.forEach((child) => output.push(...texts(child)));
  else if (node && typeof node === 'object') {
    if (node.type === 'text') output.push(node.text);
    if (node.contents) output.push(...texts(node.contents));
    if (node.body) output.push(...texts(node.body));
  }
  return output;
}

for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
  test('Flex v2 renders ' + severity + ' as a fact-backed carousel', () => {
    const input = createFlexInput({ severity });
    const message = buildFlexV2(input);
    assert.equal(message.type, 'flex');
    assert.equal(message.contents.type, 'carousel');
    assert.ok(message.contents.contents.length >= 2);
    assert.ok(texts(message.contents.contents[0]).some((text) => text.includes(SEVERITY_TOKENS[severity].label)));
    assert.match(message.altText, /น้ำบ้านลำพาย/);
  });
}

test('critical has immediate action and CCTV in hero, then action detail before station/impact', () => {
  const message = buildFlexV2(createFlexInput({ severity: 'critical' }));
  const cards = message.contents.contents;
  assert.match(JSON.stringify(cards[0]), /ทำทันที/);
  assert.match(JSON.stringify(cards[0]), /cctv\.maholan\.net/);
  assert.match(texts(cards[1]).join(' '), /ติดตามข้อมูลจากศูนย์ข้อมูลน้ำ/);
  assert.equal(cards[0].size, cards[1].size);
});

test('unknown stays explicitly uncertain and never receives NORMAL visual tokens', () => {
  const message = buildFlexV2(createFlexInput({ severity: 'unknown', weather: false }));
  const hero = message.contents.contents[0];
  const serialized = JSON.stringify(hero);
  assert.match(serialized, /ยังยืนยันไม่ได้/);
  assert.doesNotMatch(serialized, /✅|#CCFBF1/);
});

test('stale freshness is visible without changing source severity', () => {
  const input = createFlexInput({ severity: 'watch', stale: true });
  const message = buildFlexV2(input);
  assert.equal(input.factsSnapshot.severity, 'watch');
  assert.match(JSON.stringify(message.contents.contents[0]), /ข้อมูลล่าสุด/);
  assert.match(JSON.stringify(message.contents.contents[0]), /อาจไม่เป็นปัจจุบัน/);
});

test('missing stations/weather omit their cards and do not add placeholder tiles', () => {
  const message = buildFlexV2(createFlexInput({ severity: 'watch', stationVariant: 'none', weather: false }));
  const serialized = JSON.stringify(message.contents.contents);
  assert.doesNotMatch(serialized, /จุดเฝ้าระวัง|อากาศวันนี้|--|ไม่ทราบสภาพอากาศ/);
});
