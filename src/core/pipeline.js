// src/core/pipeline.js
// Flood-first daily pipeline: flood -> weather -> Gemini content -> Flex -> Gemini TTS -> LINE.
// Market and news are intentionally not part of this runtime path.

const { fetchPhatthalungFlood } = require('../flood/phatthalungCenter');
const { createUnknownFloodSituation } = require('../flood/contract');
const { fetchOpenMeteo } = require('../weather/openMeteo');
const { normalizeWeather } = require('../weather/normalize');
const { analyzeWeather } = require('../weather/analyzer');
const { generateNarration, buildQuotaSafeNarration } = require('../content/narrator');
const { validateGeneratedFacts } = require('../content/safetyFirewall');
const { buildFactsSnapshot } = require('../presentation/facts');
const { buildFlexV2 } = require('../flex/builder');
const { lintFlexMessage } = require('../flex/lint');
const { synthesizeSpeech } = require('../audio/tts');
const { validateAudio } = require('../audio/validate');
const { storeAudio } = require('../audio/storage');
const { pushMessages, buildAudioMessage } = require('../line/messagingApi');
const { withRetry } = require('./retry');
const { log } = require('./logger');
const { writeStatusReport, shouldSkipDuplicateProductionRun } = require('./statusReport');

function inspectFlexForDelivery(flexMessage, factsSnapshot) {
  const errors = lintFlexMessage(flexMessage, { factsSnapshot });
  if (errors.length) {
    const error = new Error('Flex structural lint rejected output: ' + errors.join('; '));
    error.stage = 'flex.lint';
    error.errors = errors;
    throw error;
  }
  return {
    passed: true,
    bubbles: flexMessage.contents.contents.length,
    payloadBytes: Buffer.byteLength(JSON.stringify(flexMessage), 'utf8'),
    severity: factsSnapshot.severity,
  };
}

function floodVerificationIssue(situation) {
  if (!situation || situation.severity === 'unknown') return 'flood severity is unknown';
  if (!Array.isArray(situation.stations) || situation.stations.length === 0) return 'no verified flood stations';
  if (situation.freshness?.state !== 'fresh') return `flood data freshness is ${situation.freshness?.state || 'unknown'}`;
  return null;
}

