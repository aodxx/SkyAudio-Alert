const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parsePresentationPlan,
  validatePresentationPlan,
  buildPresentationPlanFallback,
} = require('../src/content/presentationContract');

function plan(severity = 'watch') {
  return {
    schemaVersion: '1.0',
    severity,
    priority: severity,
    visualVariant: severity,
    cards: [{
      id: 'hero',
      role: severity === 'unknown' ? 'uncertainty' : severity === 'critical' ? 'action' : 'hero',
      title: 'สถานการณ์น้ำ',
      body: severity === 'unknown' ? 'ยังยืนยันข้อมูลไม่ได้' : 'ติดตามสถานการณ์น้ำและข้อมูลล่าสุด',
      items: [],
      cta: [],
    }],
    spokenText: 'รายงานสถานการณ์น้ำครับ',
    spokenSections: [],
    audioStyle: { tone: severity === 'critical' ? 'urgent' : 'friendly', pacing: 'natural', detailLevel: 'detailed', emphasis: ['สถานการณ์น้ำ'] },
    actions: ['ติดตามข้อมูล'],
    warnings: [],
    factsUsed: ['flood.severity'],
  };
}

test('uses adapter severity, ignoring model-supplied severity, priority, and visualVariant', () => {
  const modelOutput = plan('critical');
  const parsed = parsePresentationPlan(modelOutput, { expectedSeverity: 'watch' });
  assert.equal(parsed.ok, true, parsed.errors?.join('; '));
  assert.equal(parsed.plan.severity, 'watch');
  assert.equal(parsed.plan.priority, 'watch');
  assert.equal(parsed.plan.visualVariant, 'watch');
});

test('requires a verified adapter severity instead of inferring it from the model', () => {
  const parsed = parsePresentationPlan(plan('critical'));
  assert.equal(parsed.ok, false);
  assert.ok(parsed.errors.some((error) => error.includes('expectedSeverity')));
});

test('validates the five canonical variants from adapter context', () => {
  for (const severity of ['normal', 'watch', 'affected', 'critical', 'unknown']) {
    const parsed = parsePresentationPlan(plan('critical'), { expectedSeverity: severity });
    assert.equal(parsed.ok, true, parsed.errors?.join('; '));
    assert.equal(parsed.plan.severity, severity);
  }
});

test('rejects post-parse severity drift', () => {
  const parsed = parsePresentationPlan(plan('watch'), { expectedSeverity: 'watch' });
  parsed.plan.severity = 'critical';
  assert.ok(validatePresentationPlan(parsed.plan, { expectedSeverity: 'watch' }).length);
});

test('critical requires immediate action on card 1', () => {
  const parsed = parsePresentationPlan(plan('critical'), { expectedSeverity: 'critical' });
  parsed.plan.cards[0].body = 'สถานการณ์น้ำกำลังเปลี่ยนแปลง';
  assert.ok(validatePresentationPlan(parsed.plan).some((error) => error.includes('critical')));
});

test('unknown requires explicit uncertainty', () => {
  const parsed = parsePresentationPlan(plan('unknown'), { expectedSeverity: 'unknown' });
  parsed.plan.cards[0].body = 'สถานการณ์น้ำล่าสุด';
  assert.ok(validatePresentationPlan(parsed.plan).some((error) => error.includes('unknown')));
});

test('rejects unsupported certainty and forbidden topics', () => {
  const parsed = parsePresentationPlan(plan(), { expectedSeverity: 'watch' });
  parsed.plan.spokenText = 'ปลอดภัยแน่นอนและราคาปาล์มวันนี้';
  assert.ok(validatePresentationPlan(parsed.plan).some((error) => error.includes('unsupported')));
});

test('fallback preserves adapter severity and adaptive audio policy', () => {
  const result = buildPresentationPlanFallback({
    floodSituation: { severity: 'watch', summary: 'ควรเฝ้าระวัง', actions: ['ติดตามระดับน้ำ'] },
    weatherAnalysis: { current: { description: { label: 'มีเมฆ' } } },
    report: { spokenText: 'รายงานครับ', shortSummary: 'เฝ้าระวัง' },
  });
  assert.equal(result.severity, 'watch');
  assert.equal(result.audioSelectionPolicy, 'gemini-adaptive-within-verified-facts');
  assert.ok(result.spokenText);
});
