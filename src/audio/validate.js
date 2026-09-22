// src/audio/validate.js
// Validates the generated audio before it is sent to LINE.

const MIN_DURATION_MS = 10_000;
const MAX_DURATION_MS = 110_000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const MPEG1_L3_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MPEG2_L3_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES = {
  1: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  25: [11025, 12000, 8000],
};

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
    const frameLength = version === 1
      ? Math.floor((144 * bitrateKbps * 1000) / sampleRate) + padding
      : Math.floor((72 * bitrateKbps * 1000) / sampleRate) + padding;
    if (frameLength <= 0) continue;
    const durationMs = Math.round((buffer.length - i) * 8 * 1000 / (bitrateKbps * 1000));
    return { durationMs, bitrateKbps, sampleRate };
  }
  return null;
}

// Kept as a public helper for callers that need a conservative estimate
// before an MP3 exists. Actual validation below always uses the MP3 frames.
function estimateDurationMs(script, speakingRate) {
  const charCount = String(script || '').replace(/\s/g, '').length;
  const rate = speakingRate > 0 ? speakingRate : 1;
  const seconds = charCount / (9 * rate);
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, Math.round(seconds * 1000)));
}

function validateAudio(buffer) {
  if (!buffer || buffer.length === 0) {
    const err = new Error('Synthesized audio buffer is empty');
    err.stage = 'audio.validate';
    err.retryable = false;
    throw err;
  }
  if (buffer.length > MAX_FILE_BYTES) {
    const err = new Error(`Audio file too large: ${buffer.length} bytes`);
    err.stage = 'audio.validate';
    err.retryable = false;
    throw err;
  }
  const parsed = parseMp3(buffer);
  if (!parsed || parsed.durationMs <= 0) {
    const err = new Error('Audio is not a valid MP3 or has no readable duration');
    err.stage = 'audio.validate';
    err.retryable = false;
    throw err;
  }
  return { durationMs: Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, parsed.durationMs)), byteLength: buffer.length, mimeType: 'audio/mpeg', bitrateKbps: parsed.bitrateKbps, sampleRate: parsed.sampleRate };
}

module.exports = { validateAudio, parseMp3, estimateDurationMs };
