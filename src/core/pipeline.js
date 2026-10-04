// src/core/pipeline.js
// Flood-first daily pipeline: flood -> weather -> Gemini content -> Flex -> Gemini TTS -> LINE.
// Market and news are intentionally not part of this runtime path.

const { fetchPhatthalungFlood } = require('../flood/phatthalungCenter');
const { createUnknownFloodSituation } = require('../flood/contract');
const { fetchOpenMeteo } = require('../weather/openMeteo');
const { normalizeWeather } = require('../weather/normalize');
const { analyzeWeather } = require('../weather/analyzer');
const { buildForecastData } = require('../forecast/formatter');
const { generateGeminiReport } = require('../content/geminiReport');
const { generatePresentationPlan } = require('../content/presentationPlanner');
const { buildFlex } = require('../flex/builder');
const { synthesizeSpeech } = require('../audio/tts');
const { validateAudio } = require('../audio/validate');
const { storeAudio } = require('../audio/storage');
const { pushMessages, buildAudioMessage } = require('../line/messagingApi');
const { withRetry } = require('./retry');
const { log } = require('./logger');
const { writeStatusReport, shouldSkipDuplicateProductionRun } = require('./statusReport');

async function runPipeline(config) {
  const { runId } = config;
  const result = { runId, stages: {} };
  const mark = (stage, status, extra) => { log(runId, stage, status, extra); result.stages[stage] = status; };

  if (shouldSkipDuplicateProductionRun(config)) {
    mark('run', 'skipped', { reason: 'production announcement already delivered successfully today (Asia/Bangkok)' });
    const skippedResult = { ...result, skipped: true, skipReason: 'duplicate-production-run' };
    writeStatusReport(skippedResult, config);
    return skippedResult;
  }

  let floodSituation;
  mark('flood.fetch', 'start');
  try {
    floodSituation = await withRetry(() => fetchPhatthalungFlood(config.location, {
      url: config.flood.sourceUrl || undefined,
      freshnessLimitMinutes: config.flood.freshnessLimitMinutes,
    }), { onRetry: (err, attempt) => mark('flood.fetch', 'retry', { attempt, message: err.message }) });
    mark('flood.fetch', 'success', { severity: floodSituation.severity, stations: floodSituation.stations.length, freshness: floodSituation.freshness.state });
  } catch (error) {
    if (config.flood.degradedMode !== 'unknown-weather') {
      mark('flood.fetch', 'failure', { message: error.message });
      result.lastError = { stage: error.stage || 'flood.fetch', message: error.message };
      writeStatusReport(result, config);
      throw error;
    }
    floodSituation = createUnknownFloodSituation({ location: config.location, source: { name: 'ศูนย์ข้อมูลน้ำพัทลุงใช้งานไม่ได้', url: config.flood.sourceUrl }, retrievedAt: new Date().toISOString() });
    mark('flood.fetch', 'degraded', { reason: error.message, mode: config.flood.degradedMode });
  }

  mark('weather.fetch', 'start');
  const rawWeather = await withRetry(() => fetchOpenMeteo(config.location), {
    onRetry: (err, attempt) => mark('weather.fetch', 'retry', { attempt, message: err.message }),
  });
  mark('weather.fetch', 'success');
  mark('weather.normalize', 'start');
  const weatherData = normalizeWeather(rawWeather);
  mark('weather.normalize', 'success');
  mark('weather.analyze', 'start');
  const weatherAnalysis = analyzeWeather(weatherData, config.thresholds);
  mark('weather.analyze', 'success', { theme: weatherAnalysis.theme, adviceSignals: weatherAnalysis.adviceSignals });

  const dateInfo = new Intl.DateTimeFormat('th-TH', { timeZone: config.location.timezone, dateStyle: 'long' }).format(new Date());
  mark('content.generate', 'start');
  const report = await withRetry(() => generateGeminiReport({ floodSituation, weatherAnalysis, location: config.location, date: dateInfo }, config), {
    onRetry: (err, attempt) => mark('content.generate', 'retry', { attempt, message: err.message }),
  });
  mark('content.generate', 'success', { provider: report.provider, priority: report.priority, characters: report.spokenText.length });

  mark('content.presentation', 'start');
  const presentationPlan = await withRetry(() => generatePresentationPlan({
    floodSituation, weatherAnalysis, location: config.location, date: dateInfo, report,
  }, config), {
    onRetry: (err, attempt) => mark('content.presentation', 'retry', { attempt, message: err.message }),
  });
  if (presentationPlan.severity !== floodSituation.severity) {
    const error = new Error('Presentation planner changed verified flood severity');
    error.stage = 'content.presentation';
    throw error;
  }
  mark('content.presentation', 'success', {
    provider: presentationPlan.provider,
    severity: presentationPlan.severity,
    cards: presentationPlan.cards.length,
    audioDetail: presentationPlan.audioStyle.detailLevel,
    characters: presentationPlan.spokenText.length,
  });

  mark('flex.render', 'start');
  const reportData = buildForecastData(weatherAnalysis, floodSituation, config.location, {
    ...report,
    spokenText: presentationPlan.spokenText,
    shortSummary: report.shortSummary,
    priority: presentationPlan.priority,
  });
  reportData.presentationPlan = presentationPlan;
  const flexMessage = buildFlex(reportData);
  mark('flex.render', 'success', { severity: floodSituation.severity });

  const messages = [flexMessage];
  let audioInfo;
  try {
    mark('tts.synthesize', 'start');
    const ttsConfig = { ...config.tts, style: [
      presentationPlan.audioStyle.tone + ' tone',
      presentationPlan.audioStyle.pacing,
      presentationPlan.audioStyle.detailLevel + ' detail',
      ...(presentationPlan.audioStyle.emphasis || []).map((x) => 'emphasize ' + x),
    ].join('; ') };
    const audioBuffer = await withRetry(() => synthesizeSpeech(presentationPlan.spokenText, ttsConfig), {
      onRetry: (err, attempt) => mark('tts.synthesize', 'retry', { attempt, message: err.message }),
    });
    mark('tts.synthesize', 'success', { provider: config.tts.provider, profile: config.tts.profile, scriptLength: presentationPlan.spokenText.length, bytes: audioBuffer.length });
    mark('audio.validate', 'start');
    const validated = validateAudio(audioBuffer, presentationPlan.spokenText, config.tts.speakingRate);
    mark('audio.validate', 'success', { durationMs: validated.durationMs, bytes: validated.byteLength, mimeType: validated.mimeType, bitrateKbps: validated.bitrateKbps, sampleRate: validated.sampleRate });
    mark('audio.store', 'start');
    const stored = storeAudio(audioBuffer, config.storage, { dryRun: config.dryRun });
    mark('audio.store', 'success', { url: stored.url, committed: stored.committed, skipped: stored.skipped, path: stored.relPath });
    audioInfo = { url: stored.url, durationMs: validated.durationMs, bytes: validated.byteLength, mimeType: validated.mimeType };
    if (stored.url) messages.push(buildAudioMessage(stored.url, validated.durationMs));
  } catch (error) {
    const stage = error.stage || 'tts.synthesize';
    mark(stage, 'failure', { message: error.message, detail: error.detail });
    result.lastError = { stage, message: error.message, detail: error.detail };
    writeStatusReport(result, config);
    throw error;
  }

  if (config.dryRun) {
    mark('line.send', 'skipped', { dryRun: true, reason: 'DRY_RUN=true; LINE API was not called', messageCount: messages.length });
    const dryResult = { ...result, dryRun: true, floodSituation, report, presentationPlan, reportData, messages, audioInfo };
    writeStatusReport(dryResult, config);
    return dryResult;
  }
  mark('line.send', 'start');
  await withRetry(() => pushMessages(messages, config.line), { onRetry: (err, attempt) => mark('line.send', 'retry', { attempt, message: err.message }) });
  mark('line.send', 'success', { messageCount: messages.length });
  const finalResult = { ...result, floodSituation, report, presentationPlan, reportData, messages, audioInfo };
  writeStatusReport(finalResult, config);
  return finalResult;
}
module.exports = { runPipeline };
