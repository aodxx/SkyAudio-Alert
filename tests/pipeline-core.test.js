// tests/pipeline-core.test.js
// Zero-dependency tests using Node's built-in test runner (Node >= 18).
// Run with: node --test tests/

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { normalizeWeather } = require('../src/weather/normalize');
const { analyzeWeather } = require('../src/weather/analyzer');
const { buildForecastData } = require('../src/forecast/formatter');
const { buildFlex } = require('../src/flex/builder');
const { estimateDurationMs } = require('../src/audio/validate');

const THRESHOLDS = {
  hotApparent: 35,
  coolMorning: 23,
  rainProbNotable: 40,
  rainProbHigh: 65,
  strongWindKmh: 35,
  heavyRainMm: 10,
};

const LOCATION = {
  name: 'บ้านลำพาย',
  district: 'ต.โคกชะงาย',
  province: 'พัทลุง',
};

function loadFixture(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'weather', name), 'utf8'));
  return normalizeWeather(raw, `${raw.daily.time[0]}T00:00:00Z`);
}

test('AT-05: sunny fixture resolves to a clear/hot-leaning theme', () => {
  const weatherData = loadFixture('sunny.json');
  const analysis = analyzeWeather(weatherData, THRESHOLDS);
  assert.ok(['clear', 'partly_cloudy', 'hot'].includes(analysis.theme));
  assert.ok(!analysis.adviceSignals.includes('RAIN_LIKELY_EVENING'));
});

test('AT-03/AT-06: rainy-evening fixture triggers rain advice and rain theme', () => {
  const weatherData = loadFixture('rainy-evening.json');
  const analysis = analyzeWeather(weatherData, THRESHOLDS);
  assert.ok(['rain', 'heavy_rain'].includes(analysis.theme));
  assert.ok(
    analysis.adviceSignals.includes('RAIN_LIKELY_EVENING') ||
      analysis.adviceSignals.includes('RAIN_POSSIBLE_EVENING')
  );
});

test('AT-08: buildFlex produces a structurally valid bubble', () => {
  const weatherData = loadFixture('rainy-evening.json');
  const analysis = analyzeWeather(weatherData, THRESHOLDS);
  const forecastData = buildForecastData(analysis, LOCATION);
  const flex = buildFlex(forecastData);

  assert.equal(flex.type, 'flex');
  assert.ok(flex.altText.length > 0);
  assert.equal(flex.contents.type, 'bubble');
  assert.ok(Array.isArray(flex.contents.body.contents));
});

test('AT-02: missing optional daily fields do not crash normalize/analyze', () => {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'weather', 'sunny.json'), 'utf8')
  );
  delete raw.daily.sunrise;
  delete raw.daily.sunset;
  const weatherData = normalizeWeather(raw, '2026-09-22T00:00:00Z');
  const analysis = analyzeWeather(weatherData, THRESHOLDS);
  assert.ok(analysis.theme);
});

test('audio duration estimate stays within LINE-safe bounds', () => {
  const shortScript = 'สวัสดีครับ';
  const longScript = 'ทดสอบ '.repeat(300);
  const d1 = estimateDurationMs(shortScript, 1);
  const d2 = estimateDurationMs(longScript, 1);
  assert.ok(d1 >= 10_000);
  assert.ok(d2 <= 110_000);
});
