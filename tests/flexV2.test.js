const test = require('node:test');
const assert = require('node:assert/strict');
const { TOKENS, SEVERITY_TOKENS, CTA_URLS } = require('../src/flex/tokens');
const {
  badge, chip, stationStatusScale, stationRow, metricTile, actionRow, ctaFooter, heroBubble,
  stationsBubble, locationsBubble, impactBubble, actionsBubble, weatherBubble, sourceBubble, whyUnknownBubble,
} = require('../src/flex/components');
const { buildFlexV2 } = require('../src/flex/builder');
const { lintFlexMessage } = require('../src/flex/lint');
const { createFlexInput } = require('./helpers/flexV2Fixtures');

function contrastRatio(foreground, background) {
  function luminance(hex) {
    const channels = hex.replace('#', '').match(/.{2}/g).map((part) => parseInt(part, 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function flatten(node, output = []) {
  if (Array.isArray(node)) node.forEach((child) => flatten(child, output));
  else if (node && typeof node === 'object') {
    output.push(node);
    if (node.contents) flatten(node.contents, output);
    if (node.body) flatten(node.body, output);
  }
  return output;
}

test('tokens define a visible icon, text label, and palette for every severity', () => {
  for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
    assert.ok(SEVERITY_TOKENS[severity].label);
    assert.ok(SEVERITY_TOKENS[severity].icon);
    assert.ok(SEVERITY_TOKENS[severity].foreground);
    assert.ok(SEVERITY_TOKENS[severity].band);
  }
  assert.ok(Object.isFrozen(TOKENS));
});

test('normal text and critical inverse text meet WCAG AA contrast', () => {
  for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
    assert.ok(contrastRatio(SEVERITY_TOKENS[severity].foreground, SEVERITY_TOKENS[severity].band) >= 4.5, severity);
  }
  assert.ok(contrastRatio(TOKENS.text.inverse, SEVERITY_TOKENS.critical.header) >= 4.5);
});

test('typed presentation components return LINE Flex objects', () => {
  assert.equal(badge('watch').type, 'box');
  assert.equal(chip('อัปเดตแล้ว').type, 'box');
  const station = stationRow({ name: 'สถานีตัวอย่าง', waterway: 'คลองตัวอย่าง', label: 'ปกติ', distance: 'ต่ำกว่าตลิ่ง 1 เมตร', trend: 'ทรงตัว' });
  assert.equal(station.type, 'box');
  assert.ok(JSON.stringify(station).includes('ใกล้ล้นตลิ่ง'));
  assert.ok(JSON.stringify(station).includes('ล้นตลิ่ง'));
  const nearScale = stationStatusScale('ใกล้ล้นตลิ่ง');
  assert.equal(nearScale.contents.filter((item) => item.backgroundColor !== '#F1F5F9').length, 1);
  assert.equal(nearScale.contents[2].backgroundColor, SEVERITY_TOKENS.affected.band);
  const overflowScale = stationStatusScale('ล้นตลิ่ง');
  assert.equal(overflowScale.contents.filter((item) => item.backgroundColor !== '#F1F5F9').length, 1);
  assert.equal(overflowScale.contents[3].backgroundColor, SEVERITY_TOKENS.critical.band);
  assert.equal(metricTile({ icon: '🌧️', label: 'ฝน', value: '65%', detail: 'ช่วงเช้า' }).type, 'box');
  assert.equal(actionRow('ติดตามระดับน้ำ').type, 'box');
  assert.equal(ctaFooter([{ id: 'cctv' }]).type, 'box');
  for (const bubble of [heroBubble({ contents: [] }), stationsBubble({ heading: 'สถานี' }), locationsBubble({ heading: 'พื้นที่' }),
    impactBubble({ heading: 'ผลกระทบ' }), actionsBubble({ heading: 'คำแนะนำ' }), weatherBubble({ heading: 'อากาศ' }),
    sourceBubble({ heading: 'แหล่งข้อมูล' }), whyUnknownBubble({ heading: 'ข้อจำกัด' })]) {
    assert.equal(bubble.type, 'bubble');
  }
});

test('CTA components only produce the three allow-listed URI actions', () => {
  const rendered = ctaFooter([{ id: 'cctv' }, { id: 'flood-source' }, { id: 'weather-radar' }, { id: 'attacker' }]);
  const urls = flatten(rendered).filter((node) => node.action?.type === 'uri').map((node) => node.action.uri);
  assert.deepEqual(urls.sort(), Object.values(CTA_URLS).sort());
});

test('critical immediate-action strip renders as a single concise text node', () => {
  const nodes = flatten(actionRow('ติดตามประกาศ', { severity: 'critical', label: 'ทำทันที' }))
    .filter((node) => node.type === 'text');
  assert.equal(nodes.length, 1);
  assert.match(nodes[0].text, /ทำทันที: ติดตามประกาศ/);
});

test('Flex lint passes all five states and stale data without changing severity', () => {
  for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
    const input = createFlexInput({ severity });
    const message = buildFlexV2(input);
    assert.deepEqual(lintFlexMessage(message, { factsSnapshot: input.factsSnapshot }), [], severity);
  }
  const stale = createFlexInput({ severity: 'watch', stale: true });
  assert.deepEqual(lintFlexMessage(buildFlexV2(stale), { factsSnapshot: stale.factsSnapshot }), []);
});

test('Flex lint rejects duplicate structures, non-allow-listed URLs, long text, and oversized payloads', () => {
  const input = createFlexInput({ severity: 'watch' });
  const base = buildFlexV2(input);
  const duplicate = structuredClone(base);
  duplicate.contents.contents.push(structuredClone(duplicate.contents.contents[0]));
  assert.ok(lintFlexMessage(duplicate).some((error) => error.includes('duplicate card structure')));

  const unsafe = structuredClone(base);
  const uri = flatten(unsafe).find((node) => node.action?.type === 'uri');
  uri.action.uri = 'https://attacker.example.invalid/';
  assert.ok(lintFlexMessage(unsafe).some((error) => error.includes('CTA URI')));

  const longText = structuredClone(base);
  flatten(longText).find((node) => node.type === 'text').text = 'ก'.repeat(TOKENS.budget.maxTextNodeCodePoints + 1);
  assert.ok(lintFlexMessage(longText).some((error) => error.includes('text node')));

  const large = structuredClone(base);
  large.altText = 'ก'.repeat(TOKENS.budget.maxAltTextCodePoints + 1);
  assert.ok(lintFlexMessage(large).some((error) => error.includes('altText')));

  const hugePayload = structuredClone(base);
  hugePayload.extra = 'x'.repeat(TOKENS.budget.maxPayloadBytes);
  assert.ok(lintFlexMessage(hugePayload).some((error) => error.includes('payload exceeds byte budget')));

  const hugeCard = structuredClone(base);
  for (let i = 0; i < 11; i += 1) hugeCard.contents.contents[0].body.contents.push({ type: 'text', text: 'ก'.repeat(TOKENS.budget.maxTextNodeCodePoints) });
  assert.ok(lintFlexMessage(hugeCard).some((error) => error.includes('per-card text budget')));
});

test('Flex lint rejects wrong carousel size, missing visuals, and a NORMAL visual on unknown', () => {
  const input = createFlexInput({ severity: 'unknown' });
  const base = buildFlexV2(input);
  const wrongSize = structuredClone(base);
  wrongSize.contents.contents[1].size = 'mega';
  assert.ok(lintFlexMessage(wrongSize).some((error) => error.includes('same size')));

  const withoutVisual = structuredClone(base);
  withoutVisual.contents.contents[0].body.contents = withoutVisual.contents.contents[0].body.contents.filter((node) => node.type === 'text');
  assert.ok(lintFlexMessage(withoutVisual).some((error) => error.includes('visual block')));

  const falseNormal = structuredClone(base);
  falseNormal.contents.contents[0].body.contents.push({ type: 'text', text: '✅ ปกติ', color: SEVERITY_TOKENS.normal.foreground });
  assert.ok(lintFlexMessage(falseNormal, { factsSnapshot: input.factsSnapshot }).some((error) => error.includes('unknown')));
});
