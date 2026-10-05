const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runPipeline } = require('../src/core/pipeline');

const root = path.join(__dirname, '..');
const weatherFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/weather/sunny.json'), 'utf8'));
const floodFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/flood/watch.json'), 'utf8'));

function testConfig() {
  return {
    mode: 'test', dryRun: true, runId: 'separation-test',
    location: { name: 'บ้านลำพาย', district: 'ต.โคกชะงาย', province: 'พัทลุง', lat: 7.6, lon: 100, timezone: 'Asia/Bangkok' },
    thresholds: { hotApparent: 35, coolMorning: 23, rainProbNotable: 40, rainProbHigh: 65, strongWindKmh: 35, heavyRainMm: 10 },
    flood: { sourceUrl: '', freshnessLimitMinutes: 180, degradedMode: 'unknown-weather' },
    content: { apiKey: '', model: '', fallbackModel: '' },
    tts: { provider: 'mock', profile: 'male-friendly', speakingRate: 0.92 },
    storage: { audioDir: 'public/audio' },
    line: {},
  };
}

function narration(factsSnapshot, text = 'สวัสดีครับ วันนี้รายงานสถานการณ์น้ำตามข้อมูลที่ตรวจสอบได้') {
  return {
    provider: 'test-narrator',
    sections: Array.from({ length: 10 }, (_, index) => ({
      id: 'section-' + index,
      title: 'ช่วงรายงาน',
      text,
      factsUsed: factsSnapshot.factIds,
    })),
    spokenText: Array.from({ length: 10 }, () => text).join('\n'),
    totalCharacters: text.length * 10,
  };
}

function overrides(state, options = {}) {
  return {
    shouldSkipDuplicateProductionRun: () => false,
    fetchFlood: async () => ({ ...floodFixture, stations: [], freshness: { state: 'fresh', ageMinutes: 15 } }),
    fetchWeather: async () => weatherFixture,
    generateLongFormNarration: async (context) => {
      state.narrationContext = context;
      return narration(context.factsSnapshot, options.spokenText);
    },
    synthesizeLongFormSpeech: async (sections) => {
      state.ttsSections = sections;
      return Buffer.from('mock audio bytes');
    },
    validateAudio: () => ({ durationMs: 610000, byteLength: 16, mimeType: 'audio/mpeg', bitrateKbps: 64, sampleRate: 24000 }),
    storeAudio: () => ({ url: 'https://cdn.example.test/daily.mp3', committed: false, skipped: true, relPath: 'public/audio/daily.mp3' }),
    pushMessages: async (messages) => { state.sentMessages = messages; },
    writeStatusReport: () => {},
  };
}

test('pipeline builds Flex independently and delivers it before the separately generated Audio message', async () => {
  const state = {};
  const result = await runPipeline(testConfig(), overrides(state));

  assert.equal(result.flexMessage.type, 'flex');
  assert.equal(result.flexMessage.contents.type, 'carousel');
  assert.equal(result.messages[0].type, 'flex');
  assert.equal(result.messages[1].type, 'audio');
  assert.equal(result.presentationPlan, undefined);
  assert.equal(result.reportData, undefined);
  assert.equal(state.narrationContext.flexMessage, undefined);
  assert.equal(state.narrationContext.presentationPlan, undefined);
  assert.equal(state.narrationContext.factsSnapshot.severity, 'watch');
  assert.equal(result.stages['content.generate'], undefined);
  assert.equal(result.stages['content.presentation'], undefined);
  assert.equal(result.stages['flex.lint'], 'success');
  assert.equal(result.stages['content.safety'], 'success');
  assert.equal(result.stages['line.send'], 'skipped');
});

test('unsafe narration is replaced by a safe fallback before TTS', async () => {
  const state = {};
  const deps = overrides(state, { spokenText: 'น้ำท่วมแน่นอนครับ' });
  deps.generateLongFormNarration = async (context) => ({
    ...narration(context.factsSnapshot, 'น้ำท่วมแน่นอนครับ'),
    sections: Array.from({ length: 10 }, (_, index) => ({ id: 'section-' + index, title: 'ช่วงรายงาน', text: 'น้ำท่วมแน่นอนครับ', factsUsed: context.factsSnapshot.factIds })),
  });
  const result = await runPipeline(testConfig(), deps);
  assert.equal(result.stages['content.safety'], 'success');
  assert.equal(result.stages['tts.synthesize'], 'success');
  assert.ok(state.ttsSections.every((text) => !text.includes('น้ำท่วมแน่นอน')));
  assert.match(result.narration.spokenText, /ยังยืนยัน|สถานการณ์น้ำ/);
});
