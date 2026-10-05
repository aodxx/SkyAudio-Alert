const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAudio, estimateDurationMs, LONGFORM_MIN_DURATION_MS } = require('../src/audio/validate');

test('audio duration is adaptive and not a fixed report duration', () => {
  const short = estimateDurationMs('สวัสดีครับ',1);
  const long = estimateDurationMs('สวัสดีครับ '.repeat(80),1);
  assert.ok(long > short);
  assert.equal(estimateDurationMs('',1),0);
});

test('audio validator rejects empty buffers', () => {
  assert.throws(() => validateAudio(Buffer.alloc(0)), /empty/);
});

test('long-form duration gate is greater than ten minutes and is not clamped to 190 seconds', () => {
  assert.equal(LONGFORM_MIN_DURATION_MS, 601000);
  assert.ok(estimateDurationMs('ก'.repeat(10000), 1) > 190000);
});
