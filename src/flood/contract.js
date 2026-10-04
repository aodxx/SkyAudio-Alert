// src/flood/contract.js
// Phase 2 domain contract: normalized flood facts only.
// Fetching/parsing remains in a separate adapter; this module never scrapes a website.

const FLOOD_SEVERITIES = Object.freeze(['normal', 'watch', 'affected', 'critical', 'unknown']);
const FLOOD_TRENDS = Object.freeze(['rising', 'stable', 'falling', 'unknown']);
const FRESHNESS_STATES = Object.freeze(['fresh', 'stale', 'unknown']);

function text(value, fallback = '') {
  return value === null || value === undefined ? fallback : String(value).trim();
}
function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function isoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function normalizeList(value, max = 5) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item)).filter(Boolean).slice(0, max);
}
function normalizeStations(value, max = 8) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).map((station) => ({
    name: text(station?.name),
    waterway: text(station?.waterway),
    label: text(station?.label),
    distanceToBankMeters: finiteOrNull(station?.distanceToBankMeters),
    trend: FLOOD_TRENDS.includes(station?.trend) ? station.trend : 'unknown',
    observedAt: isoOrNull(station?.observedAt),
    publisher: text(station?.publisher),
  })).filter((station) => station.name || station.waterway);
}
function freshnessState({ observedAt, publishedAt, retrievedAt, freshnessLimitMinutes = 180 } = {}) {
  const retrieved = retrievedAt ? new Date(retrievedAt).getTime() : Date.now();
  const reference = publishedAt || observedAt;
  if (!reference) return { state: 'unknown', ageMinutes: null };
  const timestamp = new Date(reference).getTime();
  if (Number.isNaN(timestamp)) return { state: 'unknown', ageMinutes: null };
  const ageMinutes = Math.max(0, Math.round((retrieved - timestamp) / 60000));
  return { state: ageMinutes <= freshnessLimitMinutes ? 'fresh' : 'stale', ageMinutes };
}
function normalizeFloodSituation(input = {}, options = {}) {
  const source = input.source || {};
  const timestamps = {
    observedAt: isoOrNull(input.observedAt || input.observed_at),
    publishedAt: isoOrNull(input.publishedAt || input.published_at),
    retrievedAt: isoOrNull(input.retrievedAt || input.retrieved_at) || new Date().toISOString(),
  };
  const freshness = input.freshness && typeof input.freshness === 'object'
    ? { state: input.freshness.state || 'unknown', ageMinutes: finiteOrNull(input.freshness.ageMinutes) }
    : freshnessState({ ...timestamps, freshnessLimitMinutes: options.freshnessLimitMinutes });
  const severity = FLOOD_SEVERITIES.includes(input.severity) ? input.severity : 'unknown';
  const trend = FLOOD_TRENDS.includes(input.trend) ? input.trend : 'unknown';
  return {
    schemaVersion: '1.0',
    severity,
    summary: text(input.summary),
    trend,
    confidence: text(input.confidence, 'unknown'),
    location: { name: text(input.location?.name || options.location?.name), province: text(input.location?.province || options.location?.province) },
    water: {
      level: finiteOrNull(input.water?.level),
      levelUnit: text(input.water?.levelUnit || input.water?.unit),
      threshold: finiteOrNull(input.water?.threshold),
      thresholdUnit: text(input.water?.thresholdUnit || input.water?.unit),
      distanceToBankMeters: finiteOrNull(input.water?.distanceToBankMeters),
    },
    stations: normalizeStations(input.stations),
    affectedAreas: normalizeList(input.affectedAreas),
    roads: normalizeList(input.roads),
    actions: normalizeList(input.actions, 3),
    source: { name: text(source.name), url: text(source.url), publisher: text(source.publisher) },
    timestamps,
    freshness: { state: FRESHNESS_STATES.includes(freshness.state) ? freshness.state : 'unknown', ageMinutes: finiteOrNull(freshness.ageMinutes) },
  };
}
function createUnknownFloodSituation({ location, source, retrievedAt } = {}) {
  return normalizeFloodSituation({ severity: 'unknown', summary: 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้', confidence: 'none', location, source, retrievedAt, freshness: { state: 'unknown', ageMinutes: null } });
}
function validateFloodSituation(situation) {
  const errors = [];
  if (!situation || typeof situation !== 'object') return ['FloodSituation must be an object'];
  if (situation.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (!FLOOD_SEVERITIES.includes(situation.severity)) errors.push('invalid severity');
  if (!FLOOD_TRENDS.includes(situation.trend)) errors.push('invalid trend');
  if (!situation.location || !situation.location.name) errors.push('location.name is required');
  if (!situation.timestamps || !situation.timestamps.retrievedAt) errors.push('timestamps.retrievedAt is required');
  if (!situation.source || !situation.source.name) errors.push('source.name is required');
  if (!situation.freshness || !FRESHNESS_STATES.includes(situation.freshness.state)) errors.push('invalid freshness state');
  if (!Array.isArray(situation.stations)) errors.push('stations must be an array');
  if (!Array.isArray(situation.affectedAreas)) errors.push('affectedAreas must be an array');
  if (!Array.isArray(situation.roads)) errors.push('roads must be an array');
  if (!Array.isArray(situation.actions) || situation.actions.length > 3) errors.push('actions must be an array of at most 3 items');
  if (situation.severity === 'unknown' && !situation.summary) errors.push('unknown situation needs an explicit summary');
  if (situation.freshness.state === 'stale' && situation.freshness.ageMinutes !== null && situation.freshness.ageMinutes <= 0) errors.push('stale freshness must have positive ageMinutes');
  if (situation.freshness.state === 'fresh' && situation.freshness.ageMinutes !== null && situation.freshness.ageMinutes < 0) errors.push('fresh freshness ageMinutes cannot be negative');
  return errors;
}
module.exports = { FLOOD_SEVERITIES, FLOOD_TRENDS, FRESHNESS_STATES, freshnessState, normalizeFloodSituation, createUnknownFloodSituation, validateFloodSituation };
