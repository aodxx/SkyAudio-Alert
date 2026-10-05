const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateLongFormNarration,
  buildQuotaSafeLongFormNarration,
  narrationSchema,
} = require('../src/content/narrator');

function response(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] }),
    text: async () => JSON.stringify(value),
  };
}

function context() {
  return {
    floodSituation: {
      severity: 'watch',
      summary: 'มีสถานีใกล้ล้นตลิ่ง ควรติดตาม',
      actions: ['ติดตามระดับน้ำ'],
      freshness: { state: 'fresh' },
    },
    weatherAnalysis: {},
    location: { name: 'บ้านลำพาย' },
    date: 'วันนี้',
    factsSnapshot: { factIds: ['flood.severity', 'flood.summary', 'flood.action.0'] },
  };
}

function config(overrides = {}) {
  return {
    mode: 'test',
    dryRun: true,
    content: { apiKey: 'test-only', model: 'gemini-test', fallbackModel: 'gemini-fallback-test', thinkingLevel: 'low' },
    ...overrides,
  };
}

const longText = 'วันนี้เราจะค่อย ๆ เล่าสถานการณ์จากข้อมูลที่ตรวจสอบแล้ว เพื่อให้เข้าใจข้อเท็จจริงและข้อจำกัดของข้อมูลโดยไม่สรุปเกินหลักฐานที่มีอยู่ ';
function sections(count = 10, text = longText.repeat(80)) {
  return Array.from({ length: count }, (_, index) => ({
    id: 'section-' + index,
    title: 'ช่วง ' + index,
    text,
    factsUsed: ['flood.severity'],
  }));
}


test('narration schema requires sectioned audio with fact traces', () => {
  const schema = narrationSchema();
  assert.ok(schema.properties.sections);
  assert.deepEqual(schema.properties.sections.items.required, ['id', 'title', 'text', 'factsUsed']);
});

test('narrator rejects fewer than ten sections and insufficient spoken length', async () => {
  await assert.rejects(() => generateLongFormNarration(context(), config(), {
    fetchImpl: async () => response({ sections: sections(9) }),
  }), /must contain 10 sections/);
  await assert.rejects(() => generateLongFormNarration(context(), config(), {
    fetchImpl: async () => response({ sections: sections(10, 'สั้น') }),
  }), /is too short/);
});

test('narrator uses the configured fallback model when the primary returns 429', async () => {
  const calls = [];
  const result = await generateLongFormNarration(context(), config(), {
    fetchImpl: async (url) => {
      calls.push(url);
      return calls.length === 1 ? response({ error: 'quota' }, 429) : response({ sections: sections() });
    },
    maxAttempts: 1,
    fallbackMaxAttempts: 1,
  });
  assert.equal(result.provider, 'gemini-fallback');
  assert.equal(calls.length, 2);
  assert.match(calls[1], /gemini-fallback-test/);
  assert.ok(result.totalCharacters >= 7000);
});

test('narrator uses a deterministic fact-safe fallback when both models are quota-limited', async () => {
  const calls = [];
  const result = await generateLongFormNarration(context(), config(), {
    fetchImpl: async (url) => { calls.push(url); return response({ error: 'quota' }, 429); },
    maxAttempts: 1,
    fallbackMaxAttempts: 1,
  });
  assert.equal(result.provider, 'quota-safe-fallback');
  assert.equal(calls.length, 2);
  assert.equal(result.sections.length, 10);
  assert.match(result.spokenText, /สถานการณ์น้ำ/);
});

test('narrator uses the deterministic fallback when the fallback model returns a retryable 5xx', async () => {
  const calls = [];
  const result = await generateLongFormNarration(context(), config(), {
    fetchImpl: async (url) => {
      calls.push(url);
      return response({ error: calls.length === 1 ? 'quota' : 'temporarily unavailable' }, calls.length === 1 ? 429 : 503);
    },
    maxAttempts: 1,
    fallbackMaxAttempts: 1,
  });
  assert.equal(result.provider, 'quota-safe-fallback');
  assert.equal(calls.length, 2);
  assert.equal(result.sections.length, 10);
});

test('narrator accepts ten sufficiently detailed sections without a visual plan', async () => {
  const result = await generateLongFormNarration(context(), config(), {
    fetchImpl: async () => response({ sections: sections() }),
  });
  assert.equal(result.sections.length, 10);
  assert.ok(result.totalCharacters >= 7000);
  assert.equal(result.provider, 'gemini');
});

test('narrator works without a PresentationPlan when API credentials are unavailable in test mode', async () => {
  const result = await generateLongFormNarration(context(), config({ content: {} }));
  assert.equal(result.provider, 'fallback');
  assert.equal(result.sections.length, 10);
  assert.deepEqual(result.sections[0].factsUsed, context().factsSnapshot.factIds);
});

test('quota-safe narration joins sections with real newlines', () => {
  const narration = buildQuotaSafeLongFormNarration(context());
  assert.ok(!narration.spokenText.includes('\\n'));
  assert.equal(narration.spokenText.split('\n').length, narration.sections.length);
  assert.deepEqual(narration.sections[0].factsUsed, context().factsSnapshot.factIds);
});
