// src/content/reportContract.js
// Phase 1 contract only: validates Gemini's structured narrative output.
// It does not call Gemini and does not decide whether facts are true.

const REPORT_PRIORITIES = Object.freeze(['normal', 'watch', 'affected', 'critical', 'unknown']);
const FORBIDDEN_TOPIC_PATTERNS = [
  /ราคาปาล์ม/i,
  /ราคายาง/i,
  /ปาล์มน้ำมัน/i,
  /ยางพารา/i,
  /ข่าวสารทั่วไป/i,
];

function cleanText(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function cleanList(value, max = 5) {
  if (!Array.isArray(value)) return [];
  return value.map(cleanText).filter(Boolean).slice(0, max);
}

function parseReportDraft(value) {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      return { ok: false, errors: ['Gemini response is not valid JSON'] };
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, errors: ['ReportDraft must be a JSON object'] };
  }

  const draft = {
    schemaVersion: '1.0',
    spokenText: cleanText(parsed.spokenText),
    shortSummary: cleanText(parsed.shortSummary),
    priority: REPORT_PRIORITIES.includes(parsed.priority) ? parsed.priority : 'unknown',
    actions: cleanList(parsed.actions, 3),
    factsUsed: cleanList(parsed.factsUsed, 20),
    warnings: cleanList(parsed.warnings, 10),
  };
  const errors = validateReportDraft(draft);
  return errors.length ? { ok: false, errors, draft } : { ok: true, draft };
}

function validateReportDraft(draft, options = {}) {
  const errors = [];
  if (!draft || typeof draft !== 'object') return ['ReportDraft must be an object'];
  if (!cleanText(draft.spokenText)) errors.push('spokenText is required');
  if (!cleanText(draft.shortSummary)) errors.push('shortSummary is required');
  if (!REPORT_PRIORITIES.includes(draft.priority)) errors.push('priority is invalid');
  if (!Array.isArray(draft.actions) || draft.actions.length > 3) errors.push('actions must be an array of at most 3 items');
  if (!Array.isArray(draft.factsUsed)) errors.push('factsUsed must be an array');
  if (!Array.isArray(draft.warnings)) errors.push('warnings must be an array');

  const combined = [draft.spokenText, draft.shortSummary, ...(draft.actions || [])].join('\n');
  if (FORBIDDEN_TOPIC_PATTERNS.some((pattern) => pattern.test(combined))) {
    errors.push('spoken content contains a forbidden market/news topic');
  }
  if (options.expectedPriority && draft.priority !== options.expectedPriority) {
    errors.push('priority does not match expected priority');
  }
  if (options.requireFreshnessWarning && !/ยังยืนยัน|ข้อมูลเก่า|ล้าสมัย|ไม่สามารถยืนยัน/i.test(combined)) {
    errors.push('stale/unknown report must disclose freshness limitation');
  }
  return errors;
}

function buildGeminiReportInput({ floodSituation, weatherAnalysis, location, date }) {
  return {
    schemaVersion: '1.0',
    instruction: 'Use only the supplied facts. Do not browse, infer flood facts, or add unsupported numbers.',
    location: location || null,
    date: date || null,
    floodSituation: floodSituation || null,
    weatherAnalysis: weatherAnalysis || null,
  };
}

module.exports = {
  REPORT_PRIORITIES,
  parseReportDraft,
  validateReportDraft,
  buildGeminiReportInput,
};
