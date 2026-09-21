// src/audio/tts.js
// Google Cloud Text-to-Speech adapter (REST, API-key auth — no SDK needed).
// Free tier: ~4,000,000 chars/month for Standard voices, ~1,000,000 for
// WaveNet/Neural2 (check current Google Cloud pricing page — this can
// change). One daily ~60-second announcement stays far under any tier.
//
// The provider is intentionally isolated behind this single function so it
// can be swapped later (PRD G7 — provider independence).

const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

async function synthesizeSpeech(script, ttsConfig, opts = {}) {
  const doFetch = opts.fetchImpl || fetch;

  if (!ttsConfig.apiKey) {
    const err = new Error('GOOGLE_TTS_API_KEY is not configured');
    err.stage = 'audio.synthesize';
    err.retryable = false;
    throw err;
  }

  const body = {
    input: { text: script },
    voice: {
      languageCode: ttsConfig.languageCode,
      name: ttsConfig.voiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: ttsConfig.speakingRate,
    },
  };

  const res = await doFetch(`${TTS_URL}?key=${ttsConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Google TTS request failed: ${res.status}`);
    err.stage = 'audio.synthesize';
    err.retryable = res.status >= 500 || res.status === 429;
    // Never echo the API key back into logs.
    err.detail = text.replace(new RegExp(ttsConfig.apiKey, 'g'), '***').slice(0, 300);
    throw err;
  }

  const json = await res.json();
  if (!json.audioContent) {
    const err = new Error('Google TTS response missing audioContent');
    err.stage = 'audio.synthesize';
    err.retryable = false;
    throw err;
  }

  return Buffer.from(json.audioContent, 'base64');
}

module.exports = { synthesizeSpeech };
