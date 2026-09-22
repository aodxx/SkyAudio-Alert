// src/core/pipeline.js
// Orchestrates the full daily run: weather -> analysis -> forecast text ->
// flex -> tts -> validate -> storage -> line. A failed required stage fails the run.

const { fetchOpenMeteo } = require('../weather/openMeteo');
const { normalizeWeather } = require('../weather/normalize');
const { analyzeWeather } = require('../weather/analyzer');
const { buildForecastData } = require('../forecast/formatter');
const { buildFlex } = require('../flex/builder');
const { synthesizeSpeech } = require('../audio/tts');
const { validateAudio } = require('../audio/validate');
const { storeAudio } = require('../audio/storage');
const { pushMessages, buildAudioMessage } = require('../line/messagingApi');
const { withRetry } = require('./retry');
const { log } = require('./logger');
const { writeStatusReport } = require('./statusReport');

async function runPipeline(config) {
  const { runId } = config;
  const result = { runId, stages: {} };
  const mark = (stage, status, extra) => {
    log(runId, stage, status, extra);
    result.stages[stage] = status;
  };

  mark('weather.fetch', 'start');
  const raw = await withRetry(() => fetchOpenMeteo(config.location), {
    onRetry: (err, attempt) => mark('weather.fetch', 'retry', { attempt, message: err.message }),
  });
  mark('weather.fetch', 'success');
  mark('weather.normalize', 'start');
  const weatherData = normalizeWeather(raw);
  mark('weather.normalize', 'success');
  mark('weather.analyze', 'start');
  const analysis = analyzeWeather(weatherData, config.thresholds);
  mark('weather.analyze', 'success', { theme: analysis.theme, adviceSignals: analysis.adviceSignals });

  mark('forecast.render', 'start');
  const forecastData = buildForecastData(analysis, config.location);
  const flexMessage = buildFlex(forecastData);
  mark('forecast.render', 'success');

  const messages = [flexMessage];
  let audioInfo;
  try {
    mark('audio.synthesize', 'start');
    const audioBuffer = await withRetry(() => synthesizeSpeech(forecastData.thaiScript, config.tts), {
      onRetry: (err, attempt) => mark('audio.synthesize', 'retry', { attempt, message: err.message }),
    });
    mark('audio.synthesize', 'success', { provider: config.tts.provider, voice: config.tts.voiceName, scriptLength: forecastData.thaiScript.length, bytes: audioBuffer.length });

    mark('audio.validate', 'start');
    const validated = validateAudio(audioBuffer, forecastData.thaiScript, config.tts.speakingRate);
    mark('audio.validate', 'success', { durationMs: validated.durationMs, bytes: validated.byteLength, mimeType: validated.mimeType, bitrateKbps: validated.bitrateKbps, sampleRate: validated.sampleRate });

    mark('audio.store', 'start');
    const stored = storeAudio(audioBuffer, config.storage, { dryRun: config.dryRun });
    mark('audio.store', 'success', { url: stored.url, committed: stored.committed, skipped: stored.skipped, path: stored.relPath });
    audioInfo = { url: stored.url, durationMs: validated.durationMs, bytes: validated.byteLength, mimeType: validated.mimeType };
    if (stored.url) messages.push(buildAudioMessage(stored.url, validated.durationMs));
  } catch (err) {
    const stage = err.stage || 'audio';
    mark(stage, 'failure', { message: err.message, detail: err.detail });
    throw err;
  }

  if (config.dryRun) {
    mark('line.send', 'skipped', { dryRun: true, reason: 'DRY_RUN=true; LINE API was not called', messageCount: messages.length });
    const dryResult = { ...result, dryRun: true, messages, audioInfo };
    writeStatusReport(dryResult, config);
    return dryResult;
  }

  mark('line.send', 'start');
  await withRetry(() => pushMessages(messages, config.line), {
    onRetry: (err, attempt) => mark('line.send', 'retry', { attempt, message: err.message }),
  });
  mark('line.send', 'success', { messageCount: messages.length });
  const finalResult = { ...result, messages, audioInfo };
  writeStatusReport(finalResult, config);
  return finalResult;
}

module.exports = { runPipeline };
