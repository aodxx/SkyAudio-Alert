const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFlex } = require('../src/flex/builder');

function data(severity) {
  return {
    location: { name: 'บ้านลำพาย', district: 'ต.โคกชะงาย', province: 'พัทลุง' },
    flood: {
      severity,
      summary: severity === 'unknown' ? 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้' : 'สถานการณ์น้ำ: ' + severity,
      freshness: { state: severity === 'unknown' ? 'unknown' : 'fresh' },
      stations: [{ name: 'สถานีตัวอย่าง', label: 'ปกติ' }],
      affectedAreas: [{ name: 'พื้นที่ตัวอย่าง' }],
      roads: [{ name: 'ถนนตัวอย่าง' }],
    },
    current: { icon: '🌦️', conditionLabel: 'มีเมฆบางส่วน', temperature: 28, windSpeed: 10 },
    daily: { precipitationProbabilityMax: 40 },
    report: { shortSummary: 'สรุปสถานการณ์น้ำจากข้อมูลที่ยืนยันได้' },
  };
}

for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
  test('renders ' + severity + ' as a carousel', () => {
    const flex = buildFlex(data(severity));
    assert.equal(flex.contents.type, 'carousel');
    assert.ok(flex.contents.contents.length >= 2);
    assert.match(flex.altText, /รายงานสถานการณ์น้ำ/);
  });
}

test('critical card exposes action immediately', () => {
  const flex = buildFlex(data('critical'));
  const text = JSON.stringify(flex.contents.contents[0]);
  assert.match(text, /ติดตามประกาศ/);
});

test('unknown card makes uncertainty explicit', () => {
  const flex = buildFlex(data('unknown'));
  const text = JSON.stringify(flex.contents.contents[0]);
  assert.match(text, /ยังสรุปเหตุการณ์น้ำจริงไม่ได้/);
});

test('planner cards are supported without changing verified severity', () => {
  const d = data('watch');
  d.presentationPlan = {
    schemaVersion: '1.0',
    severity: 'watch',
    cards: [
      { id: 'hero', role: 'hero', title: 'เฝ้าระวัง', body: 'ติดตามสถานการณ์น้ำต่อเนื่อง', items: [] },
      { id: 'weather', role: 'weather', title: 'อากาศ', body: 'มีฝนได้', items: [] },
    ],
  };
  const flex = buildFlex(d);
  assert.equal(flex.contents.contents.length, 2);
  assert.match(JSON.stringify(flex.contents.contents[0]), /เฝ้าระวัง/);
});
