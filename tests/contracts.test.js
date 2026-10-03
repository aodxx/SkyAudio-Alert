const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeFloodSituation, createUnknownFloodSituation, validateFloodSituation } = require('../src/flood/contract');
const { parseReportDraft, buildGeminiReportInput } = require('../src/content/reportContract');
function fixture(name) { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'flood', name), 'utf8')); }

test('FloodSituation normalizes a fresh watch fixture without inventing fields', () => {
  const situation = normalizeFloodSituation(fixture('watch.json'), { freshnessLimitMinutes: 180 });
  assert.equal(situation.schemaVersion, '1.0'); assert.equal(situation.severity, 'watch'); assert.equal(situation.trend, 'rising');
  assert.equal(situation.location.name, 'บ้านลำพาย'); assert.equal(situation.freshness.state, 'fresh');
  assert.deepEqual(situation.affectedAreas, ['คลองบางม่วง']); assert.equal(validateFloodSituation(situation).length, 0);
});
test('FloodSituation marks old observations stale', () => {
  const situation = normalizeFloodSituation({ severity: 'normal', location: { name: 'บ้านลำพาย' }, source: { name: 'fixture' }, observedAt: '2026-09-01T00:00:00Z', retrievedAt: '2026-10-03T00:00:00Z' }, { freshnessLimitMinutes: 180 });
  assert.equal(situation.freshness.state, 'stale'); assert.ok(situation.freshness.ageMinutes > 180);
});
test('unknown flood situation is explicit and valid', () => {
  const situation = createUnknownFloodSituation({ location: { name: 'บ้านลำพาย', province: 'พัทลุง' }, source: { name: 'source unavailable' }, retrievedAt: '2026-10-03T14:00:00Z' });
  assert.equal(situation.severity, 'unknown'); assert.equal(situation.freshness.state, 'unknown'); assert.equal(validateFloodSituation(situation).length, 0);
});
test('ReportDraft parses Gemini structured output and limits actions', () => {
  const result = parseReportDraft({ spokenText: 'สวัสดีครับ วันนี้ระดับน้ำทรงตัว ติดตามข้อมูลกันตามปกตินะครับ', shortSummary: 'ระดับน้ำทรงตัว', priority: 'normal', actions: ['ติดตามข้อมูล', 'เตรียมร่ม'], factsUsed: ['flood.severity=normal'], warnings: [] });
  assert.equal(result.ok, true); assert.equal(result.draft.schemaVersion, '1.0'); assert.equal(result.draft.actions.length, 2);
});
test('ReportDraft rejects forbidden market/news content', () => {
  const result = parseReportDraft({ spokenText: 'วันนี้ขอรายงานราคายางพาราครับ', shortSummary: 'ราคายางพารา', priority: 'normal', actions: [], factsUsed: [], warnings: [] });
  assert.equal(result.ok, false); assert.ok(result.errors.some((error) => error.includes('forbidden')));
});
test('ReportDraft requires freshness disclosure for unknown source', () => {
  const result = parseReportDraft({ spokenText: 'วันนี้ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้ครับ', shortSummary: 'ยังยืนยันสถานการณ์น้ำไม่ได้', priority: 'unknown', actions: [], factsUsed: [], warnings: ['source unavailable'] });
  assert.equal(result.ok, true); const input = buildGeminiReportInput({ floodSituation: { severity: 'unknown' }, weatherAnalysis: {}, location: {}, date: '2026-10-03' }); assert.equal(input.instruction.includes('Do not browse'), true);
});
test('Gemini content adapter uses a validated flood/weather fallback in test mode without a key', async () => {
  const { generateGeminiReport } = require('../src/content/geminiReport');
  const report = await generateGeminiReport({ floodSituation: { severity: 'watch', summary: 'มีสถานีใกล้ล้นตลิ่ง', actions: [], freshness: { state: 'fresh' } }, weatherAnalysis: { current: { description: { label: 'มีเมฆมาก' }, temperature: 28 }, daily: { precipitationProbabilityMax: 80 } }, location: { name: 'บ้านลำพาย', province: 'พัทลุง' }, date: 'วันนี้' }, { mode: 'test', dryRun: true, content: { apiKey: '', model: '' } });
  assert.equal(report.provider, 'fallback'); assert.equal(report.priority, 'watch'); assert.match(report.spokenText, /สถานการณ์น้ำ/);
});
