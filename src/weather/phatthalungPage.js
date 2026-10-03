// src/weather/phatthalungPage.js
// Secondary page-source adapter. Open-Meteo remains the precise forecast API for
// the configured home coordinates; this adapter verifies the designated public
// Phatthalung weather page and preserves its attribution/snapshot.

const PHATTHALUNG_WEATHER_URL = 'https://chachoengsao-flood.vercel.app/phatthalung/weather';
const DAY_LABELS = ['วันนี้', 'พรุ่งนี้', 'มะรืนนี้'];

function stripHtml(value) {
  return String(value || '')
    .replace(/<!--.*?-->/gs, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
function parseWeatherPageHtml(html, options = {}) {
  const plain = stripHtml(html);
  const sourceUrl = options.sourceUrl || PHATTHALUNG_WEATHER_URL;
  const daily = [];
  for (const label of DAY_LABELS) {
    const start = plain.indexOf(label);
    if (start < 0) continue;
    const end = DAY_LABELS.map((other) => plain.indexOf(other, start + label.length)).filter((index) => index > start).sort((a, b) => a - b)[0] || Math.min(plain.length, start + 180);
    const chunk = plain.slice(start, end);
    const rainfall = chunk.match(/([0-9]+(?:\.[0-9]+)?)\s*มม\.\s*·\s*([0-9]+)%/);
    const wind = chunk.match(/(ลม[^ ]*)/);
    daily.push({
      label,
      summary: chunk.slice(label.length).trim(),
      precipitationMm: rainfall ? Number(rainfall[1]) : null,
      precipitationProbability: rainfall ? Number(rainfall[2]) : null,
      wind: wind ? wind[1] : '',
    });
  }
  if (!daily.length) {
    const error = new Error('Phatthalung weather page did not contain daily forecast cards');
    error.stage = 'weather.page.parse';
    error.retryable = true;
    throw error;
  }
  return {
    source: { name: 'พยากรณ์อากาศ พัทลุง', url: sourceUrl, publisher: 'Open-Meteo via Phatthalung weather page' },
    retrievedAt: options.retrievedAt || new Date().toISOString(),
    daily,
  };
}
async function fetchPhatthalungWeatherPage(opts = {}) {
  const doFetch = opts.fetchImpl || fetch;
  const url = opts.url || PHATTHALUNG_WEATHER_URL;
  const res = await doFetch(url, { headers: { accept: 'text/html' } });
  if (!res.ok) {
    const error = new Error(`Phatthalung weather page request failed: ${res.status}`);
    error.stage = 'weather.page.fetch';
    error.retryable = res.status >= 500 || res.status === 429;
    throw error;
  }
  return parseWeatherPageHtml(await res.text(), { sourceUrl: url, retrievedAt: opts.retrievedAt });
}
module.exports = { PHATTHALUNG_WEATHER_URL, parseWeatherPageHtml, fetchPhatthalungWeatherPage };
