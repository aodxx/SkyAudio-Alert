const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateNarration,
  buildQuotaSafeNarration,
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
      trend: 'stable',
      freshness: { state: 'fresh' },
      stations: [{ name: 'สถานีคลอง', label: 'เฝ้าระวัง' }],
    },
    weatherAnalysis: {
      current: { description: { label: 'มีเมฆบางส่วน' }, temperature: 27, humidity: 81, windSpeed: 12, precipitation: 0 },
      daily: { tempMin: 24, tempMax: 32, precipitationProbabilityMax: 60 },
      rainWindows: { periods: { morning: { maxProb: 20, maxMm: 0 }, afternoon: { maxProb: 55, maxMm: 2.1 }, evening: { maxProb: 35, maxMm: 1.2 } } },
    },
    location: { name: 'บ้านลำพาย', province: 'พัทลุง' },
    date: 'วันนี้',
    factsSnapshot: { factIds: ['flood.severity', 'flood.summary', 'flood.action.0', 'weather.current.condition', 'weather.current.temperature', 'weather.current.humidity', 'weather.current.windSpeed', 'weather.daily.tempMin', 'weather.daily.tempMax', 'weather.rainWindows.afternoon.maxProbability', 'weather.rainWindows.afternoon.maxPrecipitation'] },
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

function sections(prefix = 'รายงาน') {
  return [
    { id: 'opening', title: 'เปิดรายงาน', text: `${prefix}สถานการณ์น้ำวันนี้ตามข้อมูลที่ตรวจสอบได้`, factsUsed: ['flood.severity'] },
    { id: 'water', title: 'สถานการณ์น้ำ', text: 'จุดข้อมูลน้ำและความสดใหม่ควรอ่านตามแหล่งข้อมูลที่ระบุ', factsUsed: ['flood.summary'] },
    { id: 'weather', title: 'อากาศประกอบ', text: 'พยากรณ์อากาศเป็นข้อมูลประกอบ ไม่ใช่หลักฐานยืนยันว่าน้ำท่วม', factsUsed: ['weather.daily.tempMin'] },
    { id: 'next-steps', title: 'สิ่งที่ควรติดตาม', text: 'ติดตามคำแนะนำจากหน่วยงานและตรวจข้อมูลล่าสุดก่อนตัดสินใจ', factsUsed: ['flood.action.0'] },
  ];
}

test('narration schema requires structured sections with fact traces', () => {
  const schema = narrationSchema();
  assert.ok(schema.properties.sections);
  assert.deepEqual(schema.properties.sections.items.required, ['id', 'title', 'text', 'factsUsed']);
});

test('narrator accepts four distinct medium-length sections below the legacy 7000-character minimum', async () => {
  const result = await generateNarration(context(), config(), {
    fetchImpl: async () => response({ sections: sections() }),
  });
  assert.equal(result.sections.length, 4);
  assert.ok(result.totalCharacters < 7000);
  assert.equal(new Set(result.sections.map((section) => section.text)).size, 4);
  assert.equal(result.provider, 'gemini');
});

test('narrator rejects missing sections and repeated section text', async () => {
  await assert.rejects(() => generateNarration(context(), config(), {
    fetchImpl: async () => response({ sections: sections().slice(0, 3) }),
  }), /must contain four distinct sections/);
  const repeated = sections();
  repeated[3].text = repeated[2].text;
  await assert.rejects(() => generateNarration(context(), config(), {
    fetchImpl: async () => response({ sections: repeated }),
  }), /must not repeat/);
});

test('narrator prompt follows the available facts without a fixed time target or repeated filler', async () => {
  let prompt = '';
  await generateNarration(context(), config(), {
    fetchImpl: async (_url, options) => {
      prompt = JSON.parse(options.body).contents[0].parts[0].text;
      return response({ sections: sections() });
    },
  });
  assert.match(prompt, /ไม่กำหนดเป้าหมายนาที/);
  assert.match(prompt, /ห้ามยืดบทด้วยข้อความซ้ำ/);
  assert.doesNotMatch(prompt, /3–5 นาที/);
  assert.doesNotMatch(prompt, /7,000|10 ช่วง/);
});

test('narrator prompt asks Gemini for a human greeting, summary, well-wish, and farewell without invented facts', async () => {
  let prompt = '';
  await generateNarration(context(), config(), {
    fetchImpl: async (_url, options) => {
      prompt = JSON.parse(options.body).contents[0].parts[0].text;
      return response({ sections: sections() });
    },
  });
  assert.match(prompt, /ทักทายสวัสดี/);
  assert.match(prompt, /สรุปสั้น/);
  assert.match(prompt, /ฝากความปรารถนาดี/);
  assert.match(prompt, /บอกลา/);
  assert.match(prompt, /พบกันใหม่/);
  assert.match(prompt, /ถ้อยคำเชื่อมโยง/);
  assert.match(prompt, /ห้ามแต่งข้อมูล/);
  assert.match(prompt, /ห้ามสร้างตัวเลข/);
  assert.match(prompt, /ตัวเลขทุกตัวในบทพูดต้องปรากฏอยู่ใน facts JSON เท่านั้น/);
  assert.match(prompt, /ห้ามเติมตัวเลขอื่น/);
  assert.match(prompt, /ผู้พูดเป็นผู้ชาย/);
});

