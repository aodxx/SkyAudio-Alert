// src/audio/validate.js
// Validates an MP3 using ffprobe-measured duration before it can be sent to LINE.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const MIN_DURATION_MS = 10 * 1000;
const MAX_DURATION_MS = 5 * 60 * 1000;
const MAX_FILE_BYTES = 16 * 1024 * 1024;

const MPEG1_L3_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MPEG2_L3_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 25: [11025, 12000, 8000] };

function makeAudioError(message) {
  const err = new Error(message);
  err.stage = 'audio.validate';
  err.retryable = false;
  return err;
}

function parseMp3(buffer) {
  for (let i = 0; i + 4 <= buffer.length; i += 1) {
    if (buffer[i] !== 0xff || (buffer[i + 1] & 0xe0) !== 0xe0) continue;
    const versionBits = (buffer[i + 1] >> 3) & 0x03;
    const layerBits = (buffer[i + 1] >> 1) & 0x03;
    const bitrateIndex = (buffer[i + 2] >> 4) & 0x0f;
    const sampleIndex = (buffer[i + 2] >> 2) & 0x03;
    if (versionBits === 1 || layerBits !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) continue;
    const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : 25;
    const bitrates = version === 1 ? MPEG1_L3_BITRATES : MPEG2_L3_BITRATES;
    const sampleRate = SAMPLE_RATES[version][sampleIndex];
    const bitrateKbps = bitrates[bitrateIndex];
    if (!sampleRate || !bitrateKbps) continue;
    const padding = (buffer[i + 2] >> 1) & 1;
    const frameLength = version === 1 ? Math.floor((144 * bitrateKbps * 1000) / sampleRate) + padding : Math.floor((72 * bitrateKbps * 1000) / sampleRate) + padding;
    if (frameLength <= 0) continue;
    const durationEstimateMs = Math.round((buffer.length - i) * 8 / bitrateKbps);
    return { durationEstimateMs, bitrateKbps, sampleRate };
  }
  return null;
}

function estimateDurationMs(script, speakingRate) {
  const charCount = String(script || '').replace(/\s/g, '').length;
  const rate = speakingRate > 0 ? speakingRate : 1;
  return Math.round((charCount / (9 * rate)) * 1000);
}

function ffprobeDurationMs(buffer, options = {}) {
  const run = options.execFileSyncImpl || execFileSync;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyaudio-probe-'));
  const inputPath = path.join(dir, 'audio.mp3');
  try {
    fs.writeFileSync(inputPath, buffer);
    const output = run(options.ffprobePath || 'ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ], { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });
    const seconds = Number(String(output).trim());
    if (!Number.isFinite(seconds) || seconds <= 0) throw makeAudioError('ffprobe returned an invalid audio duration');
    return Math.round(seconds * 1000);
  } catch (error) {
    if (error.stage === 'audio.validate') throw error;
    throw makeAudioError('Unable to measure MP3 duration with ffprobe: ' + String(error.message || error).slice(0, 200));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function validateAudio(buffer, script, speakingRate, options = {}) {
  if (!buffer || buffer.length === 0) throw makeAudioError('Synthesized audio buffer is empty');
  const maxFileBytes = Number.isFinite(options.maxFileBytes) ? options.maxFileBytes : MAX_FILE_BYTES;
  const minDurationMs = Number.isFinite(options.minDurationMs) ? options.minDurationMs : MIN_DURATION_MS;
  const maxDurationMs = Number.isFinite(options.maxDurationMs) ? options.maxDurationMs : MAX_DURATION_MS;
  if (buffer.length > maxFileBytes) throw makeAudioError('Audio file too large: ' + buffer.length + ' bytes (max ' + maxFileBytes + ')');
  const parsed = parseMp3(buffer);
  if (!parsed) throw makeAudioError('Audio is not a valid MP3');
  const measured = typeof options.probeDurationMs === 'function'
    ? Number(options.probeDurationMs(buffer))
    : ffprobeDurationMs(buffer, options);
  if (!Number.isFinite(measured) || measured <= 0) throw makeAudioError('Unable to read a valid MP3 duration');
  if (measured < minDurationMs) throw makeAudioError('Audio duration is too short: ' + measured + 'ms (minimum ' + minDurationMs + 'ms)');
  if (measured > maxDurationMs) throw makeAudioError('Audio duration is too long: ' + measured + 'ms (maximum ' + maxDurationMs + 'ms)');
  return { durationMs: measured, byteLength: buffer.length, mimeType: 'audio/mpeg', bitrateKbps: parsed.bitrateKbps, sampleRate: parsed.sampleRate };
}

module.exports = {
  validateAudio,
  parseMp3,
  estimateDurationMs,
  ffprobeDurationMs,
  MIN_DURATION_MS,
  MAX_DURATION_MS,
  MAX_FILE_BYTES,
};
