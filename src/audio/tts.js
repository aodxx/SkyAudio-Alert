// src/audio/tts.js
// Thai TTS adapter. Edge TTS is the free default; Gemini 3.8 Flash TTS is optional.
// Gemini returns WAV (24 kHz, mono, 16-bit PCM) for unary requests; LINE receives MP3.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const GEMINI_TTS_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function makeError(message, retryable = false, detail) {
  const err = new Error(message);
  err.stage = 'audio.synthesize';
  err.retryable = retryable;
  if (detail) err.detail = detail;
  return err;
}

function edgeRate(rate) {
  const pct = Math.round((rate - 1) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

function synthesizeWithEdge(script, config) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyaudio-'));
  const output = path.join(dir, 'speech.mp3');
  const args = [
    '-m', 'edge_tts',
    '--voice', config.voiceName,
    `--rate=${edgeRate(config.speakingRate)}`,
    '--text', script,
    '--write-media', output,
  ];
  try {
    try {
      execFileSync('python3', args, { stdio: 'pipe', timeout: 120000 });
    } catch (_) {
      execFileSync('python', args, { stdio: 'pipe', timeout: 120000 });
    }
    if (!fs.existsSync(output)) throw makeError('Edge TTS did not create an MP3');
    const buffer = fs.readFileSync(output);
    if (!buffer.length) throw makeError('Edge TTS returned an empty MP3');
    return buffer;
  } catch (err) {
    if (err.stage) throw err;
    throw makeError('Edge TTS generation failed', true, String(err.stderr || err.message || '').slice(0, 300));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function synthesizeWithGoogle(script, config, opts = {}) {
  const doFetch = opts.fetchImpl || fetch;
  if (!config.apiKey) throw makeError('GOOGLE_TTS_API_KEY is not configured');
  const body = {
    input: { text: script },
    voice: { languageCode: config.languageCode, name: config.voiceName },
    audioConfig: { audioEncoding: 'MP3', speakingRate: config.speakingRate },
  };
  const res = await doFetch(`${TTS_URL}?key=${config.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw makeError(`Google TTS request failed: ${res.status}`, res.status >= 500 || res.status === 429, text.replace(new RegExp(config.apiKey, 'g'), '***').slice(0, 300));
  }
  const json = await res.json();
  if (!json.audioContent) throw makeError('Google TTS response missing audioContent');
  return Buffer.from(json.audioContent, 'base64');
}

async function synthesizeWithGemini(script, config, opts = {}) {
  const doFetch = opts.fetchImpl || fetch;
  if (!config.apiKey) throw makeError('GEMINI_API_KEY is not configured');

  const style = config.style || 'warm, friendly and natural Thai village morning announcement; clear pronunciation; conversational and reassuring; moderately paced; suitable for older listeners; do not sound like a commercial or a newsreader';
  const body = {
    contents: [{
      role: 'user',
      parts: [{
        text: script,
        speech_metadata: { style },
      }],
    }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { voice: config.voiceName },
      },
    },
  };

  const model = config.model || 'gemini-3.8-flash-tts';
  const url = `${GEMINI_TTS_BASE_URL}/${encodeURIComponent(model)}:generateContent`;
  const res = await doFetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw makeError(
      `Gemini TTS request failed: ${res.status}`,
      res.status >= 500 || res.status === 429,
      text.slice(0, 500),
    );
  }

  const json = await res.json();
  const encoded = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!encoded) throw makeError('Gemini TTS response missing audio data');

  const wav = Buffer.from(encoded, 'base64');
  if (wav.length < 44 || wav.subarray(0, 4).toString() !== 'RIFF') {
    throw makeError('Gemini TTS returned audio without a valid WAV header');
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyaudio-gemini-'));
  const wavPath = path.join(dir, 'speech.wav');
  const mp3Path = path.join(dir, 'speech.mp3');
  try {
    fs.writeFileSync(wavPath, wav);
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-i', wavPath,
      '-codec:a', 'libmp3lame',
      '-b:a', '128k',
      '-ar', '24000',
      '-ac', '1',
      mp3Path,
    ], { stdio: 'pipe', timeout: 120000 });
    if (!fs.existsSync(mp3Path)) throw makeError('ffmpeg did not create Gemini MP3');
    const mp3 = fs.readFileSync(mp3Path);
    if (!mp3.length) throw makeError('Gemini MP3 is empty');
    return mp3;
  } catch (err) {
    if (err.stage) throw err;
    throw makeError('Gemini WAV-to-MP3 conversion failed', true, String(err.stderr || err.message || '').slice(0, 300));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function synthesizeSpeech(script, config, opts = {}) {
  if (!script || !script.trim()) throw makeError('Thai TTS script is empty');
  if (config.provider === 'gemini') return synthesizeWithGemini(script, config, opts);
  if (config.provider === 'google') return synthesizeWithGoogle(script, config, opts);
  return synthesizeWithEdge(script, config);
}

module.exports = { synthesizeSpeech, edgeRate };