async function runPipeline(config, overrides = {}) {
  const fetchFlood = overrides.fetchFlood || fetchPhatthalungFlood;
  const fetchWeather = overrides.fetchWeather || fetchOpenMeteo;
  const generateNarrationImpl = overrides.generateNarration || generateNarration;
  const synthesizeSpeechImpl = overrides.synthesizeSpeech || synthesizeSpeech;
  const checkAudio = overrides.validateAudio || validateAudio;
  const saveAudio = overrides.storeAudio || storeAudio;
  const sendMessages = overrides.pushMessages || pushMessages;
  const writeStatus = overrides.writeStatusReport || writeStatusReport;
  const skipDuplicate = overrides.shouldSkipDuplicateProductionRun || shouldSkipDuplicateProductionRun;
  const { runId } = config;
  const result = { runId, stages: {} };
  const mark = (stage, status, extra) => { log(runId, stage, status, extra); result.stages[stage] = status; };

  if (skipDuplicate(config)) {
    mark('run', 'skipped', { reason: 'Flex announcement already delivered today; skip to avoid a duplicate alert (Asia/Bangkok)' });
    const skippedResult = { ...result, skipped: true, skipReason: 'duplicate-production-run' };
    writeStatus(skippedResult, config);
    return skippedResult;
  }

  let floodSituation;
  mark('flood.fetch', 'start');
  try {
    floodSituation = await withRetry(() => fetchFlood(config.location, {
      url: config.flood.sourceUrl || undefined,
      freshnessLimitMinutes: config.flood.freshnessLimitMinutes,
    }), { onRetry: (err, attempt) => mark('flood.fetch', 'retry', { attempt, message: err.message }) });
    mark('flood.fetch', 'success', { severity: floodSituation.severity, stations: floodSituation.stations.length, freshness: floodSituation.freshness.state });
  } catch (error) {
    if (config.flood.degradedMode !== 'unknown-weather') {
      mark('flood.fetch', 'failure', { message: error.message });
      result.lastError = { stage: error.stage || 'flood.fetch', message: error.message };
      writeStatus(result, config);
      throw error;
    }
    floodSituation = createUnknownFloodSituation({ location: config.location, source: { name: 'ศูนย์ข้อมูลน้ำพัทลุงใช้งานไม่ได้', url: config.flood.sourceUrl }, retrievedAt: new Date().toISOString() });
    mark('flood.fetch', 'degraded', { reason: error.message, mode: config.flood.degradedMode });
  }

  if (config.flood.degradedMode === 'no-send') {
    const issue = floodVerificationIssue(floodSituation);
    if (issue) {
      const error = Object.assign(new Error(`Flood status is not verifiable; no-send policy stopped the report: ${issue}`), { stage: 'flood.gate', retryable: false });
      mark('flood.gate', 'failure', { reason: issue, policy: 'no-send' });
      result.lastError = { stage: error.stage, message: error.message };
      writeStatus(result, config);
      throw error;
    }
    mark('flood.gate', 'success', { policy: 'no-send', severity: floodSituation.severity, freshness: floodSituation.freshness.state, stations: floodSituation.stations.length });
  }

  mark('weather.fetch', 'start');
  const rawWeather = await withRetry(() => fetchWeather(config.location), {
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
  const factsSnapshot = buildFactsSnapshot({ floodSituation, weatherAnalysis, location: config.location, dateInfo: { date: dateInfo } });
  mark('flex.render', 'start');
  let flexMessage;
  try {
    flexMessage = buildFlexV2({ factsSnapshot });
  } catch (error) {
    mark('flex.render', 'failure', { message: error.message });
    result.lastError = { stage: error.stage || 'flex.render', message: error.message };
    writeStatus(result, config);
    throw error;
  }
  mark('flex.render', 'success', { severity: floodSituation.severity });

  mark('flex.lint', 'start');
  let flexLint;
  try {
    flexLint = inspectFlexForDelivery(flexMessage, factsSnapshot);
    result.flexLint = flexLint;
    mark('flex.lint', 'success', flexLint);
  } catch (error) {
    mark('flex.lint', 'failure', { errors: error.errors || [error.message] });
    result.lastError = { stage: 'flex.lint', message: error.message, errors: error.errors || [] };
    writeStatus(result, config);
    throw error;
  }

  const messages = [flexMessage];
  let audioInfo;
  let narration;
  let audioWithheld = false;
  try {
    mark('content.narration', 'start');
    const narrationContext = { floodSituation, weatherAnalysis, location: config.location, date: dateInfo, factsSnapshot };
    const narrationFirewall = (candidate) => {
      const safetyInput = {
        severity: floodSituation.severity,
        spokenText: candidate.spokenText,
        spokenSections: (candidate.sections || []).map((section) => section.text),
        factsUsed: [...new Set((candidate.sections || []).flatMap((section) => section.factsUsed || []))],
      };
      return validateGeneratedFacts(safetyInput, { floodSituation, weatherAnalysis, date: dateInfo }, {
        forecastOnly: floodSituation.severity === 'unknown' && !(floodSituation.stations || []).length,
      });
    };
    narration = await withRetry(() => generateNarrationImpl(narrationContext, config), {
      onRetry: (err, attempt) => mark('content.narration', 'retry', { attempt, message: err.message }),
    });
    mark('content.narration', 'success', { provider: narration.provider, sections: narration.sections.length, characters: narration.totalCharacters });
    mark('content.safety', 'start');
    let safetyErrors = narrationFirewall(narration);
    if (safetyErrors.length) {
      mark('content.safety', 'degraded', { errors: safetyErrors, fallback: 'quota-safe-fallback' });
      narration = buildQuotaSafeNarration(narrationContext, config.tts.profile);
      safetyErrors = narrationFirewall(narration);
      if (safetyErrors.length) {
        mark('content.safety', 'failure', { errors: safetyErrors });
        const error = new Error('Narration safety firewall rejected generated and fallback content: ' + safetyErrors.join('; '));
        error.stage = 'content.safety';
        error.errors = safetyErrors;
        throw error;
      }
    }
    mark('content.safety', 'success');

    mark('tts.synthesize', 'start');
    const audioBuffer = await withRetry(() => synthesizeSpeechImpl(narration.spokenText, config.tts), {
      onRetry: (err, attempt) => mark('tts.synthesize', 'retry', { attempt, message: err.message }),
    });
    mark('tts.synthesize', 'success', { provider: config.tts.provider, profile: config.tts.profile, calls: 1, scriptLength: narration.totalCharacters, bytes: audioBuffer.length });
    mark('audio.validate', 'start');
    const validated = checkAudio(audioBuffer, narration.spokenText, config.tts.speakingRate, { maxFileBytes: 16 * 1024 * 1024 });
    mark('audio.validate', 'success', { durationMs: validated.durationMs, bytes: validated.byteLength, mimeType: validated.mimeType, bitrateKbps: validated.bitrateKbps, sampleRate: validated.sampleRate });
    mark('audio.store', 'start');
    const stored = saveAudio(audioBuffer, config.storage, { dryRun: config.dryRun });
    if (!stored?.url && !config.dryRun) throw Object.assign(new Error('Audio storage did not return a public URL'), { stage: 'audio.store', retryable: false });
    mark('audio.store', 'success', { url: stored.url, committed: stored.committed, skipped: stored.skipped, path: stored.relPath });
    audioInfo = { url: stored.url || null, durationMs: validated.durationMs, bytes: validated.byteLength, mimeType: validated.mimeType, sections: narration.sections.length };
    if (stored.url) messages.push(buildAudioMessage(stored.url, validated.durationMs));
  } catch (error) {
    const stage = error.stage || 'audio.process';
    mark(stage, 'failure', { message: error.message, detail: error.detail, errors: error.errors || [] });
    result.lastError = { stage, message: error.message, detail: error.detail, errors: error.errors || [] };
    result.audioWithheld = true;
    audioWithheld = true;
    mark('audio.withheld', 'degraded', { failedStage: stage, reason: error.message });
  }

  if (config.dryRun) {
    mark('line.send', 'skipped', { dryRun: true, reason: 'DRY_RUN=true; LINE API was not called', messageCount: messages.length });
    const dryResult = { ...result, dryRun: true, floodSituation, factsSnapshot, flexMessage, narration, messages, audioInfo, audioWithheld };
    writeStatus(dryResult, config);
    return dryResult;
  }
  mark('line.send', 'start');
  try {
    await withRetry(() => sendMessages([flexMessage], config.line), { onRetry: (err, attempt) => mark('line.send', 'retry', { attempt, message: err.message }) });
    mark('line.send', 'success', { messageCount: 1, messageType: 'flex' });
    result.flexDelivered = true;
  } catch (error) {
    mark('line.send', 'failure', { message: error.message, detail: error.detail });
    result.lastError = { stage: 'line.send', message: error.message, detail: error.detail };
    writeStatus({ ...result, floodSituation, factsSnapshot, flexMessage, narration, messages, audioInfo, audioWithheld }, config);
    throw error;
  }
  if (messages.length > 1) {
    mark('line.audio.send', 'start');
    try {
      await withRetry(() => sendMessages([messages[1]], config.line), { onRetry: (err, attempt) => mark('line.audio.send', 'retry', { attempt, message: err.message }) });
      mark('line.audio.send', 'success', { messageCount: 1, messageType: 'audio' });
      audioInfo = { ...audioInfo, delivered: true };
    } catch (error) {
      mark('line.audio.send', 'failure', { message: error.message, detail: error.detail });
      result.lastError = { stage: 'line.audio.send', message: error.message, detail: error.detail };
      result.audioWithheld = true;
      audioWithheld = true;
      audioInfo = { ...audioInfo, delivered: false };
      mark('audio.withheld', 'degraded', { failedStage: 'line.audio.send', reason: error.message });
    }
  }
  const finalResult = { ...result, floodSituation, factsSnapshot, flexMessage, narration, messages, audioInfo, audioWithheld };
  writeStatus(finalResult, config);
  return finalResult;
}
module.exports = { runPipeline, inspectFlexForDelivery };
