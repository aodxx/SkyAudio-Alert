// src/audio/tts.js
// Thai TTS adapter. Edge TTS is the free default; Google remains optional.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

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
  // A negative rate must be attached to the option. Passing "-5%" as the
  // next argv token makes argparse treat it as another option.
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
  const body = { input: { text: script }, voice: { languageCode: config.languageCode, name: config.voiceName }, audioConfig: { audioEncoding: 'MP3', speakingRate: config.speakingRate } };
  const res = await doFetch(`${TTS_URL}?key=${config.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw makeError(`Google TTS request failed: ${res.status}`, res.status >= 500 || res.status === 429, text.replace(new RegExp(config.apiKey, 'g'), '***').slice(0, 300));
  }
  const json = await res.json();
  if (!json.audioContent) throw makeError('Google TTS response missing audioContent');
  return Buffer.from(json.audioContent, 'base64');
}

async function synthesizeSpeech(script, config, opts = {}) {
  if (!script || !script.trim()) throw makeError('Thai TTS script is empty');
  if (config.provider === 'google') return synthesizeWithGoogle(script, config, opts);
  return synthesizeWithEdge(script, config);
}

module.exports = { synthesizeSpeech, edgeRate };
