const test = require('node:test');
const assert = require('node:assert/strict');
const { buildConfig } = require('../src/config');

function withEnv(values, callback) {
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('config defaults flood-source failure policy to no-send', () => {
  withEnv({
    RUN_MODE: 'test',
    DRY_RUN: 'true',
    FLOOD_DEGRADED_MODE: null,
    LINE_CHANNEL_ACCESS_TOKEN_TEST: null,
    LINE_GROUP_ID_TEST: null,
  }, () => {
    assert.equal(buildConfig().flood.degradedMode, 'no-send');
  });
});

test('production mode is locked before LINE credentials can enable a send', () => {
  withEnv({
    RUN_MODE: 'production',
    DRY_RUN: 'false',
    LINE_CHANNEL_ACCESS_TOKEN_PROD: 'configured-token-placeholder',
    LINE_GROUP_ID_PROD: 'configured-group-placeholder',
  }, () => {
    assert.throws(
      () => buildConfig(),
      /Production is locked until an official machine-readable flood API adapter and verified Phatthalung station mapping are implemented/
    );
  });
});

const approvedDailyHtmlProductionEnv = {
  RUN_MODE: 'production',
  DRY_RUN: 'false',
  ALLOW_DAILY_HTML_PRODUCTION_EXCEPTION: 'true',
  GITHUB_WORKFLOW: 'Daily Flood-first announcement (PROD target)',
  GITHUB_WORKFLOW_REF: 'aodxx/SkyAudio-Alert/.github/workflows/weather-daily.yml@refs/heads/main',
  GITHUB_EVENT_NAME: 'schedule',
  GITHUB_REPOSITORY: 'aodxx/SkyAudio-Alert',
  GITHUB_REF: 'refs/heads/main',
  FLOOD_SOURCE_URL: 'https://chachoengsao-flood.vercel.app/phatthalung',
  FLOOD_DEGRADED_MODE: 'no-send',
  LINE_CHANNEL_ACCESS_TOKEN_PROD: 'configured-token-placeholder',
  LINE_GROUP_ID_PROD: 'configured-group-placeholder',
};

test('authorized daily HTML production schedule uses PROD secrets and requires audio', () => {
  withEnv(approvedDailyHtmlProductionEnv, () => {
    const config = buildConfig();
    assert.equal(config.mode, 'production');
    assert.equal(config.dryRun, false);
    assert.equal(config.flood.degradedMode, 'no-send');
    assert.equal(config.requireAudioForSend, true);
    assert.equal(config.line.channelAccessToken, 'configured-token-placeholder');
    assert.equal(config.line.groupId, 'configured-group-placeholder');
  });
});

test('daily HTML production exception rejects manual runs and non-approved workflows', () => {
  for (const overrides of [
    { GITHUB_EVENT_NAME: 'workflow_dispatch' },
    { GITHUB_REPOSITORY: 'aodxx/forked-copy' },
    { FLOOD_SOURCE_URL: 'https://example.invalid/flood.json' },
    { GITHUB_WORKFLOW_REF: 'aodxx/SkyAudio-Alert/.github/workflows/other.yml@refs/heads/main' },
  ]) {
    withEnv({ ...approvedDailyHtmlProductionEnv, ...overrides }, () => {
      assert.throws(() => buildConfig(), /Production is locked until an official machine-readable flood API/);
    });
  }
});
