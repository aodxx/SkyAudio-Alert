const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runPipeline } = require('../src/core/pipeline');

const root = path.join(__dirname, '..');
const weatherFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/weather/sunny.json'), 'utf8'));
const floodFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/flood/watch.json'), 'utf8'));

function testConfig(dryRun = true) {
  return {
    mode: 'test', dryRun, runId: 'audio-medium-test',
    location: { name: 'บ้านลำพาย', district: 'ต.โคกชะงาย', province: 'พัทลุง', lat: 7.6, lon: 100, timezone: 'Asia/Bangkok' },
    thresholds: { hotApparent: 35, coolMorning: 23, rainProbNotable: 40, rainProbHigh: 65, strongWindKmh: 35, heavyRainMm: 10 },
    flood: { sourceUrl: '', freshnessLimitMinutes: 180, degradedMode: 'unknown-weather' },
    content: { apiKey: '', model: '', fallbackModel: '' },
    tts: { provider: 'mock', profile: 'male-friendly', speakingRate: 0.92 },
    storage: { audioDir: 'public/audio' },
    line: {},
  };
}

function narration(factsSnapshot, textOverride) {
  const texts = textOverride ? [textOverride, 'รายละเอียดข้อมูลน้ำและเวลาอัปเดต', 'พยากรณ์อากาศเป็นข้อมูลประกอบเท่านั้น', 'ติดตามคำแนะนำจากแหล่งข้อมูลล่าสุด'] : [
    'สวัสดีครับ วันนี้รายงานสถานการณ์น้ำตามข้อมูลที่ตรวจสอบได้',
    'ข้อมูลน้ำมีความสดใหม่ตามเกณฑ์และควรอ่านจากแหล่งข้อมูลที่ระบุ',
    'พยากรณ์อากาศเป็นข้อมูลประกอบ ไม่ใช่หลักฐานยืนยันว่าน้ำท่วม',
    'ติดตามคำแนะนำจากหน่วยงานและตรวจข้อมูลล่าสุดก่อนตัดสินใจ',
  ];
  const titles = ['เปิดรายงาน', 'สถานการณ์น้ำ', 'อากาศประกอบ', 'สิ่งที่ควรติดตาม'];
  const ids = ['opening', 'water', 'weather', 'next-steps'];
  const sections = texts.map((text, index) => ({ id: ids[index], title: titles[index], text, factsUsed: factsSnapshot.factIds }));
  const spokenText = sections.map((section) => section.text).join('\n');
  return { provider: 'test-narrator', sections, spokenText, totalCharacters: spokenText.length };
}

function overrides(state) {
  return {
    shouldSkipDuplicateProductionRun: () => false,
    fetchFlood: async () => ({ ...floodFixture, stations: [], freshness: { state: 'fresh', ageMinutes: 15 } }),
    fetchWeather: async () => weatherFixture,
    generateNarration: async (context) => {
      state.narrationContext = context;
      return narration(context.factsSnapshot);
    },
    synthesizeSpeech: async (script) => {
      state.ttsCalls = (state.ttsCalls || 0) + 1;
      state.ttsScript = script;
      return Buffer.from('mock audio bytes');
    },
    validateAudio: () => ({ durationMs: 240000, byteLength: 16, mimeType: 'audio/mpeg', bitrateKbps: 128, sampleRate: 24000 }),
    storeAudio: () => ({ url: 'https://cdn.example.test/daily.mp3', committed: false, skipped: true, relPath: 'public/audio/daily.mp3' }),
    pushMessages: async (messages) => { state.sentMessages = messages; },
    writeStatusReport: (result) => { state.statusResult = result; },
  };
}

test('pipeline builds Flex independently and makes one TTS call with the joined four-section script', async () => {
  const state = {};
  const result = await runPipeline(testConfig(), overrides(state));

  assert.equal(result.flexMessage.type, 'flex');
  assert.equal(result.flexMessage.contents.type, 'carousel');
  assert.deepEqual(result.messages.map((message) => message.type), ['flex', 'audio']);
  assert.equal(state.ttsCalls, 1);
  assert.equal(state.ttsScript, result.narration.spokenText);
  assert.equal(result.narration.sections.length, 4);
  assert.equal(result.presentationPlan, undefined);
  assert.equal(result.reportData, undefined);
  assert.equal(state.narrationContext.flexMessage, undefined);
  assert.equal(state.narrationContext.presentationPlan, undefined);
  assert.equal(state.narrationContext.factsSnapshot.severity, 'watch');
  assert.equal(result.stages['flex.lint'], 'success');
  assert.equal(result.stages['content.safety'], 'success');
  assert.equal(result.stages['line.send'], 'skipped');
});

test('no-send policy stops immediately when the flood source fails', async () => {
  const state = {};
  const config = testConfig(false);
  config.flood.degradedMode = 'no-send';
  const deps = overrides(state);
  let weatherCalls = 0;
  deps.fetchFlood = async () => { throw Object.assign(new Error('flood source unavailable'), { stage: 'flood.fetch', retryable: false }); };
  deps.fetchWeather = async () => { weatherCalls += 1; return weatherFixture; };

  await assert.rejects(() => runPipeline(config, deps), (error) => error.stage === 'flood.fetch');
  assert.equal(weatherCalls, 0);
  assert.equal(state.ttsCalls, undefined);
  assert.equal(state.sentMessages, undefined);
  assert.equal(state.statusResult.lastError.stage, 'flood.fetch');
});

