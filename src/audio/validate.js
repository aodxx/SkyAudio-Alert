// src/audio/validate.js
// Validates generated audio using container metadata before sending to LINE.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const MIN_DURATION_MS = 10_000;
const DEFAULT_MAX_DURATION_MS = 18 * 60 * 1000;
const DEFAULT_MAX_FILE_BYTES = 16 * 1024 * 1024;
const LONGFORM_MIN_DURATION_MS = 601_000;

const MPEG1_L3_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MPEG2_L3_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 25: [11025, 12000, 8000] };

function makeAudioError(message) {
  const err = new Error(message);
  err.stage = 'audio.validate';
  err.retryable = false;
  return err;
}

function parseWithFfprobe(buffer) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyaudio-probe-'));
  const file = path.join(dir, 'audio.mp3');
  try {
    fs.writeFileSync(file, buffer);
    const output = execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration:stream=codec_name,bit_rate,sample_rate',
      '-of', 'json', file,
    ], { encoding: 'utf8', timeout: 30000 });
    const parsed = JSON.parse(output);
    const duration = Number(parsed.format?.duration);
    const stream = (parsed.streams || []).find((item) => item.codec_name === 'mp3') || parsed.streams?.[0];
    const bitrateKbps = Number(stream?.bit_rate) > 0 ? Math.round(Number(stream.bit_rate) / 1000) : undefined;
    const sampleRate = Number(stream?.sample_rate) > 0 ? Number(stream.sample_rate) : undefined;
    if (!Number.isFinite(duration) || duration <= 0 || !stream) return null;
    return { durationMs: Math.round(duration * 1000), bitrateKbps, sampleRate };
  } catch (_) {
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function parseMp3ByFrame(buffer) {
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
    const durationMs = Math.round((buffer.length - i) * 8 * 1000 / (bitrateKbps * 1000));
    return { durationMs, bitrateKbps, sampleRate };
  }
  return null;
}

function parseMp3(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  return parseWithFfprobe(buffer) || parseMp3ByFrame(buffer);
}

function estimateDurationMs(script, speakingRate) {
  const charCount = String(script || '').replace(/\s/g, '').length;
  const rate = speakingRate > 0 ? speakingRate : 1;
  return Math.round((charCount / (9 * rate)) * 1000);
}

function validateAudio(buffer, script, speakingRate, options = {}) {
  if (!buffer || buffer.length === 0) throw makeAudioError('Synthesized audio buffer is empty');
  const maxFileBytes = Number.isFinite(options.maxFileBytes) ? options.maxFileBytes : DEFAULT_MAX_FILE_BYTES;
  const minDurationMs = Number.isFinite(options.minDurationMs) ? options.minDurationMs : MIN_DURATION_MS;
  const maxDurationMs = Number.isFinite(options.maxDurationMs) ? options.maxDurationMs : DEFAULT_MAX_DURATION_MS;
  if (buffer.length > maxFileBytes) throw makeAudioError('Audio file too large: ' + buffer.length + ' bytes (max ' + maxFileBytes + ')');
  const parsed = parseMp3(buffer);
  if (!parsed || parsed.durationMs <= 0) throw makeAudioError('Audio is not a valid MP3 or has no readable duration');
  if (parsed.durationMs < minDurationMs) throw makeAudioError('Audio duration is too short: ' + parsed.durationMs + 'ms (minimum ' + minDurationMs + 'ms)');
  if (parsed.durationMs > maxDurationMs) throw makeAudioError('Audio duration is too long: ' + parsed.durationMs + 'ms (maximum ' + maxDurationMs + 'ms)');
  return { durationMs: parsed.durationMs, byteLength: buffer.length, mimeType: 'audio/mpeg', bitrateKbps: parsed.bitrateKbps, sampleRate: parsed.sampleRate,
    ...(options.longForm ? { longForm: true, minDurationMs } : {}) };
}

module.exports = { validateAudio, parseMp3, estimateDurationMs, MIN_DURATION_MS, LONGFORM_MIN_DURATION_MS };
