// src/audio/validate.js
// Validates the generated audio before it is sent to LINE.
//
// NOTE on duration: LINE's Audio Message requires a duration in
// milliseconds. Parsing exact MP3 duration needs a small frame-header
// parser; for V1 we use a conservative heuristic based on script length and
// speaking rate, then clamp it. This is documented as a known
// simplification (see CHANGELOG) and can be replaced with exact parsing in
// a later phase without touching any other module.

const MIN_DURATION_MS = 10_000; // 10s
const MAX_DURATION_MS = 110_000; // ~1m50s (LINE push audio practical ceiling)
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB, well under LINE's 200MB limit

// Rough Thai speech rate: ~9 characters/second at speakingRate 1.0.
function estimateDurationMs(script, speakingRate) {
  const charCount = script.replace(/\s/g, '').length;
  const rate = speakingRate > 0 ? speakingRate : 1;
  const seconds = charCount / (9 * rate);
  const ms = Math.round(seconds * 1000);
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, ms));
}

function validateAudio(buffer, script, speakingRate) {
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

  const durationMs = estimateDurationMs(script, speakingRate);
  return { durationMs, byteLength: buffer.length };
}

module.exports = { validateAudio, estimateDurationMs };
