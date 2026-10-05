// tests/pipeline-core.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeWeather } = require('../src/weather/normalize');
const { analyzeWeather } = require('../src/weather/analyzer');
const { buildFactsSnapshot } = require('../src/presentation/facts');
const { buildFlexV2 } = require('../src/flex/builder');
const { estimateDurationMs, parseMp3, validateAudio } = require('../src/audio/validate');
const { edgeRate } = require('../src/audio/tts');
const { buildAudioMessage } = require('../src/line/messagingApi');
const { shouldSkipDuplicateProductionRun } = require('../src/core/statusReport');
const { inspectFlexForDelivery } = require('../src/core/pipeline');
const { parseReportDraft } = require('../src/content/reportContract');

const THRESHOLDS = { hotApparent: 35, coolMorning: 23, rainProbNotable: 40, rainProbHigh: 65, strongWindKmh: 35, heavyRainMm: 10 };
const LOCATION = { name: 'บ้านลำพาย', district: 'ต.โคกชะงาย', province: 'พัทลุง', timezone: 'Asia/Bangkok' };
function loadFixture(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'weather', name), 'utf8'));
  return normalizeWeather(raw, raw.daily.time[0] + 'T00:00:00Z');
}
function flood(severity = 'watch') {
  return { severity, summary: severity === 'watch' ? 'มีสถานีใกล้ล้นตลิ่ง ควรติดตาม' : 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้', trend: 'stable', freshness: { state: severity === 'unknown' ? 'unknown' : 'fresh' }, stations: [{ name: 'น้ำตกโตนแพรทอง', label: severity === 'watch' ? 'ใกล้ล้นตลิ่ง' : '' }], actions: ['ติดตามระดับน้ำล่าสุด'] };
}
function render(floodSituation, weatherAnalysis) {
  const factsSnapshot = buildFactsSnapshot({ floodSituation, weatherAnalysis, location: LOCATION, dateInfo: { date: '4 ตุลาคม 2569' } });
  return { factsSnapshot, flex: buildFlexV2({ factsSnapshot }) };
}

test('weather analysis still provides deterministic context', () => {
  const analysis = analyzeWeather(loadFixture('rainy-evening.json'), THRESHOLDS);
  assert.ok(['rain', 'heavy_rain'].includes(analysis.theme));
});

test('Flex is a four-card carousel with weather first and the requested water/radar/CCTV actions', () => {
  const analysis = analyzeWeather(loadFixture('rainy-evening.json'), THRESHOLDS);
  const { flex, factsSnapshot } = render(flood('watch'), analysis);
  const json = JSON.stringify(flex);
  assert.equal(flex.type, 'flex');
  assert.equal(flex.contents.type, 'carousel');
  assert.equal(flex.contents.contents.length, 4);
  assert.match(json, /พยากรณ์อากาศประจำวันนี้/);
  assert.match(json, /raw\.githubusercontent\.com\/aodxx\/SkyAudio-Alert/);
  assert.match(json, /phatthalung\/map/);
  assert.match(json, /phatthalung\/weather/);
  assert.doesNotMatch(json, /ราคาปาล์ม|ราคายาง|ข่าวสารทั่วไป/);
  assert.equal(json.includes('alignItems'), false);
  assert.deepEqual(inspectFlexForDelivery(flex, factsSnapshot).passed, true);
});

test('critical flood state does not change the fixed four-card weather and map presentation', () => {
  const analysis = analyzeWeather(loadFixture('sunny.json'), THRESHOLDS);
  const { flex } = render(flood('critical'), analysis);
  const json = JSON.stringify(flex);
  assert.equal(flex.contents.contents.length, 4);
  assert.match(json, /ภาพสด \/ CCTV/);
  assert.match(json, /chachoengsao-flood\.vercel\.app\/phatthalung/);
  assert.match(json, /phatthalung\/weather/);
  assert.match(JSON.stringify(flex.contents.contents[0]), /พยากรณ์อากาศประจำวันนี้/);
});

test('unknown flood state retains the requested layout and does not invent flood status text', () => {
  const analysis = analyzeWeather(loadFixture('sunny.json'), THRESHOLDS);
  const { flex } = render(flood('unknown'), analysis);
  const json = JSON.stringify(flex);
  assert.equal(flex.contents.contents.length, 4);
  assert.match(json, /พยากรณ์อากาศประจำวันนี้/);
  assert.doesNotMatch(JSON.stringify(flex.contents.contents[0]), /✅|#CCFBF1|ยังยืนยันไม่ได้/);
});

test('flex.lint gate fails closed with a stage error before delivery', () => {
  const analysis = analyzeWeather(loadFixture('sunny.json'), THRESHOLDS);
  const { flex, factsSnapshot } = render(flood('watch'), analysis);
  const invalid = structuredClone(flex);
  invalid.contents.contents[0].size = 'mega';
  assert.throws(() => inspectFlexForDelivery(invalid, factsSnapshot), (error) => error.stage === 'flex.lint' && error.errors.some((item) => item.includes('same size')));
});

test('missing optional weather fields do not crash normalize/analyze', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'weather', 'sunny.json'), 'utf8'));
  delete raw.daily.sunrise; delete raw.daily.sunset;
  assert.ok(analyzeWeather(normalizeWeather(raw, '2026-09-22T00:00:00Z'), THRESHOLDS).theme);
});

test('audio validation helpers remain LINE-safe', () => {
  assert.ok(estimateDurationMs('สวัสดีครับ', 1) > 0);
  assert.ok(estimateDurationMs('ทดสอบ '.repeat(300), 1) <= 190000);
  assert.equal(edgeRate(0.95), '-5%');
  assert.deepEqual(buildAudioMessage('https://cdn.example.test/report.mp3', 35000), { type: 'audio', originalContentUrl: 'https://cdn.example.test/report.mp3', duration: 35000 });
  assert.equal(parseMp3(Buffer.from('not an mp3')), null);
  assert.equal(typeof validateAudio, 'function');
});

test('production duplicate guard skips only after successful same-day delivery', () => {
  const os = require('node:os');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skyaudio-status-'));
  fs.mkdirSync(path.join(root, 'public', 'status'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public', 'status', 'last-run.json'), JSON.stringify({ mode: 'production', generatedAt: new Date().toISOString(), stages: { 'line.send': 'success' } }));
  assert.equal(shouldSkipDuplicateProductionRun({ mode: 'production', dryRun: false }, { repoRoot: root }), true);
  fs.rmSync(root, { recursive: true, force: true });
});

test('ReportDraft output has no forbidden product topics', () => {
  const result = parseReportDraft({ spokenText: 'รายงานสถานการณ์น้ำครับ', shortSummary: 'น้ำเฝ้าระวัง', priority: 'watch', actions: [], factsUsed: ['flood.severity'], warnings: [] });
  assert.equal(result.ok, true);
});
