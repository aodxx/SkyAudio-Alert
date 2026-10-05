const test = require('node:test');
const assert = require('node:assert/strict');
const { validateGeneratedFacts, extractNumbers } = require('../src/content/safetyFirewall');

function plan(severity = 'watch', spoken = 'มีสถานการณ์น้ำที่ควรติดตาม') {
  return {
    severity,
    factsUsed: ['flood.severity'],
    spokenText: spoken,
    actions: ['ติดตามระดับน้ำล่าสุด'],
    cards: [
      { role: 'hero', title: 'สถานการณ์น้ำ: ' + severity, body: spoken },
      { role: 'source', title: 'แหล่งข้อมูล', body: 'ตรวจสอบข้อมูลล่าสุด' },
    ],
  };
}
function facts(severity = 'watch') {
  return {
    date: '4 ตุลาคม 2569',
    floodSituation: {
      severity,
      stations: [{ name: 'สถานีคลองลำปำ', label: 'ใกล้ล้นตลิ่ง', level: 1.2 }],
      affectedAreas: [], roads: [], freshness: { state: 'fresh' }, summary: 'ควรเฝ้าระวัง',
    },
  };
}

test('rejects unsupported certainty', () => assert.ok(validateGeneratedFacts(plan('watch', 'ปลอดภัยแน่นอนครับ'), facts()).some((error) => error.includes('certainty'))));
test('rejects severity drift', () => assert.ok(validateGeneratedFacts(plan('critical'), facts('watch')).some((error) => error.includes('severity'))));
test('rejects generated numeric facts not in source', () => assert.ok(validateGeneratedFacts(plan('watch', 'ระดับน้ำ 999 เมตร'), facts()).some((error) => error.includes('numeric'))));
test('rejects Thai-word numeric facts not in source', () => assert.ok(validateGeneratedFacts(plan('watch', 'ระดับน้ำสิบห้าเซนติเมตร'), facts()).some((error) => error.includes('numeric'))));
test('rejects an invented station name', () => assert.ok(validateGeneratedFacts(plan('watch', 'สถานีคลองปลอมมีข้อมูลใหม่'), facts()).some((error) => error.includes('station'))));
test('rejects an invented road name', () => assert.ok(validateGeneratedFacts(plan('watch', 'ถนนสายปลอมมีน้ำขัง'), facts()).some((error) => error.includes('road'))));
test('rejects an invented event', () => assert.ok(validateGeneratedFacts(plan('watch', 'เกิดดินถล่มในพื้นที่แล้ว'), facts()).some((error) => error.includes('event'))));
test('normalizes numeric formatting and Thai digits', () => assert.deepEqual(extractNumbers('วันที่ ๔/๑๐/๒๕๖๙ ระดับน้ำ 1.20 เมตร'), ['4', '10', '2569', '1.2']));
test('accepts date numbers supplied as verified context', () => assert.equal(validateGeneratedFacts(plan('watch', 'วันนี้ ๔ ตุลาคม ๒๕๖๙ ระดับน้ำ 1.20 เมตร'), facts()).length, 0));
test('rejects market/news leakage', () => assert.ok(validateGeneratedFacts(plan('watch', 'ราคาปาล์มวันนี้สูงขึ้น'), facts()).some((error) => error.includes('market/news'))));
test('rejects forecast-only flood claim', () => {
  const input = facts('unknown');
  input.floodSituation.stations = [];
  assert.ok(validateGeneratedFacts(plan('unknown', 'ฝนจะทำให้น้ำท่วมบ้านลำพาย'), input, { forecastOnly: true }).some((error) => error.includes('forecast-only')));
});
test('requires factsUsed', () => {
  const input = plan(); input.factsUsed = [];
  assert.ok(validateGeneratedFacts(input, facts()).some((error) => error.includes('factsUsed')));
});
for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
  test('regression: ' + severity, () => {
    const presentation = plan(severity, 'รายงานสถานการณ์น้ำ ' + severity + ' '.repeat(30));
    const input = facts(severity);
    if (severity === 'unknown') {
      input.floodSituation.freshness = { state: 'unknown' };
      input.floodSituation.stations = [];
    }
    assert.equal(validateGeneratedFacts(presentation, input, { forecastOnly: severity === 'unknown' }).length, 0);
  });
}

test('allows negated certainty phrases used to explain what not to assume', () => {
  for (const text of [
    'ข้อมูลนี้ไม่ได้แปลว่าปลอดภัยแน่นอน ควรติดตามต่อ',
    'อย่าเพิ่งคิดว่าปลอดภัยแน่นอน',
    'พยากรณ์ฝนไม่ได้หมายความว่าน้ำท่วมแน่นอน',
  ]) {
    assert.deepEqual(validateGeneratedFacts(plan('watch', text), facts()), [], text);
  }
});

test('still rejects asserted certainty even when a negation appears elsewhere in the text', () => {
  for (const text of [
    'ตอนนี้ปลอดภัยแน่นอน',
    'สถานการณ์ไม่ปกติแต่ปลอดภัยแน่นอน',
    'ไม่ได้แปลว่าปลอดภัย แต่ตอนนี้น้ำท่วมแน่นอน',
  ]) {
    assert.ok(validateGeneratedFacts(plan('watch', text), facts()).some((e) => e.includes('certainty')), text);
  }
});
