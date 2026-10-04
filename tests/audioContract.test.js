const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAudio, estimateDurationMs } = require('../src/audio/validate');

test('audio duration is adaptive and not a fixed report duration', () => {
  const short = estimateDurationMs('สวัสดีครับ',1);
  const long = estimateDurationMs('สวัสดีครับ '.repeat(80),1);
  assert.ok(long > short);
  assert.equal(estimateDurationMs('',1),10000);
});

test('audio validator rejects empty buffers', () => {
  assert.throws(() => validateAudio(Buffer.alloc(0)), /empty/);
});