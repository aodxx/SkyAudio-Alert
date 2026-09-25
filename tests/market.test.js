const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePriceFromText, parseOcrPrice } = require('../src/market/phatthalungPrices');

test('market parser accepts an explicit baht/kg value', () => {
  assert.equal(parsePriceFromText('ราคาปาล์มน้ำมันประจำวันที่ 21 กันยายน 2569 ปาล์ม 6.20 บาท/กก.', 'palm'), 6.2);
});

test('market parser rejects unrelated numbers', () => {
  assert.equal(parsePriceFromText('ราคาปาล์มน้ำมันประจำวันที่ 21 กันยายน 2569 มีพื้นที่ 126,364 ไร่', 'palm'), null);
});

test('rubber parser accepts an explicit baht/kg value', () => {
  assert.equal(parsePriceFromText('ราคายางพาราประจำวันที่ 22 กันยายน 2569 น้ำยาง 58.25 บาท/กก.', 'rubber'), 58.25);
});

test('OCR parser accepts a palm decimal in the palm-price range', () => {
  assert.equal(parseOcrPrice('Palm price 6.20 baht per kg', 'palm'), 6.2);
});

test('OCR parser accepts a rubber decimal in the rubber-price range', () => {
  assert.equal(parseOcrPrice('Rubber sheet 84.10 baht/kg', 'rubber'), 84.1);
});

test('OCR parser rejects a calendar date as a rubber price', () => {
  assert.equal(parseOcrPrice('25.09.2569', 'rubber'), null);
});
