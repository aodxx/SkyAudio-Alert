const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePriceFromText } = require('../src/market/phatthalungPrices');

test('market parser accepts an explicit baht/kg value', () => {
  assert.equal(parsePriceFromText('ราคาปาล์มน้ำมันประจำวันที่ 21 กันยายน 2569 ปาล์ม 6.20 บาท/กก.', 'palm'), 6.2);
});

test('market parser rejects unrelated numbers', () => {
  assert.equal(parsePriceFromText('ราคาปาล์มน้ำมันประจำวันที่ 21 กันยายน 2569 มีพื้นที่ 126,364 ไร่', 'palm'), null);
});

test('rubber parser accepts an explicit baht/kg value', () => {
  assert.equal(parsePriceFromText('ราคายางพาราประจำวันที่ 22 กันยายน 2569 น้ำยาง 58.25 บาท/กก.', 'rubber'), 58.25);
});
