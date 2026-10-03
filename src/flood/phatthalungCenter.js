// src/flood/phatthalungCenter.js
// Server-rendered HTML adapter for the approved Phatthalung flood-center page.
// It is deliberately strict: if the expected labels/rows disappear, fail closed.

const { normalizeFloodSituation } = require('./contract');

const FLOOD_CENTER_URL = 'https://chachoengsao-flood.vercel.app/phatthalung';
const MONTHS = { 'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6, 'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12 };
const LABELS = ['ใกล้ล้นตลิ่ง', 'น้ำมาก', 'ปกติ', 'ล้นตลิ่ง'];

function decodeHtml(value) {
  return String(value || '')
    .replace(/<!--.*?-->/gs, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
function parseThaiObservedAt(value, retrievedAt) {
  const match = String(value || '').match(/(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const retrieved = new Date(retrievedAt || Date.now());
  const year = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Bangkok', year: 'numeric' }).format(retrieved));
  const month = MONTHS[match[2]];
  return new Date(`${year}-${String(month).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}T${match[3].padStart(2, '0')}:${match[4]}:00+07:00`).toISOString();
}
function parseDistance(text) {
  const match = String(text || '').match(/ต่ำกว่าตลิ่ง\s+([0-9]+(?:\.[0-9]+)?)\s*ม\./);
  return match ? Number(match[1]) : null;
}
function parseTrend(text) {
  if (/กำลังเพิ่ม|เพิ่มขึ้น/.test(text)) return 'rising';
  if (/กำลังลด|ลดลง/.test(text)) return 'falling';
  if (/ทรงตัว/.test(text)) return 'stable';
  return 'unknown';
}
function parseStationRows(html, retrievedAt) {
  const rows = [];
  const liMatches = String(html || '').match(/<li\b[\s\S]*?<\/li>/gi) || [];
  for (const li of liMatches) {
    const plain = decodeHtml(li);
    const label = LABELS.find((candidate) => plain.includes(candidate));
    const measured = plain.match(/วัดเมื่อ\s+(.+?)(?:\s+·\s+([^·]+))?$/);
    const level = plain.match(/(?:ต่ำกว่าตลิ่ง\s+[0-9.]+\s*ม\.)/);
    if (!label || !level || !measured) continue;
    const beforeLevel = plain.slice(0, plain.indexOf(level[0])).trim();
    const parts = beforeLevel.split('ต่ำกว่าตลิ่ง')[0].trim().split(' · ');
    const name = (parts[0] || '').replace(new RegExp(`^${label}\\s*`), '').trim();
    const waterway = parts[1] || '';
    const publisher = (measured[2] || '').trim();
    rows.push({
      name,
      waterway,
      label,
      distanceToBankMeters: parseDistance(plain),
      trend: parseTrend(plain),
      observedAt: parseThaiObservedAt(measured[1], retrievedAt),
      publisher,
    });
  }
  return rows.filter((row) => row.name && row.observedAt);
}
function severityForStations(stations) {
  if (!stations.length) return 'unknown';
  if (stations.some((s) => s.label === 'ล้นตลิ่ง')) return 'affected';
  if (stations.some((s) => s.label === 'ใกล้ล้นตลิ่ง')) return 'watch';
  if (stations.some((s) => s.label === 'น้ำมาก')) return 'watch';
  return 'normal';
}
function summaryFor(severity, stations) {
  const near = stations.filter((s) => s.label === 'ใกล้ล้นตลิ่ง').length;
  const many = stations.filter((s) => s.label === 'น้ำมาก').length;
  if (severity === 'affected') return 'มีสถานีที่รายงานระดับน้ำล้นตลิ่ง';
  if (near) return `มี ${near} สถานีใกล้ล้นตลิ่ง ควรติดตามการเปลี่ยนแปลง`;
  if (many) return `มี ${many} สถานีรายงานน้ำมาก ควรติดตามระดับน้ำ`;
  if (severity === 'normal') return 'สถานีที่ตรวจพบอยู่ในเกณฑ์ปกติ';
  return 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้';
}
function parseFloodCenterHtml(html, options = {}) {
  const retrievedAt = options.retrievedAt || new Date().toISOString();
  const stations = parseStationRows(html, retrievedAt);
  if (!stations.length) {
    const error = new Error('Phatthalung flood page did not contain recognizable station rows');
    error.stage = 'flood.parse';
    error.retryable = true;
    throw error;
  }
  const severity = severityForStations(stations);
  const observedAt = stations.map((s) => s.observedAt).sort().at(-1) || null;
  const trends = stations.map((s) => s.trend);
  const trend = trends.includes('rising') ? 'rising' : trends.includes('falling') ? 'falling' : trends.includes('stable') ? 'stable' : 'unknown';
  return normalizeFloodSituation({
    severity,
    summary: summaryFor(severity, stations),
    trend,
    confidence: 'medium',
    location: { name: options.location?.name || 'พัทลุง', province: options.location?.province || 'พัทลุง' },
    stations,
    affectedAreas: stations.filter((s) => s.label !== 'ปกติ').map((s) => [s.name, s.waterway].filter(Boolean).join(' · ')),
    water: { distanceToBankMeters: stations[0].distanceToBankMeters },
    source: { name: 'ศูนย์ช่วยเหลือน้ำท่วม จังหวัดพัทลุง', url: options.sourceUrl || FLOOD_CENTER_URL, publisher: 'หน้า flood center' },
    observedAt,
    retrievedAt,
    actions: severity === 'affected' ? ['หลีกเลี่ยงพื้นที่เสี่ยง', 'ติดตามประกาศทางการ'] : ['ติดตามระดับน้ำล่าสุด'],
  }, { freshnessLimitMinutes: options.freshnessLimitMinutes || 180 });
}
async function fetchPhatthalungFlood(location, opts = {}) {
  const doFetch = opts.fetchImpl || fetch;
  const url = opts.url || FLOOD_CENTER_URL;
  const retrievedAt = opts.retrievedAt || new Date().toISOString();
  const res = await doFetch(url, { headers: { accept: 'text/html' } });
  if (!res.ok) {
    const error = new Error(`Flood center request failed: ${res.status}`);
    error.stage = 'flood.fetch';
    error.retryable = res.status >= 500 || res.status === 429;
    throw error;
  }
  const html = await res.text();
  return parseFloodCenterHtml(html, { location, sourceUrl: url, retrievedAt, freshnessLimitMinutes: opts.freshnessLimitMinutes });
}
module.exports = { FLOOD_CENTER_URL, parseFloodCenterHtml, parseStationRows, fetchPhatthalungFlood };
