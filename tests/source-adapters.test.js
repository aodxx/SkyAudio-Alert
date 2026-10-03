const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parseFloodCenterHtml } = require('../src/flood/phatthalungCenter');
const { parseWeatherPageHtml } = require('../src/weather/phatthalungPage');

const floodHtml = fs.readFileSync('/tmp/chachoengsao-flood_vercel_app_phatthalung.html', 'utf8');
const weatherHtml = fs.readFileSync('/tmp/chachoengsao-flood_vercel_app_weather.html', 'utf8');

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
