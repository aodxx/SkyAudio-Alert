const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeFloodSituation } = require('../src/flood/contract');
const {
  buildFactsSnapshot,
  getFact,
  getAllowedFactIds,
  toThaiNumberWords,
} = require('../src/presentation/facts');

const severityStates = ['normal', 'watch', 'affected', 'critical', 'unknown'];
function floodFixture(name) {
  const input = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'flood', `${name}.json`), 'utf8'));
  return normalizeFloodSituation(input, { freshnessLimitMinutes: 180 });
}
function weatherAnalysis() {
  return {
    current: {
      temperature: 27.6,
      apparentTemperature: 30,
      humidity: 81,
      windSpeed: 12.4,
      precipitation: 0,
      description: { label: 'มีเมฆบางส่วน' },
    },
    daily: { tempMin: 24, tempMax: 32, precipitationProbabilityMax: 70 },
  };
}
function makeSnapshot(floodSituation, weather = weatherAnalysis()) {
  return buildFactsSnapshot({
    floodSituation,
    weatherAnalysis: weather,
    location: floodSituation.location,
    dateInfo: { date: '4 ตุลาคม 2569' },
  });
}

test('builds snapshots for all five flood severity fixtures without changing severity', () => {
  for (const severity of severityStates) {
    const snapshot = makeSnapshot(floodFixture(severity));
    assert.equal(snapshot.severity, severity);
    assert.equal(getFact(snapshot, 'flood.severity').value, severity);
    assert.ok(getAllowedFactIds(snapshot).includes('flood.severity'));
  }
});

test('stale fixture stays stale and retains its original watch severity', () => {
  const snapshot = makeSnapshot(floodFixture('stale'));
  assert.equal(snapshot.severity, 'watch');
  assert.equal(getFact(snapshot, 'flood.freshness.state').value, 'stale');
});

test('maps only structured source values to stable station, impact, weather, and source IDs', () => {
  const flood = {
    ...floodFixture('watch'),
    stations: [{ name: 'สถานีคลองลำปำ', waterway: 'คลองลำปำ', label: 'ใกล้ล้นตลิ่ง', distanceToBankMeters: 0.42, trend: 'rising', observedAt: '2026-10-04T05:40:00+07:00' }],
    affectedAreas: ['ชุมชนริมน้ำ'],
    roads: ['ถนนสายตัวอย่าง'],
  };
  const snapshot = makeSnapshot(flood);
  assert.equal(getFact(snapshot, 'flood.station.0.name').value, 'สถานีคลองลำปำ');
  assert.equal(getFact(snapshot, 'flood.station.0.distanceToBankMeters').value, 0.42);
  assert.equal(getFact(snapshot, 'flood.affectedArea.0').value, 'ชุมชนริมน้ำ');
  assert.equal(getFact(snapshot, 'flood.road.0').value, 'ถนนสายตัวอย่าง');
  assert.equal(getFact(snapshot, 'weather.current.temperature').value, 27.6);
  assert.equal(getFact(snapshot, 'flood.source.name').value, flood.source.name);
  assert.ok(getFact(snapshot, 'flood.station.0.name').spokenForms.includes('สถานีคลองลำปำ'));
  assert.ok(getFact(snapshot, 'flood.station.0.observedAt').spokenForms.includes('ตีห้าสี่สิบนาที'));
  assert.equal(getFact(snapshot, 'flood.source.url').spokenForms.length, 0);
});

test('omits missing optional values and never mines numbers from summary prose', () => {
  const flood = { ...floodFixture('unknown'), summary: 'รายงานรหัส 987 ยังยืนยันไม่ได้', stations: [], affectedAreas: [], roads: [] };
  const snapshot = makeSnapshot(flood, { current: {}, daily: {} });
  assert.equal(getFact(snapshot, 'weather.current.temperature'), undefined);
  assert.equal(getFact(snapshot, 'flood.station.0.level'), undefined);
  assert.equal(snapshot.allowList.includes('987'), false);
  assert.equal(snapshot.factIds.includes('flood.summary'), true);
});

test('allow-list is unique and includes ASCII, Thai-digit, and Thai-spoken numeric forms', () => {
  const snapshot = makeSnapshot({
    ...floodFixture('watch'),
    water: { distanceToBankMeters: 0.42 },
  });
  const distance = getFact(snapshot, 'flood.water.distanceToBankMeters');
  assert.ok(distance.spokenForms.includes('0.42'));
  assert.ok(distance.spokenForms.includes('๐.๔๒'));
  assert.ok(distance.spokenForms.includes('ศูนย์จุดสี่สอง'));
  assert.equal(snapshot.allowList.length, new Set(snapshot.allowList).size);
  assert.equal(toThaiNumberWords(21), 'ยี่สิบเอ็ด');
  assert.equal(toThaiNumberWords(1000001), 'หนึ่งล้านเอ็ด');
  assert.equal(toThaiNumberWords(10000001), 'สิบล้านเอ็ด');
  assert.equal(toThaiNumberWords(-3), 'ลบสาม');
});

test('date and timestamp spoken forms are stable for ISO timestamps', () => {
  const snapshot = makeSnapshot({
    ...floodFixture('watch'),
    observedAt: '2026-10-04T05:40:00+07:00',
    timestamps: { ...floodFixture('watch').timestamps, observedAt: '2026-10-04T05:40:00+07:00' },
  });
  assert.ok(getFact(snapshot, 'flood.observedAt').spokenForms.includes('ตีห้าสี่สิบนาที'));
});
