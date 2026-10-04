const assert = require('node:assert/strict');
const { buildConfig } = require('../src/config');
const { generateGeminiReport } = require('../src/content/geminiReport');
const { synthesizeSpeech } = require('../src/audio/tts');
const { validateAudio } = require('../src/audio/validate');

async function main() {
  const config = buildConfig();
  assert.equal(config.content.provider, 'gemini');
  assert.equal(config.tts.provider, 'gemini');
  assert.ok(config.content.apiKey, 'GEMINI_API_KEY is required');

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
    location: config.location,
    date: 'ทดสอบ',
  };

  const report = await generateGeminiReport(context, config);
  assert.equal(report.provider, 'gemini');
  assert.ok(report.spokenText);
  assert.ok(report.priority);

  const audio = await synthesizeSpeech(report.spokenText, config.tts);
  assert.ok(Buffer.isBuffer(audio) && audio.length > 0);
  const audioCheck = validateAudio(audio);
  assert.ok(audioCheck.durationMs > 0);
  console.log(JSON.stringify({
    ok: true,
    contentProvider: report.provider,
    priority: report.priority,
    ttsProvider: config.tts.provider,
    voice: config.tts.voiceName,
    bytes: audio.length,
    audio: audioCheck,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