test('no-send policy blocks stale, unknown, and stationless flood responses before downstream stages', async () => {
  const verified = {
    ...floodFixture,
    severity: 'watch',
    stations: [{ name: 'สถานีทดสอบ', waterway: 'คลองทดสอบ' }],
    freshness: { state: 'fresh', ageMinutes: 15 },
  };
  const invalidSituations = [
    { ...verified, freshness: { state: 'stale', ageMinutes: 240 } },
    { ...verified, severity: 'unknown' },
    { ...verified, stations: [] },
  ];

  for (const situation of invalidSituations) {
    const state = {};
    const config = testConfig(false);
    config.flood.degradedMode = 'no-send';
    const deps = overrides(state);
    let weatherCalls = 0;
    deps.fetchFlood = async () => situation;
    deps.fetchWeather = async () => { weatherCalls += 1; return weatherFixture; };

    await assert.rejects(() => runPipeline(config, deps), (error) => error.stage === 'flood.gate' && error.retryable === false);
    assert.equal(weatherCalls, 0);
    assert.equal(state.ttsCalls, undefined);
    assert.equal(state.sentMessages, undefined);
    assert.equal(state.statusResult.lastError.stage, 'flood.gate');
  }
});

test('live delivery pushes Flex and then Audio in separate LINE requests', async () => {
  const state = { batches: [] };
  const deps = overrides(state);
  deps.pushMessages = async (batch) => { state.batches.push(batch.map((message) => message.type)); };
  const result = await runPipeline(testConfig(false), deps);
  assert.deepEqual(state.batches, [['flex'], ['audio']]);
  assert.equal(result.flexDelivered, true);
  assert.equal(result.audioInfo.delivered, true);
  assert.equal(result.audioWithheld, false);
});

test('unsafe narration is replaced by a safe concise fallback before TTS', async () => {
  const state = {};
  const deps = overrides(state);
  deps.generateNarration = async (context) => narration(context.factsSnapshot, 'น้ำท่วมแน่นอนครับ');
  const result = await runPipeline(testConfig(), deps);
  assert.equal(result.stages['content.safety'], 'success');
  assert.equal(result.stages['tts.synthesize'], 'success');
  assert.ok(!state.ttsScript.includes('น้ำท่วมแน่นอน'));
  assert.equal(result.narration.sections.length, 4);
});

test('dry run treats local audio without a public URL as validated, not withheld', async () => {
  const state = {};
  const deps = overrides(state);
  deps.storeAudio = () => ({ url: null, committed: false, skipped: 'dry-run', relPath: 'public/audio/daily.mp3' });
  const result = await runPipeline(testConfig(), deps);
  assert.equal(result.audioWithheld, false);
  assert.equal(result.stages['audio.store'], 'success');
  assert.equal(result.audioInfo.url, null);
  assert.deepEqual(result.messages.map((message) => message.type), ['flex']);
});

test('TTS failure withholds Audio but still sends the valid Flex message', async () => {
  const state = {};
  const deps = overrides(state);
  deps.synthesizeSpeech = async () => {
    throw Object.assign(new Error('TTS unavailable'), { stage: 'audio.synthesize', retryable: false });
  };
  const result = await runPipeline(testConfig(false), deps);
  assert.deepEqual(state.sentMessages.map((message) => message.type), ['flex']);
  assert.equal(result.audioWithheld, true);
  assert.equal(result.stages['audio.withheld'], 'degraded');
  assert.equal(result.lastError.stage, 'audio.synthesize');
  assert.equal(result.stages['line.send'], 'success');
  assert.equal(state.statusResult.audioWithheld, true);
});

test('duration validation failure withholds only Audio and records audio.withheld', async () => {
  const state = {};
  const deps = overrides(state);
  deps.validateAudio = () => { throw Object.assign(new Error('audio exceeds technical duration limits'), { stage: 'audio.validate', retryable: false }); };
  const result = await runPipeline(testConfig(false), deps);
  assert.deepEqual(state.sentMessages.map((message) => message.type), ['flex']);
  assert.equal(result.stages['audio.validate'], 'failure');
  assert.equal(result.stages['audio.withheld'], 'degraded');
  assert.equal(result.lastError.stage, 'audio.validate');
});

test('LINE Audio push failure cannot undo the preceding Flex delivery', async () => {
  const state = { batches: [] };
  const deps = overrides(state);
  deps.pushMessages = async (batch) => {
    const types = batch.map((message) => message.type);
    state.batches.push(types);
    if (types.includes('audio')) throw Object.assign(new Error('Audio push unavailable'), { stage: 'line.send', retryable: false });
  };
  const result = await runPipeline(testConfig(false), deps);
  assert.deepEqual(state.batches, [['flex'], ['audio']]);
  assert.equal(result.stages['line.send'], 'success');
  assert.equal(result.stages['line.audio.send'], 'failure');
  assert.equal(result.stages['audio.withheld'], 'degraded');
  assert.equal(result.audioWithheld, true);
  assert.equal(result.audioInfo.delivered, false);
});

test('LINE push failure remains a delivery failure and is not mislabeled as audio withholding', async () => {
  const deps = overrides({});
  deps.pushMessages = async () => { throw Object.assign(new Error('LINE unavailable'), { stage: 'line.send', retryable: false }); };
  await assert.rejects(() => runPipeline(testConfig(false), deps), (error) => error.stage === 'line.send');
});
