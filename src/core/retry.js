// src/core/retry.js
// Small exponential-backoff retry wrapper for transient failures
// (weather API timeouts, LINE 5xx/429, etc.) — PRD R1/R2.

async function withRetry(fn, { retries = 2, baseDelayMs = 500, onRetry } = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn(attempt);
    } catch (err) {
      const retryable = err && err.retryable;
      if (!retryable || attempt >= retries) throw err;
      const delay = baseDelayMs * 2 ** attempt;
      if (onRetry) onRetry(err, attempt, delay);
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
    }
  }
}

module.exports = { withRetry };
