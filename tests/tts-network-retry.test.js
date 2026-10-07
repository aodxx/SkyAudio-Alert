const test = require('node:test');
const assert = require('node:assert/strict');
const { synthesizeSpeech } = require('../src/audio/tts');
const { withRetry } = require('../src/core/retry');

test('Gemini TTS network fetch failures are retryable by the shared retry wrapper', async () => {
  let attempts = 0;
  const config = {
    provider: 'gemini',
    apiKey: 'test-key',
    model: 'gemini-test-tts',
    profile: 'male-friendly',
    voiceName: 'Achird',
    speakingRate: 0.92,
  };
  const fetchImpl = async () => {
    attempts += 1;
    if (attempts < 3) throw new TypeError('fetch failed');
    return { ok: false, status: 400, text: async () => 'invalid test request' };
  };

  await assert.rejects(
    withRetry(() => synthesizeSpeech('สวัสดีครับ', config, { fetchImpl }), { baseDelayMs: 0 }),
    (error) => {
      assert.equal(error.stage, 'audio.synthesize');
      assert.equal(error.retryable, false);
      assert.match(error.message, /400/);
      return true;
    },
  );
  assert.equal(attempts, 3, 'two transient fetch failures should be retried before the third response');
});
