// src/forecast/thaiDate.js
// Calendar text for the morning announcement.
// The lunar day is an approximate astronomical conversion intended for
// friendly daily context (waxing/waning + lunar day), not legal/calendar use.

const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Meeus-style mean lunar phase approximation. Good enough to identify the
// everyday waxing/waning lunar day used in a spoken weather announcement.
function lunarAge(date) {
  const jd = julianDay(date);
  const knownNewMoonJd = 2451550.25972; // 2000-01-06 18:14 UTC
  const synodicMonth = 29.530588853;
  const age = (jd - knownNewMoonJd) % synodicMonth;
  return age < 0 ? age + synodicMonth : age;
}

function thaiLunarPhase(date) {
  const age = lunarAge(date);
  if (age < 1) return 'แรม 15 ค่ำ';
  if (age < 15) return `ขึ้น ${Math.min(15, Math.floor(age) + 1)} ค่ำ`;
  if (age < 29) return `แรม ${Math.min(14, Math.floor(age - 15) + 1)} ค่ำ`;
  return 'แรม 15 ค่ำ';
}

function buildThaiDateInfo(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date for Thai calendar text');
  }

  const weekday = WEEKDAYS[date.getUTCDay()];
  const day = date.getUTCDate();
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear() + 543;

  return {
    weekday,
    day,
    month,
    year,
    solarText: `วัน${weekday}ที่ ${day} ${month} พ.ศ. ${year}`,
    lunarText: thaiLunarPhase(date),
    spokenText: `วันนี้... วัน${weekday}ที่ ${day} ${month} พ.ศ. ${year} ตรงกับ${thaiLunarPhase(date)}`,
  };
}

module.exports = { buildThaiDateInfo, thaiLunarPhase };
