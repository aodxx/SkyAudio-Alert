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
const { buildThaiScript } = require('../src/forecast/thaiScript');
const { buildFlex } = require('../src/flex/builder');
const { estimateDurationMs, parseMp3 } = require('../src/audio/validate');
const { edgeRate } = require('../src/audio/tts');
const { buildAudioMessage } = require('../src/line/messagingApi');
const { shouldSkipDuplicateProductionRun } = require('../src/core/statusReport');

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

test('Edge TTS formats negative rate as an attached CLI value', () => {
  assert.equal(edgeRate(0.95), '-5%');
  assert.equal(edgeRate(1.1), '+10%');
});

test('LINE audio payload uses HTTPS and milliseconds', () => {
  assert.deepEqual(buildAudioMessage('https://cdn.example.test/report.mp3', 35000), {
    type: 'audio', originalContentUrl: 'https://cdn.example.test/report.mp3', duration: 35000,
  });
});

test('MP3 parser rejects non-audio bytes', () => {
  assert.equal(parseMp3(Buffer.from('not an mp3')), null);
});


test('production duplicate guard skips only after successful same-day delivery', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skyaudio-status-'));
  fs.mkdirSync(path.join(root, 'public', 'status'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public', 'status', 'last-run.json'), JSON.stringify({
    mode: 'production',
    generatedAt: new Date().toISOString(),
    stages: { 'line.send': 'success' },
  }));
  assert.equal(shouldSkipDuplicateProductionRun({ mode: 'production', dryRun: false }, { repoRoot: root }), true);
  assert.equal(shouldSkipDuplicateProductionRun({ mode: 'test', dryRun: false }, { repoRoot: root }), false);
  fs.rmSync(root, { recursive: true, force: true });
});


test('Thai TTS script is concise and contains natural pause markers', () => {
  const weatherData = loadFixture('rainy-evening.json');
  const analysis = analyzeWeather(weatherData, THRESHOLDS);
  const advice = ['ช่วงเย็นมีโอกาสฝนค่อนข้างสูงครับ... เตรียมร่มไว้ก่อนออกจากบ้านนะครับ'];
  const script = buildThaiScript(analysis, advice, LOCATION);
  assert.match(script, /ตอนนี้\.\.\./);
  assert.match(script, /วันนี้\.\.\./);
  assert.ok(script.length < 700);
});
