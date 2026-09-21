// src/core/logger.js
// Structured, single-line JSON logs (PRD section 19). Never logs secrets —
// callers must only pass safe fields.

function log(runId, stage, status, extra = {}) {
  const entry = {
    runId,
    stage,
    status, // 'start' | 'success' | 'failure' | 'retry'
    timestamp: new Date().toISOString(),
    ...extra,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

module.exports = { log };
