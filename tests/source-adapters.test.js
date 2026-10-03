const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFloodCenterHtml } = require('../src/flood/phatthalungCenter');
const { parseWeatherPageHtml } = require('../src/weather/phatthalungPage');

// Keep representative source HTML with the tests so local and CI runs do not
// depend on untracked files in /tmp or on a live website being available.
const floodHtml = `
  <html><body><ul>
    <li>ใกล้ล้นตลิ่ง น้ำตกโตนแพรทอง · คลองลำสิน ต่ำกว่าตลิ่ง 0.42 ม. ทรงตัว วัดเมื่อ 3 ต.ค. 23:00 · ศูนย์ข้อมูลน้ำ</li>
    <li>น้ำมาก สะพานข้ามคลองบางม่วง · ทะเลหลวง ต่ำกว่าตลิ่ง 0.94 ม. ทรงตัว วัดเมื่อ 3 ต.ค. 23:00 · ศูนย์ข้อมูลน้ำ</li>
    <li>ปกติ สถานีบ้านควน · คลองบ้านควน ต่ำกว่าตลิ่ง 1.20 ม. กำลังลด วัดเมื่อ 3 ต.ค. 23:00 · ศูนย์ข้อมูลน้ำ</li>
    <li>ปกติ สถานีบ้านนา · คลองบ้านนา ต่ำกว่าตลิ่ง 1.45 ม. ทรงตัว วัดเมื่อ 3 ต.ค. 23:00 · ศูนย์ข้อมูลน้ำ</li>
    <li>ปกติ สถานีปากพะยูน · คลองปากพะยูน ต่ำกว่าตลิ่ง 1.70 ม. ทรงตัว วัดเมื่อ 3 ต.ค. 23:00 · ศูนย์ข้อมูลน้ำ</li>
    <li>ปกติ สถานีควนขนุน · คลองควนขนุน ต่ำกว่าตลิ่ง 1.10 ม. ทรงตัว วัดเมื่อ 3 ต.ค. 23:00 · ศูนย์ข้อมูลน้ำ</li>
  </ul></body></html>
`;

const weatherHtml = `
  <html><body>
    <section>วันนี้ ฝนฟ้าคะนอง 2 มม. · 100% ลมตะวันตก</section>
    <section>พรุ่งนี้ มีเมฆบางส่วน 0 มม. · 10% ลมตะวันออก</section>
    <section>มะรืนนี้ ฝนเล็กน้อย 1 มม. · 30% ลมใต้</section>
  </body></html>
`;

test('Phatthalung flood adapter parses server-rendered station rows', () => {
  const situation = parseFloodCenterHtml(floodHtml, {
    retrievedAt: '2026-10-03T17:00:00Z',
    freshnessLimitMinutes: 180,
    location: { name: 'บ้านลำพาย', province: 'พัทลุง' },
  });
  assert.equal(situation.location.name, 'บ้านลำพาย');
  assert.ok(situation.stations.length >= 5);
  assert.ok(['normal', 'watch', 'affected'].includes(situation.severity));
  assert.ok(situation.stations.some((station) => station.name.includes('คลองบางม่วง')));
  assert.equal(situation.source.url, 'https://chachoengsao-flood.vercel.app/phatthalung');
});

test('Phatthalung flood adapter fails closed when page shape has no station rows', () => {
  assert.throws(() => parseFloodCenterHtml('<html><body>ข้อมูลไม่พร้อม</body></html>'), /recognizable station rows/);
});

test('Phatthalung weather page adapter parses daily rain snapshots and attribution', () => {
  const snapshot = parseWeatherPageHtml(weatherHtml, { retrievedAt: '2026-10-03T17:00:00Z' });
  assert.equal(snapshot.source.url, 'https://chachoengsao-flood.vercel.app/phatthalung/weather');
  assert.equal(snapshot.source.publisher, 'Open-Meteo via Phatthalung weather page');
  assert.equal(snapshot.daily.length, 3);
  assert.equal(snapshot.daily[0].precipitationMm, 2);
  assert.equal(snapshot.daily[0].precipitationProbability, 100);
});
