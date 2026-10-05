const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFlexV2 } = require('../src/flex/builder');
const { lintFlexMessage } = require('../src/flex/lint');
const { createFlexInput } = require('./helpers/flexV2Fixtures');

test('Flex linter rejects any non-bubble item in the four-card carousel', () => {
  const message = buildFlexV2(createFlexInput({ severity: 'watch' }));
  message.contents.contents.push({ type: 'box', layout: 'vertical', contents: [] });
  assert.ok(lintFlexMessage(message).some((error) => error.includes('exactly 4 bubbles')));
});

test('Flex linter rejects a duplicate CTA button outside the card footer', () => {
  const message = buildFlexV2(createFlexInput({ severity: 'watch' }));
  const firstCard = message.contents.contents[0];
  firstCard.body.contents.push(structuredClone(firstCard.footer.contents[0]));
  assert.ok(lintFlexMessage(message).some((error) => error.includes('exactly one button')));
});

test('Flex linter rejects an image hidden in the first card hero', () => {
  const message = buildFlexV2(createFlexInput({ severity: 'watch' }));
  message.contents.contents[0].hero = {
    type: 'box', layout: 'vertical', contents: [{
      type: 'image',
      url: 'https://raw.githubusercontent.com/aodxx/SkyAudio-Alert/main/2_20261005_193645_0003.jpg',
      size: 'full', aspectRatio: '4:5', aspectMode: 'fit',
    }],
  };
  assert.ok(lintFlexMessage(message).some((error) => error.includes('card 1 must not contain an image')));
});

test('Flex linter rejects the unsupported alt field on an image component', () => {
  const message = buildFlexV2(createFlexInput({ severity: 'watch' }));
  message.contents.contents[1].body.contents[0].alt = 'ภาพระดับน้ำ';
  assert.ok(lintFlexMessage(message).some((error) => error.includes('unsupported alt field')));
});
