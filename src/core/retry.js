// src/core/retry.js
// Small exponential-backoff retry wrapper for transient failures.

const GEMINI_RETRY_OPTIONS = Object.freeze({
  retries: 4,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  jitterRatio: 0.5,
});

async function withRetry(fn, {
  retries = 2,
  baseDelayMs = 500,
  maxDelayMs = 60000,
  jitterRatio = 0,
  random = Math.random,
  sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
  onRetry,
} = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn(attempt);
    } catch (err) {
      const retryable = err && err.retryable;
      if (!retryable || attempt >= retries) throw err;

      const maximum = Number.isFinite(maxDelayMs) ? Math.max(0, maxDelayMs) : Infinity;
      const backoff = Math.min(Math.max(0, baseDelayMs) * 2 ** attempt, maximum);
      const randomValue = Number(random());
      const boundedRandom = Number.isFinite(randomValue) ? Math.min(1, Math.max(0, randomValue)) : 0;
      const boundedJitter = Number.isFinite(jitterRatio) ? Math.max(0, jitterRatio) : 0;
      const delay = Math.min(maximum, Math.round(backoff * (1 + boundedJitter * boundedRandom)));

      if (onRetry) onRetry(err, attempt, delay);
      await sleep(delay);
      attempt += 1;
    }
  }
}

module.exports = { withRetry, GEMINI_RETRY_OPTIONS };