test('narrator prompt matches feminine speech particles to the selected voice profile', async () => {
  let prompt = '';
  await generateNarration(context(), config({ tts: { profile: 'female-friendly' } }), {
    fetchImpl: async (_url, options) => {
      prompt = JSON.parse(options.body).contents[0].parts[0].text;
      return response({ sections: sections() });
    },
  });
  assert.match(prompt, /ผู้พูดเป็นผู้หญิง/);
  assert.match(prompt, /ค่ะ และ นะคะ/);
});

test('quota-safe fallback greets listeners, summarizes, wishes them well, and says goodbye', () => {
  const result = buildQuotaSafeNarration(context());
  assert.match(result.sections[0].text, /สวัสดี/);
  assert.match(result.sections[3].text, /สรุปสั้น/);
  assert.match(result.sections[3].text, /ขอให้/);
  assert.match(result.sections[3].text, /ขอบคุณ/);
  assert.match(result.sections[3].text, /พบกันใหม่/);
});

test('quota-safe fallback uses feminine Thai particles for the female-friendly profile', () => {
  const result = buildQuotaSafeNarration(context(), 'female-friendly');
  assert.match(result.sections[0].text, /สวัสดีตอนเช้าค่ะ/);
  assert.match(result.sections[3].text, /ขอให้.*นะคะ/);
  assert.match(result.sections[3].text, /พบกันใหม่.*นะคะ/);
  assert.doesNotMatch(result.spokenText, /นะค่ะ/);
});

test('narrator uses the configured fallback model when the primary returns 429', async () => {
  const calls = [];
  const result = await generateNarration(context(), config(), {
    fetchImpl: async (url) => {
      calls.push(url);
      return calls.length === 1 ? response({ error: 'quota' }, 429) : response({ sections: sections('สำรอง') });
    },
    maxAttempts: 1,
    fallbackMaxAttempts: 1,
  });
  assert.equal(result.provider, 'gemini-fallback');
  assert.equal(calls.length, 2);
  assert.match(calls[1], /gemini-fallback-test/);
  assert.equal(result.sections.length, 4);
});

test('narrator uses quota-safe speech when Gemini network fetch fails', async () => {
  let calls = 0;
  const result = await generateNarration(context(), config(), {
    fetchImpl: async () => { calls += 1; throw new TypeError('fetch failed'); },
    maxAttempts: 1,
  });
  assert.equal(result.provider, 'quota-safe-fallback');
  assert.equal(result.sections.length, 4);
  assert.match(result.spokenText, /สวัสดี/);
  assert.equal(calls, 1);
});

test('narrator uses quota-safe speech after Gemini 503 recovery is exhausted', async () => {
  let calls = 0;
  const result = await generateNarration(context(), config(), {
    fetchImpl: async () => { calls += 1; return response({ error: 'unavailable' }, 503); },
    maxAttempts: 1,
    recoveryAttempts: 1,
  });
  assert.equal(result.provider, 'quota-safe-fallback');
  assert.equal(result.sections.length, 4);
  assert.equal(calls, 2);
});

test('quota-safe fallback contains four distinct sections and does not pad by repeating', async () => {
  const result = await generateNarration(context(), config(), {
    fetchImpl: async () => response({ error: 'quota' }, 429),
    maxAttempts: 1,
    fallbackMaxAttempts: 1,
  });
  assert.equal(result.provider, 'quota-safe-fallback');
  assert.equal(result.sections.length, 4);
  assert.equal(new Set(result.sections.map((section) => section.text)).size, 4);
  assert.equal(result.spokenText.split('\n').length, 4);
});

test('quota-safe fallback includes distinct available weather details without inventing them', () => {
  const result = buildQuotaSafeNarration(context());
  const weatherText = result.sections[2].text;
  assert.match(weatherText, /มีเมฆบางส่วน/);
  assert.match(weatherText, /อุณหภูมิที่รายงานตอนนี้ประมาณ 27 องศาเซลเซียส/);
  assert.match(weatherText, /ความชื้น.*81 เปอร์เซ็นต์/);
  assert.match(weatherText, /ความเร็วลม.*12 กิโลเมตรต่อชั่วโมง/);
  assert.match(weatherText, /ต่ำสุด.*24.*สูงสุด.*32/);
  assert.match(weatherText, /ช่วงบ่าย.*55 เปอร์เซ็นต์/);
  assert.match(weatherText, /2\.1 มิลลิเมตร/);
});

test('narrator works without API credentials in test mode using the concise fallback', async () => {
  const result = await generateNarration(context(), config({ content: {} }));
  assert.equal(result.provider, 'fallback');
  assert.equal(result.sections.length, 4);
  assert.deepEqual(result.sections[0].factsUsed, context().factsSnapshot.factIds);
  assert.match(result.spokenText, /สถานการณ์น้ำ/);
});

test('production narration requires an API key', async () => {
  await assert.rejects(() => generateNarration(context(), config({ mode: 'production', dryRun: false, content: {} })), /GEMINI_API_KEY/);
});
