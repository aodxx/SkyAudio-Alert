const test = require('node:test');
const assert = require('node:assert/strict');
const { withRetry, GEMINI_RETRY_OPTIONS } = require('../src/core/retry');

test('Gemini retry profile uses bounded exponential backoff with jitter', async () => {
  assert.deepEqual(GEMINI_RETRY_OPTIONS, {
    retries: 4,
    baseDelayMs: 1000,
    maxDelayMs: 60000,
    jitterRatio: 0.5,
  });
  const delays = [];
  let attempts = 0;
  const result = await withRetry(async () => {
    attempts += 1;
    if (attempts < 5) {
      const error = new Error('temporary unavailable');
      error.retryable = true;
      throw error;
    }
    return 'recovered';
  }, {
    ...GEMINI_RETRY_OPTIONS,
    maxDelayMs: 6000,
    random: () => 1,
    sleep: async (delayMs) => delays.push(delayMs),
  });

  assert.equal(result, 'recovered');
  assert.equal(attempts, 5);
  assert.deepEqual(delays, [1500, 3000, 6000, 6000]);
});

test('retry wrapper does not retry permanent client errors', async () => {
  let attempts = 0;
  const error = new Error('invalid request');
  error.retryable = false;

  await assert.rejects(withRetry(async () => {
    attempts += 1;
    throw error;
  }, { sleep: async () => assert.fail('permanent errors should not sleep') }), error);

  assert.equal(attempts, 1);
});
