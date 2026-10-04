const { normalizeFloodSituation } = require('../../src/flood/contract');
const { buildFactsSnapshot } = require('../../src/presentation/facts');
const { buildVisualPlan } = require('../../src/presentation/visualPlan');

const FIXED_NOW = '2026-10-04T12:30:00.000Z';
const LOCATION = { name: 'บ้านลำพาย', district: 'ต.โคกชะงาย', province: 'พัทลุง', timezone: 'Asia/Bangkok' };

function createFlexInput({ severity = 'watch', stale = false, stationVariant = 'one', weather = true } = {}) {
  let stationCount = stationVariant === 'none' ? 0 : stationVariant === 'three-plus' ? 4 : 1;
  const namePrefix = stationVariant === 'long-name' ? 'สถานีตรวจวัดระดับน้ำชุมชนริมคลองตัวอย่างตำบลโคกชะงายจังหวัดพัทลุง' : 'สถานี';
  const stations = Array.from({ length: stationCount }, (_, index) => ({
    name: index === 0 ? namePrefix : `${namePrefix}${index + 1}`,
    waterway: `คลอง${index + 1}`,
    label: ['ปกติ', 'น้ำมาก', 'ใกล้ล้นตลิ่ง', 'ล้นตลิ่ง'][index % 4],
    distanceToBankMeters: 0.42 + index * 0.1,
    trend: index % 2 ? 'stable' : 'rising',
    observedAt: FIXED_NOW,
    publisher: 'ศูนย์ข้อมูลน้ำ',
  }));
  const floodSituation = normalizeFloodSituation({
    severity,
    summary: severity === 'unknown' ? 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้' : `สถานการณ์น้ำ ${severity} จากข้อมูลที่ยืนยันได้`,
    trend: 'rising',
    confidence: severity === 'unknown' ? 'none' : 'high',
    location: { name: LOCATION.name, province: LOCATION.province },
    stations,
    affectedAreas: ['ชุมชนริมน้ำ'],
    roads: ['ถนนตัวอย่าง'],
    actions: severity === 'normal' ? [] : ['ติดตามข้อมูลจากศูนย์ข้อมูลน้ำ'],
    source: { name: 'ศูนย์ข้อมูลน้ำพัทลุง', publisher: 'ศูนย์ข้อมูลน้ำ', url: 'https://chachoengsao-flood.vercel.app/phatthalung' },
    observedAt: stale ? '2026-10-03T14:40:00.000Z' : FIXED_NOW,
    publishedAt: stale ? '2026-10-03T14:40:00.000Z' : FIXED_NOW,
    retrievedAt: FIXED_NOW,
    freshness: { state: stale ? 'stale' : severity === 'unknown' ? 'unknown' : 'fresh', ageMinutes: stale ? 1310 : 0 },
  }, { location: LOCATION });
  const weatherAnalysis = weather ? {
    current: {
      temperature: 28, apparentTemperature: 30, humidity: 72, windSpeed: 11,
      precipitation: 0, time: FIXED_NOW, description: { label: 'มีเมฆบางส่วน', key: 'partly_cloudy' },
    },
    daily: { tempMin: 24, tempMax: 32, precipitationProbabilityMax: 70 },
    hourlyToday: [
      { time: '2026-10-04T06:00', temperature: 24, precipitationProbability: 25, precipitation: 0 },
      { time: '2026-10-04T14:00', temperature: 32, precipitationProbability: 70, precipitation: 2.2 },
    ],
    rainWindows: { periods: {
      morning: { label: 'ช่วงเช้า', maxProb: 25, maxMm: 0 },
      afternoon: { label: 'ช่วงบ่าย', maxProb: 70, maxMm: 2.2 },
      evening: { label: 'ช่วงเย็น/ค่ำ', maxProb: 15, maxMm: 0 },
    } },
  } : {};
  const factsSnapshot = buildFactsSnapshot({ floodSituation, weatherAnalysis, location: LOCATION, dateInfo: { date: '4 ตุลาคม 2569' } });
  const visualPlan = buildVisualPlan(factsSnapshot);
  return { factsSnapshot, visualPlan, floodSituation, weatherAnalysis, location: LOCATION };
}

module.exports = { FIXED_NOW, LOCATION, createFlexInput };
