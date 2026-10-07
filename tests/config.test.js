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
