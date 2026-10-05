const test = require('node:test');
const assert = require('node:assert/strict');
const { TOKENS, CTA_URLS, CTA_LABELS, CARD_IMAGE_URLS } = require('../src/flex/tokens');
const { textNode, ctaFooter } = require('../src/flex/components');
const { buildFlexV2 } = require('../src/flex/builder');
const { lintFlexMessage, collectUris } = require('../src/flex/lint');
const { createFlexInput } = require('./helpers/flexV2Fixtures');

test('Flex tokens are immutable and every CTA has a label and approved HTTPS destination', () => {
  assert.ok(Object.isFrozen(TOKENS));
  assert.deepEqual(Object.keys(CTA_URLS).sort(), Object.keys(CTA_LABELS).sort());
  assert.ok(Object.values(CTA_URLS).every((url) => url.startsWith('https://')));
  assert.equal(Object.keys(CARD_IMAGE_URLS).length, 3);
  assert.ok(Object.values(CARD_IMAGE_URLS).every((url) => url.startsWith('https://raw.githubusercontent.com/')));
});

test('simple text and CTA components return valid Flex nodes and discard unknown button IDs', () => {
  assert.deepEqual(textNode('พยากรณ์อากาศ', { size: 'md', weight: 'bold' }), {
    type: 'text', text: 'พยากรณ์อากาศ', size: 'md', weight: 'bold', color: TOKENS.text.primary, wrap: true,
  });
  const footer = ctaFooter([{ id: 'flood-source' }, { id: 'untrusted' }]);
  assert.equal(footer.type, 'box');
  assert.equal(footer.contents.length, 1);
  assert.equal(footer.contents[0].action.label, CTA_LABELS['flood-source']);
  assert.deepEqual(collectUris(footer), [CTA_URLS['flood-source']]);
});

test('all flood severities produce the same four-card message accepted by the structural lint', () => {
  for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
    const input = createFlexInput({ severity });
    const message = buildFlexV2(input);
    assert.equal(message.contents.contents.length, 4);
    assert.deepEqual(lintFlexMessage(message, { factsSnapshot: input.factsSnapshot }), [], severity);
  }
});

test('Flex linter fails closed before delivery for non-kilo bubbles and oversized text', () => {
  const input = createFlexInput({ severity: 'watch' });
  const message = buildFlexV2(input);
  const wrongSize = structuredClone(message);
  wrongSize.contents.contents[0].size = 'mega';
  assert.ok(lintFlexMessage(wrongSize).some((error) => error.includes('same size')));

  const longText = structuredClone(message);
  longText.contents.contents[0].body.contents[0].text = 'ก'.repeat(TOKENS.budget.maxTextNodeCodePoints + 1);
  assert.ok(lintFlexMessage(longText).some((error) => error.includes('text node')));
});
