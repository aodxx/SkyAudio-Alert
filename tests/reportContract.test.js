const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReportDraft, validateReportDraft, buildGeminiReportInput } = require('../src/content/reportContract');

const base = {
  spokenText:'สถานการณ์น้ำอยู่ในเกณฑ์ปกติ ติดตามข้อมูลล่าสุดตามปกติครับ',
  shortSummary:'น้ำปกติ · พัทลุง',
  priority:'normal',
  actions:['ติดตามระดับน้ำล่าสุด'],
  factsUsed:['flood.severity'],
  warnings:[]
};

test('ReportDraft accepts valid structured output', () => {
  const result = parseReportDraft(JSON.stringify(base));
  assert.equal(result.ok,true);
});

test('ReportDraft rejects invalid JSON', () => {
  const result = parseReportDraft('{bad');
  assert.equal(result.ok,false);
});

test('ReportDraft rejects forbidden market/news content', () => {
  const result = parseReportDraft({...base, spokenText:'วันนี้ราคาปาล์มปรับขึ้น'});
  assert.equal(result.ok,false);
});

test('stale/unknown report must disclose limitation when required', () => {
  const result = validateReportDraft({...base, priority:'unknown', spokenText:'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้'}, {requireFreshnessWarning:true});
  assert.deepEqual(result,[]);
});

test('Gemini input declares no-browse/no-inference rule', () => {
  const input = buildGeminiReportInput({floodSituation:{severity:'unknown'},weatherAnalysis:{},location:{name:'บ้านลำพาย'}});
  assert.match(input.instruction,/Do not browse/);
});