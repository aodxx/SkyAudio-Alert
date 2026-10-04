const SEVERITY_LABELS = Object.freeze({
  normal: 'ปกติ',
  watch: 'เฝ้าระวัง',
  affected: 'ได้รับผลกระทบ',
  critical: 'วิกฤต',
  unknown: 'ยังยืนยันไม่ได้',
});
const TREND_LABELS = Object.freeze({ rising: 'เพิ่มขึ้น', stable: 'ทรงตัว', falling: 'ลดลง', unknown: 'ไม่ทราบแนวโน้ม' });
const FRESHNESS_LABELS = Object.freeze({ fresh: 'ข้อมูลใหม่', stale: 'ข้อมูลเก่า', unknown: 'ไม่ทราบความสดใหม่' });
const DIGITS = Object.freeze(['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']);
const THAI_DIGITS = Object.freeze({ 0: '๐', 1: '๑', 2: '๒', 3: '๓', 4: '๔', 5: '๕', 6: '๖', 7: '๗', 8: '๘', 9: '๙' });
const TENS = Object.freeze(['', 'สิบ', 'ยี่สิบ', 'สามสิบ', 'สี่สิบ', 'ห้าสิบ', 'หกสิบ', 'เจ็ดสิบ', 'แปดสิบ', 'เก้าสิบ']);
const SMALL_UNITS = Object.freeze(['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']);

function integerToThaiWords(value) {
  if (!Number.isSafeInteger(value) || value < 0) return '';
  if (value < 10) return DIGITS[value];
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return `${TENS[tens]}${ones === 1 ? 'เอ็ด' : ones ? DIGITS[ones] : ''}`;
  }
  if (value < 1000000) {
    let rest = value;
    let output = '';
    for (let position = 5; position >= 0; position -= 1) {
      const divisor = 10 ** position;
      const digit = Math.floor(rest / divisor);
      rest %= divisor;
      if (!digit) continue;
      if (position === 1) {
        output += digit === 1 ? 'สิบ' : digit === 2 ? 'ยี่สิบ' : `${DIGITS[digit]}สิบ`;
      } else if (position === 0 && digit === 1 && value >= 20) {
        output += 'เอ็ด';
      } else {
        output += `${DIGITS[digit]}${SMALL_UNITS[position]}`;
      }
    }
    return output;
  }
  const millions = Math.floor(value / 1000000);
  const remainder = value % 1000000;
  const remainderWords = remainder === 1 ? 'เอ็ด' : remainder ? integerToThaiWords(remainder) : '';
  return `${integerToThaiWords(millions)}ล้าน${remainderWords}`;
}

function toThaiNumberWords(value) {
  const raw = typeof value === 'number' ? String(value) : String(value ?? '').trim().replaceAll(',', '');
  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) return '';
  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [integerPart, decimalPart] = unsigned.split('.');
  const integer = Number(integerPart);
  if (!Number.isSafeInteger(integer)) return '';
  const whole = integerToThaiWords(integer);
  const decimal = decimalPart ? `จุด${[...decimalPart].map((digit) => DIGITS[Number(digit)]).join('')}` : '';
  return `${negative ? 'ลบ' : ''}${whole}${decimal}`;
}

function toThaiDigits(value) {
  return String(value).replace(/[0-9]/g, (digit) => THAI_DIGITS[digit]);
}

function thaiTimeFromIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return '';
  if (hour === 0 && minute === 0) return 'เที่ยงคืน';
  if (hour === 12 && minute === 0) return 'เที่ยงวัน';
  let prefix;
  let spokenHour;
  if (hour >= 1 && hour <= 5) {
    prefix = 'ตี';
    spokenHour = DIGITS[hour];
  } else if (hour === 6) {
    prefix = '';
    spokenHour = 'หกโมงเช้า';
  } else if (hour >= 7 && hour <= 11) {
    prefix = '';
    spokenHour = `${DIGITS[hour]}โมงเช้า`;
  } else if (hour === 12) {
    prefix = '';
    spokenHour = 'เที่ยง';
  } else if (hour >= 13 && hour <= 17) {
    prefix = 'บ่าย';
    spokenHour = `${hour === 13 ? 'โมง' : DIGITS[hour - 12] + 'โมง'}`;
  } else {
    prefix = '';
    spokenHour = `${hour === 18 ? 'หนึ่ง' : DIGITS[hour - 18]}ทุ่ม`;
  }
  const minuteText = minute === 0 ? '' : `${integerToThaiWords(minute)}นาที`;
  return `${prefix}${spokenHour}${minuteText}`;
}

function dateFromIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);
}

function unique(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function addFact(facts, id, kind, value, options = {}) {
  if (value === null || value === undefined || value === '') return;
  const unit = options.unit || '';
  const displayValue = options.displayValue ?? String(value);
  let spokenForms = options.spokenForms || [];
  if (!options.spokenForms && kind === 'number') {
    const numericText = String(value);
    const words = toThaiNumberWords(numericText);
    spokenForms = [numericText, toThaiDigits(numericText), words];
    if (unit) spokenForms.push(`${words}${unit}`);
  } else if (!options.spokenForms && kind === 'time') {
    spokenForms = [String(value), thaiTimeFromIso(value), dateFromIso(value)].filter(Boolean);
  } else if (!options.spokenForms && kind === 'uri') {
    spokenForms = [];
  } else if (!options.spokenForms) {
    spokenForms = [String(value)];
  }
  facts[id] = {
    id,
    kind,
    value,
    displayValue: String(displayValue),
    unit,
    spokenForms: unique(spokenForms),
  };
}

function addNumber(facts, id, value, unit = '') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  addFact(facts, id, 'number', value, { unit });
}

function buildFactsSnapshot({ floodSituation = {}, weatherAnalysis = {}, location = {}, dateInfo = {} } = {}) {
  const facts = {};
  const flood = floodSituation && typeof floodSituation === 'object' ? floodSituation : {};
  const weather = weatherAnalysis && typeof weatherAnalysis === 'object' ? weatherAnalysis : {};
  const severity = Object.hasOwn(SEVERITY_LABELS, flood.severity) ? flood.severity : 'unknown';
  const trend = Object.hasOwn(TREND_LABELS, flood.trend) ? flood.trend : 'unknown';
  const freshnessState = Object.hasOwn(FRESHNESS_LABELS, flood.freshness?.state) ? flood.freshness.state : 'unknown';

  addFact(facts, 'flood.severity', 'enum', severity, { displayValue: SEVERITY_LABELS[severity], spokenForms: [severity, SEVERITY_LABELS[severity]] });
  addFact(facts, 'flood.trend', 'enum', trend, { displayValue: TREND_LABELS[trend], spokenForms: [trend, TREND_LABELS[trend]] });
  addFact(facts, 'flood.freshness.state', 'enum', freshnessState, { displayValue: FRESHNESS_LABELS[freshnessState], spokenForms: [freshnessState, FRESHNESS_LABELS[freshnessState]] });
  addNumber(facts, 'flood.freshness.ageMinutes', flood.freshness?.ageMinutes, 'นาที');
  addFact(facts, 'flood.summary', 'text', flood.summary);

  const floodLocation = flood.location || {};
  addFact(facts, 'flood.location.name', 'name', floodLocation.name || location.name);
  addFact(facts, 'flood.location.province', 'name', floodLocation.province || location.province);
  addFact(facts, 'location.district', 'name', location.district || floodLocation.district);
  addFact(facts, 'flood.source.name', 'name', flood.source?.name);
  addFact(facts, 'flood.source.publisher', 'name', flood.source?.publisher);
  addFact(facts, 'flood.source.url', 'uri', flood.source?.url);
  addFact(facts, 'flood.observedAt', 'time', flood.timestamps?.observedAt || flood.observedAt);
  addFact(facts, 'flood.publishedAt', 'time', flood.timestamps?.publishedAt || flood.publishedAt);
  addFact(facts, 'flood.retrievedAt', 'time', flood.timestamps?.retrievedAt || flood.retrievedAt);
  addNumber(facts, 'flood.water.level', flood.water?.level, flood.water?.levelUnit || '');
  addNumber(facts, 'flood.water.threshold', flood.water?.threshold, flood.water?.thresholdUnit || '');
  addNumber(facts, 'flood.water.distanceToBankMeters', flood.water?.distanceToBankMeters, 'เมตร');

  for (const [index, station] of (Array.isArray(flood.stations) ? flood.stations : []).entries()) {
    const root = `flood.station.${index}`;
    addFact(facts, `${root}.name`, 'name', station?.name);
    addFact(facts, `${root}.waterway`, 'name', station?.waterway);
    addFact(facts, `${root}.label`, 'text', station?.label);
    addNumber(facts, `${root}.distanceToBankMeters`, station?.distanceToBankMeters, 'เมตร');
    addFact(facts, `${root}.trend`, 'enum', station?.trend, {
      displayValue: TREND_LABELS[station?.trend] || String(station?.trend || ''),
      spokenForms: [String(station?.trend || ''), TREND_LABELS[station?.trend] || ''],
    });
    addFact(facts, `${root}.observedAt`, 'time', station?.observedAt);
    addFact(facts, `${root}.publisher`, 'name', station?.publisher);
  }
  for (const [index, area] of (Array.isArray(flood.affectedAreas) ? flood.affectedAreas : []).entries()) {
    addFact(facts, `flood.affectedArea.${index}`, 'name', area);
  }
  for (const [index, road] of (Array.isArray(flood.roads) ? flood.roads : []).entries()) {
    addFact(facts, `flood.road.${index}`, 'name', road);
  }
  for (const [index, action] of (Array.isArray(flood.actions) ? flood.actions : []).entries()) {
    addFact(facts, `flood.action.${index}`, 'text', action);
  }

  const current = weather.current || {};
  const daily = weather.daily || {};
  addNumber(facts, 'weather.current.temperature', current.temperature, 'องศาเซลเซียส');
  addNumber(facts, 'weather.current.apparentTemperature', current.apparentTemperature, 'องศาเซลเซียส');
  addNumber(facts, 'weather.current.humidity', current.humidity, 'เปอร์เซ็นต์');
  addNumber(facts, 'weather.current.windSpeed', current.windSpeed, 'กิโลเมตรต่อชั่วโมง');
  addNumber(facts, 'weather.current.precipitation', current.precipitation, 'มิลลิเมตร');
  addFact(facts, 'weather.current.condition', 'text', current.description?.label || current.conditionLabel);
  addNumber(facts, 'weather.daily.tempMin', daily.tempMin, 'องศาเซลเซียส');
  addNumber(facts, 'weather.daily.tempMax', daily.tempMax, 'องศาเซลเซียส');
  addNumber(facts, 'weather.daily.rainProbabilityMax', daily.precipitationProbabilityMax, 'เปอร์เซ็นต์');

  for (const [index, hour] of (Array.isArray(weather.hourlyToday) ? weather.hourlyToday : []).entries()) {
    const root = `weather.hourly.${index}`;
    const rawTime = String(hour?.time || '');
    if (rawTime) {
      const clock = rawTime.match(/T(\d{2}:\d{2})/)?.[1] || rawTime;
      addFact(facts, `${root}.time`, 'time', rawTime, { displayValue: clock, spokenForms: [rawTime, clock] });
    }
    addNumber(facts, `${root}.temperature`, hour?.temperature, 'องศาเซลเซียส');
    addNumber(facts, `${root}.rainProbability`, hour?.precipitationProbability, 'เปอร์เซ็นต์');
    addNumber(facts, `${root}.precipitation`, hour?.precipitation, 'มิลลิเมตร');
  }

  const rainPeriods = weather.rainWindows?.periods;
  if (rainPeriods && typeof rainPeriods === 'object') {
    for (const [period, values] of Object.entries(rainPeriods)) {
      if (!['morning', 'afternoon', 'evening'].includes(period) || !values || typeof values !== 'object') continue;
      const root = `weather.rainWindows.${period}`;
      addFact(facts, `${root}.label`, 'text', values.label);
      addNumber(facts, `${root}.maxProbability`, values.maxProb, 'เปอร์เซ็นต์');
      addNumber(facts, `${root}.maxPrecipitation`, values.maxMm, 'มิลลิเมตร');
    }
  }

  addFact(facts, 'date.label', 'text', dateInfo.date || dateInfo.label);
  addFact(facts, 'date.iso', 'time', dateInfo.iso || dateInfo.dateIso);

  const factIds = Object.keys(facts);
  const allowList = unique(factIds.flatMap((id) => facts[id].spokenForms));
  return { schemaVersion: '1.0', severity, facts, factIds, allowList };
}

function getFact(snapshot, id) {
  return snapshot?.facts && Object.hasOwn(snapshot.facts, id) ? snapshot.facts[id] : undefined;
}

function getAllowedFactIds(snapshot) {
  return snapshot && Array.isArray(snapshot.factIds) ? [...snapshot.factIds] : [];
}

module.exports = {
  SEVERITY_LABELS,
  TREND_LABELS,
  FRESHNESS_LABELS,
  buildFactsSnapshot,
  getFact,
  getAllowedFactIds,
  toThaiNumberWords,
  toThaiDigits,
};
