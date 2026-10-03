// tests/pipeline-core.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeWeather } = require('../src/weather/normalize');
const { analyzeWeather } = require('../src/weather/analyzer');
const { buildForecastData } = require('../src/forecast/formatter');
const { buildFlex } = require('../src/flex/builder');
const { estimateDurationMs, parseMp3 } = require('../src/audio/validate');
const { edgeRate } = require('../src/audio/tts');
const { buildAudioMessage } = require('../src/line/messagingApi');
const { shouldSkipDuplicateProductionRun } = require('../src/core/statusReport');
const { parseReportDraft } = require('../src/content/reportContract');

const THRESHOLDS = { hotApparent: 35, coolMorning: 23, rainProbNotable: 40, rainProbHigh: 65, strongWindKmh: 35, heavyRainMm: 10 };
const LOCATION = { name: 'บ้านลำพาย', district: 'ต.โคกชะงาย', province: 'พัทลุง' };
function loadFixture(name) {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'weather', name), 'utf8'));
  return normalizeWeather(raw, `${raw.daily.time[0]}T00:00:00Z`);
}
function flood(severity = 'watch') {
  return { severity, summary: severity === 'watch' ? 'มีสถานีใกล้ล้นตลิ่ง ควรติดตาม' : 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้', trend: 'stable', freshness: { state: severity === 'unknown' ? 'unknown' : 'fresh' }, stations: [{ name: 'น้ำตกโตนแพรทอง', label: severity === 'watch' ? 'ใกล้ล้นตลิ่ง' : '' }], actions: ['ติดตามระดับน้ำล่าสุด'] };
}
test('weather analysis still provides deterministic context', () => {
  const analysis = analyzeWeather(loadFixture('rainy-evening.json'), THRESHOLDS);
  assert.ok(['rain', 'heavy_rain'].includes(analysis.theme));
});
test('Phase 3 Flex is compact and flood-first', () => {
  const analysis = analyzeWeather(loadFixture('rainy-evening.json'), THRESHOLDS);
  const data = buildForecastData(analysis, flood('watch'), LOCATION, { spokenText: 'รายงานทดสอบ', shortSummary: 'เฝ้าระวัง', priority: 'watch' });
  const flex = buildFlex(data);
  const json = JSON.stringify(flex);
  assert.equal(flex.type, 'flex');
  assert.equal(flex.contents.size, 'kilo');
  assert.match(json, /สถานการณ์น้ำ/);
  assert.match(json, /cctv\.maholan\.net/);
  assert.match(json, /phatthalung\/weather/);
  assert.match(json, /น้องจุ่นจ้าน/);
  assert.doesNotMatch(json, /ราคาปาล์ม|ราคายาง|ข่าวสารทั่วไป/);
  assert.equal(json.includes('alignItems'), false);
});
test('critical compact Flex keeps water actions and omits secondary weather button', () => {
  const analysis = analyzeWeather(loadFixture('sunny.json'), THRESHOLDS);
  const json = JSON.stringify(buildFlex(buildForecastData(analysis, flood('critical'), LOCATION)));
  assert.match(json, /cctv\.maholan\.net/);
  assert.match(json, /chachoengsao-flood\.vercel\.app\/phatthalung/);
  assert.doesNotMatch(json, /phatthalung\/weather/);
});
test('unknown flood status is explicit in Flex', () => {
  const analysis = analyzeWeather(loadFixture('sunny.json'), THRESHOLDS);
  const json = JSON.stringify(buildFlex(buildForecastData(analysis, flood('unknown'), LOCATION)));
  assert.match(json, /ยังยืนยันไม่ได้/);
});
test('missing optional weather fields do not crash normalize/analyze', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'weather', 'sunny.json'), 'utf8'));
  delete raw.daily.sunrise; delete raw.daily.sunset;
  assert.ok(analyzeWeather(normalizeWeather(raw, '2026-09-22T00:00:00Z'), THRESHOLDS).theme);
});
test('audio validation helpers remain LINE-safe', () => {
  assert.ok(estimateDurationMs('สวัสดีครับ', 1) >= 10000);
  assert.ok(estimateDurationMs('ทดสอบ '.repeat(300), 1) <= 190000);
  assert.equal(edgeRate(0.95), '-5%');
  assert.deepEqual(buildAudioMessage('https://cdn.example.test/report.mp3', 35000), { type: 'audio', originalContentUrl: 'https://cdn.example.test/report.mp3', duration: 35000 });
  assert.equal(parseMp3(Buffer.from('not an mp3')), null);
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
