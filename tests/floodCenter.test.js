const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFloodCenterHtml } = require('../src/flood/phatthalungCenter');

const html = `
<ul>
<li>สถานีทดสอบ · คลองตัวอย่าง · ปกติ ต่ำกว่าตลิ่ง 2.5 ม. วัดเมื่อ 4 ต.ค. 05:00 · ผู้เผยแพร่</li>
<li>สถานีเฝ้าระวัง · คลองตัวอย่าง · ใกล้ล้นตลิ่ง ต่ำกว่าตลิ่ง 0.8 ม. วัดเมื่อ 4 ต.ค. 05:10 · ผู้เผยแพร่</li>
</ul>`;

test('flood center parser produces watch situation from station rows', () => {
  const result = parseFloodCenterHtml(html, {
    location:{name:'บ้านลำพาย',province:'พัทลุง'},
    retrievedAt:'2026-10-04T06:00:00+07:00',
    freshnessLimitMinutes:180
  });
  assert.equal(result.severity,'watch');
  assert.equal(result.stations.length,2);
  assert.equal(result.trend,'unknown');
  assert.equal(result.freshness.state,'fresh');
});

test('flood center parser fails closed when station rows are missing', () => {
  assert.throws(() => parseFloodCenterHtml('<html><body>ไม่มีข้อมูลสถานี</body></html>'), /did not contain recognizable station rows/);
});