#!/usr/bin/env node
// src/index.js — entry point.
// Usage:
//   RUN_MODE=test  node src/index.js     (uses *_TEST secrets)
//   RUN_MODE=production node src/index.js (uses *_PROD secrets)
//   DRY_RUN=true node src/index.js        (build everything, skip LINE push
//                                          and skip committing audio)

const { buildConfig } = require('./config');
const { runPipeline } = require('./core/pipeline');
const { log } = require('./core/logger');
const { writeStatusReport } = require('./core/statusReport');

async function main() {
  let config;
  try {
    config = buildConfig();
  } catch (err) {
    console.error(JSON.stringify({ stage: 'config', status: 'failure', message: err.message }));
    process.exit(1);
  }

  log(config.runId, 'run', 'start', { mode: config.mode, dryRun: config.dryRun });

  try {
    const result = await runPipeline(config);
    log(config.runId, 'run', 'success', { stages: result.stages });
    process.exit(0);
  } catch (err) {
    log(config.runId, err.stage || 'run', 'failure', { message: err.message, detail: err.detail });
    writeStatusReport(
      { runId: config.runId, stages: {}, lastError: { stage: err.stage, message: err.message, detail: err.detail } },
      config
    );
    process.exit(1);
  }
}

main();
