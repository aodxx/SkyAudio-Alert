const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAudio, estimateDurationMs, ffprobeDurationMs, MIN_DURATION_MS, MAX_DURATION_MS, MAX_FILE_BYTES } = require('../src/audio/validate');
const fs = require('node:fs');
const path = require('node:path');

const validMp3 = Buffer.alloc(4096);
validMp3.set([0xff, 0xfb, 0x90, 0x64]);

function validateAt(durationMs) {
  return validateAudio(validMp3, 'บททดสอบ', 1, { probeDurationMs: () => durationMs });
}

test('script duration estimate grows with narration length but is not used as the audio gate', () => {
  const short = estimateDurationMs('สวัสดีครับ', 1);
  const long = estimateDurationMs('สวัสดีครับ '.repeat(80), 1);
  assert.ok(long > short);
  assert.equal(estimateDurationMs('', 1), 0);
});

test('audio validator rejects empty buffers before probing duration', () => {
  assert.throws(() => validateAudio(Buffer.alloc(0)), /empty/);
});

test('audio validator keeps the 16 MiB file-size ceiling', () => {
  assert.equal(MAX_FILE_BYTES, 16 * 1024 * 1024);
  assert.throws(() => validateAudio(Buffer.alloc(5), '', 1, { maxFileBytes: 4 }), /Audio file too large/);
});

test('audio gate enforces only a 10-second validity floor and a five-minute upper limit', () => {
  assert.equal(MIN_DURATION_MS, 10000);
  assert.equal(MAX_DURATION_MS, 300000);
  assert.throws(() => validateAt(9999), /minimum 10000ms/);
  assert.equal(validateAt(10000).durationMs, 10000);
  assert.equal(validateAt(101088).durationMs, 101088);
  assert.equal(validateAt(300000).durationMs, 300000);
  assert.throws(() => validateAt(300001), /maximum 300000ms/);
});

test('audio duration is taken from the injected ffprobe measurement rather than MP3 byte estimate', () => {
  const actual = validateAudio(validMp3, 'บททดสอบ', 1, { probeDurationMs: () => 239876 });
  assert.equal(actual.durationMs, 239876);
  assert.equal(actual.mimeType, 'audio/mpeg');
});

test('ffprobe command failure becomes a non-retryable audio.validate error', () => {
  assert.throws(() => ffprobeDurationMs(validMp3, { ffprobePath: 'sky-audio-missing-ffprobe' }), (error) => error.stage === 'audio.validate' && error.retryable === false);
});

test('invalid duration-probe output fails closed with an audio.validate error', () => {
  assert.throws(() => validateAudio(validMp3, 'บททดสอบ', 1, { probeDurationMs: () => Number.NaN }), (error) => error.stage === 'audio.validate' && /duration/.test(error.message));
});

test('ffprobe can measure a repository MP3 from the validator input buffer', () => {
  const sample = fs.readFileSync(path.join(__dirname, '..', 'public', 'audio', '2026-09-25.mp3'));
  assert.ok(ffprobeDurationMs(sample) > 0);
});
