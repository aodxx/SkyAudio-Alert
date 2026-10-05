const test = require('node:test');
const assert = require('node:assert/strict');
const { CARD_IMAGE_URLS, CTA_URLS } = require('../src/flex/tokens');
const { buildFlexV2 } = require('../src/flex/builder');
const { lintFlexMessage } = require('../src/flex/lint');
const { createFlexInput } = require('./helpers/flexV2Fixtures');

function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((child) => walk(child, visit));
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const key of ['contents', 'body', 'footer', 'header', 'hero']) {
    if (node[key]) walk(node[key], visit);
  }
}

function nodesOfType(node, type) {
  const nodes = [];
  walk(node, (item) => { if (item.type === type) nodes.push(item); });
  return nodes;
}

function textOf(node) {
  return nodesOfType(node, 'text').map((item) => item.text).join(' ');
}

function actionOf(card) {
  const buttons = nodesOfType(card.footer, 'button');
  assert.equal(buttons.length, 1, 'each card has one footer button');
  return buttons[0].action;
}

function render(options) {
  const input = createFlexInput(options);
  return { input, message: buildFlexV2(input) };
}

test('Flex contains the four requested cards, in order, with approved image and footer links', () => {
  const { input, message } = render({ severity: 'watch' });
  const cards = message.contents.contents;
  assert.equal(message.type, 'flex');
  assert.equal(message.contents.type, 'carousel');
  assert.equal(cards.length, 4);
  assert.ok(cards.every((card) => card.type === 'bubble' && card.size === 'kilo'));

  const cardImages = cards.map((card) => nodesOfType(card.body, 'image').map((image) => image.url));
  assert.deepEqual(cardImages, [
    [],
    [CARD_IMAGE_URLS.floodStatus],
    [CARD_IMAGE_URLS.waterMap],
    [CARD_IMAGE_URLS.cctv],
  ]);
  const imageNodes = cards.flatMap((card) => nodesOfType(card.body, 'image'));
  assert.equal(imageNodes.length, 3);
  assert.ok(imageNodes.every((image) => !Object.prototype.hasOwnProperty.call(image, 'alt')));
  assert.deepEqual(cards.map(actionOf).map(({ label, uri }) => ({ label, uri })), [
    { label: 'ศูนย์ช่วยเหลือพัทลุง', uri: CTA_URLS['flood-source'] },
    { label: 'แผนที่ระดับน้ำพัทลุง', uri: CTA_URLS['water-map'] },
    { label: 'พยากรณ์ / เรดาร์', uri: CTA_URLS['weather-radar'] },
    { label: 'ภาพสด / CCTV', uri: CTA_URLS.cctv },
  ]);
  assert.deepEqual(lintFlexMessage(message, { factsSnapshot: input.factsSnapshot }), []);
});

test('card 1 is an image-free weather summary with date, place, time bands and other weather facts', () => {
  const { message } = render({ severity: 'normal', weather: true });
  const first = message.contents.contents[0];
  const text = textOf(first.body);
  assert.equal(nodesOfType(first.body, 'image').length, 0);
  for (const phrase of [
    '4 ตุลาคม 2569',
    'ศาลาอเนกประสงค์ บ้านลำพาย',
    'พยากรณ์อากาศประจำวันนี้',
    '24', '32', '70%',
    'ช่วงเวลา', 'ช่วงเช้า', 'ช่วงบ่าย', 'ช่วงเย็น/ค่ำ', 'อื่นๆ',
  ]) assert.ok(text.includes(phrase), `first card includes ${phrase}`);
  assert.match(message.altText, /พยากรณ์อากาศพัทลุง/);
});

test('missing optional weather facts do not remove a card or create fabricated placeholders', () => {
  const { input, message } = render({ severity: 'unknown', weather: false });
  const cards = message.contents.contents;
  const firstText = textOf(cards[0]);
  assert.equal(cards.length, 4);
  assert.equal(nodesOfType(cards[0].body, 'image').length, 0);
  assert.match(firstText, /ยังไม่มีข้อมูลพยากรณ์/);
  assert.doesNotMatch(firstText, /undefined|null|NaN|--/i);
  assert.deepEqual(lintFlexMessage(message, { factsSnapshot: input.factsSnapshot }), []);
});

test('Flex linter rejects a changed card count, order, image URL, and missing per-card footer action', () => {
  const { message } = render({ severity: 'watch' });
  const fewerCards = structuredClone(message);
  fewerCards.contents.contents.pop();
  assert.ok(lintFlexMessage(fewerCards).some((error) => error.includes('exactly 4')));

  const wrongOrder = structuredClone(message);
  [wrongOrder.contents.contents[1], wrongOrder.contents.contents[2]] = [wrongOrder.contents.contents[2], wrongOrder.contents.contents[1]];
  assert.ok(lintFlexMessage(wrongOrder).some((error) => error.includes('card 2 image')));

  const unsafeImage = structuredClone(message);
  nodesOfType(unsafeImage.contents.contents[1], 'image')[0].url = 'https://attacker.example.invalid/image.jpg';
  assert.ok(lintFlexMessage(unsafeImage).some((error) => error.includes('image URL')));

  const noFooter = structuredClone(message);
  delete noFooter.contents.contents[3].footer;
  assert.ok(lintFlexMessage(noFooter).some((error) => error.includes('footer button')));
});

test('first card cannot gain an image even when all other card contracts stay valid', () => {
  const { message } = render({ severity: 'watch' });
  const changed = structuredClone(message);
  changed.contents.contents[0].body.contents.unshift({
    type: 'image', url: CARD_IMAGE_URLS.floodStatus, size: 'full', aspectRatio: '4:5', aspectMode: 'fit',
  });
  assert.ok(lintFlexMessage(changed).some((error) => error.includes('card 1 must not contain an image')));
});
