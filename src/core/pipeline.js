// src/core/pipeline.js
// Orchestrates the full daily run: weather -> analysis -> forecast text ->
// flex -> tts -> validate -> storage -> line. Never fabricates weather data
// on failure (PRD R4) — a failed weather.fetch stops the whole run.

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

  // 1. Weather
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

  // 2. Forecast text + Flex
  mark('forecast.render', 'start');
  const forecastData = buildForecastData(analysis, config.location);
  const flexMessage = buildFlex(forecastData);
  mark('forecast.render', 'success');

  const messages = [flexMessage];
  let audioInfo = null;

  // 3. Audio (optional per-run: failure here does not necessarily fail the
  //    whole run — policy below sends Flex-only if TTS/storage fails).
  try {
    mark('audio.synthesize', 'start');
    const audioBuffer = await withRetry(() => synthesizeSpeech(forecastData.thaiScript, config.tts), {
      onRetry: (err, attempt) => mark('audio.synthesize', 'retry', { attempt, message: err.message }),
    });
    mark('audio.synthesize', 'success', { bytes: audioBuffer.length });

    mark('audio.validate', 'start');
    const { durationMs } = validateAudio(audioBuffer, forecastData.thaiScript, config.tts.speakingRate);
    mark('audio.validate', 'success', { durationMs });

    mark('audio.store', 'start');
    const stored = storeAudio(audioBuffer, config.storage, { dryRun: config.dryRun });
    mark('audio.store', 'success', { url: stored.url, committed: stored.committed });

    audioInfo = { url: stored.url, durationMs };
    messages.push(buildAudioMessage(stored.url, durationMs));
  } catch (err) {
    // Policy (PRD 13.3): audio failure does not block the visual Flex
    // announcement — residents still get the morning report.
    mark(err.stage || 'audio.synthesize', 'failure', { message: err.message, detail: err.detail });
    result.lastError = { stage: err.stage, message: err.message, detail: err.detail };
  }

  // 4. LINE
  if (config.dryRun) {
    mark('line.send', 'success', { dryRun: true, messageCount: messages.length });
    return { ...result, dryRun: true, messages, audioInfo };
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
