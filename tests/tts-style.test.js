const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGeminiTtsStyle } = require('../src/audio/tts');

test('Gemini TTS style sounds like a natural community announcer', () => {
  const style = buildGeminiTtsStyle({ profile: 'male-friendly', speakingRate: 0.92 });
  assert.match(style, /Thai male village loudspeaker announcer/);
  assert.match(style, /warmly addressing familiar neighbors/);
  assert.match(style, /natural greeting and gentle conversational sign-off/);
  assert.match(style, /natural breathing and short pauses/);
  assert.match(style, /moderately slow and relaxed pacing/);
});

test('Gemini TTS style respects the female-friendly profile', () => {
  const style = buildGeminiTtsStyle({ profile: 'female-friendly', speakingRate: 1 });
  assert.match(style, /Thai female village loudspeaker announcer/);
  assert.match(style, /natural conversational pacing/);
});
