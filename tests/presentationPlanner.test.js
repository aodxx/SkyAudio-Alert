const test = require('node:test');
const assert = require('node:assert/strict');
const { generatePresentationPlan, generateLongFormNarration, plannerSchema, narrationSchema } = require('../src/content/presentationPlanner');

function response(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] }),
    text: async () => JSON.stringify(value),
  };
}

function modelPlan(overrides = {}) {
  return {
    cards: [{ id: 'hero', role: 'hero', title: 'เฝ้าระวัง', body: 'ติดตามสถานการณ์น้ำต่อเนื่อง', items: [], cta: [] }],
    spokenText: 'รายงานสถานการณ์น้ำครับ',
    spokenSections: [],
    audioStyle: { tone: 'friendly', pacing: 'natural', detailLevel: 'detailed', emphasis: ['สถานการณ์น้ำ'] },
    actions: ['ติดตามระดับน้ำ'],
    warnings: [],
    factsUsed: ['flood.severity'],
    ...overrides,
  };
}

function context(report = {}) {
  return {
    floodSituation: { severity: 'watch', summary: 'ควรติดตาม', actions: ['ติดตามระดับน้ำ'] },
    weatherAnalysis: {},
    location: { name: 'บ้านลำพาย' },
    date: 'วันนี้',
    report: { shortSummary: 'เฝ้าระวัง', spokenText: 'รายงานเดิม', factsUsed: ['flood.severity'], ...report },
  };
}

function config() {
  return { mode: 'test', dryRun: true, content: { apiKey: 'test-only', model: 'gemini-test', fallbackModel: 'gemini-fallback-test', thinkingLevel: 'low' } };
}

test('Gemini schema does not ask for severity, priority, or visualVariant', () => {
  const schema = plannerSchema();
  for (const key of ['severity', 'priority', 'visualVariant']) {
    assert.equal(Object.hasOwn(schema.properties, key), false);
    assert.equal(schema.required.includes(key), false);
  }
});

test('planner assigns severity from adapter even if model omits or contradicts it', async () => {
  const contradictory = modelPlan({ severity: 'critical', priority: 'critical', visualVariant: 'critical' });
  let calls = 0;
  const result = await generatePresentationPlan(context(), config(), {
    fetchImpl: async () => { calls += 1; return response(contradictory); },
  });
  assert.equal(calls, 1);
  assert.equal(result.provider, 'gemini');
  assert.equal(result.severity, 'watch');
  assert.equal(result.priority, 'watch');
  assert.equal(result.visualVariant, 'watch');
});

test('planner preserves verified facts trace when Gemini omits factsUsed', async () => {
  const result = await generatePresentationPlan(context({ factsUsed: ['flood.severity', 'weather.current'] }), config(), {
    fetchImpl: async () => response(modelPlan({ factsUsed: [] })),
  });
  assert.deepEqual(result.factsUsed, ['flood.severity', 'weather.current']);
});

test('planner uses fallback model when primary returns 429', async () => {
  const calls = [];
  const result = await generatePresentationPlan(context(), config(), {
    fetchImpl: async (url) => {
      calls.push(url);
      return calls.length === 1 ? response({ error: 'quota' }, 429) : response(modelPlan());
    },
    maxAttempts: 1,
    fallbackMaxAttempts: 1,
  });
  assert.equal(result.provider, 'gemini-fallback');
  assert.equal(calls.length, 2);
  assert.match(calls[1], /gemini-fallback-test/);
});

test('planner rejects model output with an invalid presentation contract', async () => {
  await assert.rejects(() => generatePresentationPlan(context(), config(), {
    fetchImpl: async () => response({ spokenText: '', cards: [], audioStyle: {} }),
  }), /validation failed/);
});


test('long-form narration schema requires sectioned storyteller output', () => {
  const schema = narrationSchema();
  assert.ok(schema.properties.sections);
  assert.deepEqual(schema.properties.sections.items.required, ['id', 'title', 'text', 'factsUsed']);
});

test('long-form narration rejects fewer than 10 sections or insufficient length', async () => {
  const shortSections = { sections: Array.from({ length: 10 }, (_, i) => ({ id: 's' + i, title: 'x', text: 'สั้น', factsUsed: ['flood.severity'] })) };
  await assert.rejects(() => generateLongFormNarration(context(), modelPlan(), config(), {
    fetchImpl: async () => response(shortSections),
  }), /Long-form narration is too short|must contain 10 sections/);
});

test('long-form narration uses fallback model when primary returns 429', async () => {
  const text = 'วันนี้เราจะค่อย ๆ เล่าและอธิบายสถานการณ์จากข้อมูลที่ตรวจสอบแล้ว เพื่อให้ฟังเข้าใจง่ายและไม่รีบสรุปเกินข้อเท็จจริง '.repeat(80);
  const sections = Array.from({ length: 10 }, (_, i) => ({ id: 's' + i, title: 'ช่วง ' + i, text, factsUsed: ['flood.severity'] }));
  let calls = 0;
  const result = await generateLongFormNarration(context(), modelPlan(), config(), {
    fetchImpl: async () => {
      calls += 1;
      return calls === 1 ? response({ error: 'quota' }, 429) : response({ sections });
    },
    maxAttempts: 1,
    fallbackMaxAttempts: 1,
  });
  assert.equal(result.provider, 'gemini-fallback');
  assert.equal(calls, 2);
  assert.equal(result.sections.length, 10);
  assert.ok(result.totalCharacters >= 7000);
});

test('long-form narration uses fact-safe deterministic fallback when both Gemini models return 429', async () => {
  const calls = [];
  const result = await generateLongFormNarration(context(), modelPlan(), config(), {
    fetchImpl: async (url) => {
      calls.push(url);
      return response({ error: 'quota' }, 429);
    },
    maxAttempts: 1,
    fallbackMaxAttempts: 1,
  });
  assert.equal(result.provider, 'quota-safe-fallback');
  assert.equal(calls.length, 2);
  assert.equal(result.sections.length, 10);
  assert.ok(result.totalCharacters >= 7000);
  assert.match(result.spokenText, /สถานการณ์น้ำ/);
});

test('long-form narration accepts 10 sufficiently detailed sections', async () => {
  const text = 'วันนี้เราจะค่อย ๆ เล่าและอธิบายสถานการณ์จากข้อมูลที่ตรวจสอบแล้ว เพื่อให้ฟังเข้าใจง่ายและไม่รีบสรุปเกินข้อเท็จจริง '.repeat(80);
  const sections = Array.from({ length: 10 }, (_, i) => ({ id: 's' + i, title: 'ช่วง ' + i, text, factsUsed: ['flood.severity'] }));
  const result = await generateLongFormNarration(context(), modelPlan(), config(), {
    fetchImpl: async () => response({ sections }),
  });
  assert.equal(result.sections.length, 10);
  assert.ok(result.totalCharacters >= 7000);
});

test('quota-safe long-form narration joins sections with a real newline, not a literal backslash-n', () => {
  const { buildQuotaSafeLongFormNarration } = require('../src/content/presentationPlanner');
  const narration = buildQuotaSafeLongFormNarration({}, { factsUsed: ['flood.severity'] });
  assert.ok(!narration.spokenText.includes('\\n'));
  assert.equal(narration.spokenText.split('\n').length, narration.sections.length);
});
