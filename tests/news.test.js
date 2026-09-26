const test = require('node:test');
const assert = require('node:assert/strict');
const { extractHeadlines, isUsefulHeadline, normalizeTitle } = require('../src/news/phatthalungNews');

test('news parser keeps official detail links and strips markup', () => {
  const html = '<a href="/th/content/category/detail/id/9/iid/123"> ข่าวประชาสัมพันธ์จังหวัดพัทลุง: น้ำต้องถึงคน เกษตรต้องรอด </a>';
  const items = extractHeadlines(html, 2);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'น้ำต้องถึงคน เกษตรต้องรอด');
  assert.match(items[0].url, /iid\/123$/);
});

test('news parser ignores non-article links', () => {
  const html = '<a href="/th/page/item/index/id/12">ข่าวสารทั่วไปที่ไม่ใช่บทความ</a>';
  assert.deepEqual(extractHeadlines(html), []);
});

test('news title filter excludes weather reposts and keeps useful community information', () => {
  assert.equal(isUsefulHeadline('พยากรณ์อากาศประจำวันที่ 26 กันยายน 2569'), false);
  assert.equal(isUsefulHeadline('จังหวัดพัทลุงเร่งซ่อมแซมแหล่งน้ำเพื่อการเกษตร'), true);
});

test('title normalization collapses whitespace', () => {
  assert.equal(normalizeTitle(' ข่าวประชาสัมพันธ์   น้ำต้องถึงคน '), 'น้ำต้องถึงคน');
});
