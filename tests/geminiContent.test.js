const test = require('node:test');
const assert = require('node:assert/strict');
const { generateGeminiReport, parseGeminiJsonText } = require('../src/content/geminiReport');

const context = {
  floodSituation: {
    severity: 'watch',
    summary: 'มีสถานีใกล้ล้นตลิ่ง ควรติดตามการเปลี่ยนแปลง',
    trend: 'rising',
    freshness: { state: 'fresh', ageMinutes: 10 },
    actions: ['ติดตามระดับน้ำล่าสุด'],
  },
  weatherAnalysis: {
    current: { description: { label: 'มีเมฆมาก' }, temperature: 28 },
    daily: { precipitationProbabilityMax: 70 },
  },
  location: { name: 'บ้านลำพาย', district: 'ต.โคกชะงาย', province: 'พัทลุง' },
  date: 'ทดสอบ',
};

const config = {
  content: {
    apiKey: 'test-key',
    model: 'gemini-3.8-flash',
    fallbackModel: '',
    thinkingLevel: 'low',
  },
  mode: 'test',
  dryRun: true,
};

function response(status, payload) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return body; },
    async json() { return JSON.parse(body); },
  };
}

test('Gemini 503 recovery removes structured-output complexity and still validates the ReportDraft', async () => {
  const requests = [];
  let call = 0;
  const fetchImpl = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    call += 1;
    if (call === 1) {
      return response(503, { error: { code: 503, status: 'UNAVAILABLE' } });
    }
    return response(200, {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              spokenText: 'สวัสดีครับ สถานการณ์น้ำอยู่ในระดับเฝ้าระวัง ควรติดตามระดับน้ำล่าสุด',
              shortSummary: 'น้ำเฝ้าระวัง · พัทลุง',
              priority: 'watch',
              actions: ['ติดตามระดับน้ำล่าสุด'],
              factsUsed: ['flood.severity', 'flood.summary'],
              warnings: [],
            }),
          }],
        },
      }],
    });
  };

  const report = await generateGeminiReport(context, config, {
    fetchImpl,
    primaryMaxAttempts: 1,
    recoveryMaxAttempts: 1,
  });

  assert.equal(report.provider, 'gemini');
  assert.equal(report.priority, 'watch');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].generationConfig.responseMimeType, 'application/json');
  assert.ok(requests[0].generationConfig.responseSchema);
  assert.equal(requests[1].generationConfig, undefined);
  assert.match(requests[1].contents[0].parts[0].text, /JSON object/i);
});

test('Gemini recovery accepts a JSON code fence and strips it before contract validation', () => {
  const parsed = parseGeminiJsonText('```json\n{"priority":"watch","spokenText":"ok","shortSummary":"สั้น","actions":[],"factsUsed":[],"warnings":[]}\n```');
  assert.equal(JSON.parse(parsed).priority, 'watch');
});

test('Gemini non-503 failure does not enter the structured recovery path', async () => {
  let calls = 0;
  await assert.rejects(
    () => generateGeminiReport(context, config, {
      fetchImpl: async () => {
        calls += 1;
        return response(400, { error: { code: 400, status: 'INVALID_ARGUMENT' } });
      },
      primaryMaxAttempts: 1,
    }),
    (error) => error.message === 'Gemini content request failed after retry: 400',
  );
  assert.equal(calls, 1);
});

test('Gemini 429 quota exhaustion uses the configured fallback model', async () => {
  const urls = [];
  let call = 0;
  const quotaConfig = {
    ...config,
    content: {
      ...config.content,
      fallbackModel: 'gemini-3.7-flash',
    },
  };
  const fetchImpl = async (url, options) => {
    urls.push(url);
    call += 1;
    if (call === 1) {
      return response(429, { error: { code: 429, status: 'RESOURCE_EXHAUSTED' } });
    }
    const body = JSON.parse(options.body);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    return response(200, {
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              spokenText: 'สวัสดีครับ สถานการณ์น้ำอยู่ในระดับเฝ้าระวัง',
              shortSummary: 'น้ำเฝ้าระวัง · พัทลุง',
              priority: 'watch',
              actions: ['ติดตามระดับน้ำล่าสุด'],
              factsUsed: ['flood.severity', 'flood.summary'],
              warnings: [],
            }),
          }],
        },
      }],
    });
  };

  const report = await generateGeminiReport(context, quotaConfig, {
    fetchImpl,
    primaryMaxAttempts: 1,
    fallbackMaxAttempts: 1,
  });

  assert.equal(report.provider, 'gemini');
  assert.equal(report.priority, 'watch');
  assert.equal(urls.length, 2);
  assert.match(urls[0], /gemini-3\.8-flash:generateContent$/);
  assert.match(urls[1], /gemini-3\.7-flash:generateContent$/);
});
