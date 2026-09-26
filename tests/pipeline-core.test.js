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
const { buildThaiDateInfo } = require('../src/forecast/thaiDate');
const { buildFlex } = require('../src/flex/builder');
const { estimateDurationMs, parseMp3 } = require('../src/audio/validate');
const { edgeRate } = require('../src/audio/tts');
const { buildAudioMessage } = require('../src/line/messagingApi');
const { shouldSkipDuplicateProductionRun } = require('../src/core/statusReport');\nconst { extractHeadlines } = require('../src/news/phatthalungNews');\n

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
  assert.ok(d2 <= 190_000);
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


test('local-news parser keeps useful headlines and drops weather-only items', () => {\n  const html = '<a href="/a">พยากรณ์อากาศ ประจำวันที่ 26 กันยายน 2569</a><a href="/b">จังหวัดพัทลุงเดินหน้าพัฒนาชุมชนและบริการประชาชน</a><a href="/c">เปิดโครงการใหม่เพื่อส่งเสริมอาชีพในพื้นที่</a>';\n  const items = extractHeadlines(html, 2);\n  assert.equal(items.length, 2);\n  assert.match(items[0].title, /พัฒนาชุมชน/);\n  assert.match(items[1].title, /ส่งเสริมอาชีพ/);\n});\n\ntest('Thai TTS script includes market prices and local news in the spoken report', () => {
  const weatherData = loadFixture('rainy-evening.json');
  const analysis = analyzeWeather(weatherData, THRESHOLDS);
  const advice = ['ช่วงเย็นมีโอกาสฝนค่อนข้างสูง... เตรียมร่มไว้ก่อนออกจากบ้านนะ'];
  const dateInfo = buildThaiDateInfo('2026-09-22T06:00:00');
  const script = buildThaiScript(analysis, advice, LOCATION, dateInfo, [\n    { kind: 'palm', price: 5.25, date: '2569-09-24', status: 'ok' },\n    { kind: 'rubber', price: 82.5, date: '2569-09-25', status: 'ok' },\n  ], [\n    { title: 'จังหวัดพัทลุงเดินหน้าพัฒนาชุมชนและบริการประชาชน', status: 'ok' },\n  ]);
  assert.match(script, /สวัสดีตอนเช้าครับ/);
  assert.match(script, /ถ้าไล่ดูเป็นช่วง ๆ ของวันนี้/);\n  assert.match(script, /ปาล์มน้ำมัน ล่าสุด 5.25/);\n  assert.match(script, /ยางพารา ล่าสุด 82.50/);\n  assert.match(script, /จังหวัดพัทลุงเดินหน้าพัฒนาชุมชนและบริการประชาชน/);
  assert.match(script, /แล้วพบกันใหม่พรุ่งนี้เช้าครับ/);
  assert.ok(script.length >= 900);
  assert.ok(script.length <= 2200);
  assert.ok(estimateDurationMs(script, 0.92) <= 190_000);
});


test('Thai date context includes Gregorian date and lunar day', () => {
  const info = buildThaiDateInfo('2026-09-22T06:00:00');
  assert.equal(info.solarText, 'วันอังคารที่ 22 กันยายน พ.ศ. 2569');
  assert.equal(info.lunarText, 'ขึ้น 11 ค่ำ');
  assert.match(info.spokenText, /22 กันยายน พ\.ศ\. 2569/);
  assert.match(info.spokenText, /ขึ้น 11 ค่ำ/);
});
