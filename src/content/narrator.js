// src/content/narrator.js
// A short, fact-grounded narration contract independent from Flex.
const { buildGeminiReportInput } = require('./reportContract');
const { GEMINI_BASE_URL, fetchGeminiContent, parseGeminiJsonText } = require('./geminiReport');

const SECTION_IDS = Object.freeze(['opening', 'water', 'weather', 'next-steps']);
const SECTION_TITLES = Object.freeze(['เปิดรายงาน', 'สถานการณ์น้ำ', 'อากาศประกอบ', 'สิ่งที่ควรติดตาม']);

function extractText(json) {
  return json?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
}

function voiceEnding(profile) {
  return profile === 'female-friendly'
    ? { greeting: 'สวัสดีตอนเช้าค่ะ', polite: 'ค่ะ', gentle: 'นะคะ' }
    : { greeting: 'สวัสดีตอนเช้าครับ', polite: 'ครับ', gentle: 'นะครับ' };
}

function narrationSchema() {
  return {
    type: 'OBJECT',
    properties: {
      sections: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
        id: { type: 'STRING' },
        title: { type: 'STRING' },
        text: { type: 'STRING' },
        factsUsed: { type: 'ARRAY', items: { type: 'STRING' } },
      }, required: ['id', 'title', 'text', 'factsUsed'] } },
    },
    required: ['sections'],
  };
}

function normalizeSections(rawSections, { stage = 'content.narration' } = {}) {
  const sections = Array.isArray(rawSections) ? rawSections.map((section, index) => ({
    id: String(section?.id || SECTION_IDS[index] || `section-${index + 1}`),
    title: String(section?.title || SECTION_TITLES[index] || ''),
    text: String(section?.text || '').replace(/\s+/g, ' ').trim(),
    factsUsed: Array.isArray(section?.factsUsed) ? [...new Set(section.factsUsed.filter(Boolean).map(String))] : [],
  })) : [];
  if (sections.length !== SECTION_IDS.length) {
    throw Object.assign(new Error(`Narration must contain four distinct sections; received ${sections.length}`), { stage, retryable: false });
  }
  const normalizedTexts = sections.map((section) => section.text.toLocaleLowerCase('th').replace(/[\s\p{P}\p{S}]/gu, ''));
  if (sections.some((section) => !section.text) || new Set(normalizedTexts).size !== sections.length) {
    throw Object.assign(new Error('Narration sections must be non-empty and must not repeat'), { stage, retryable: false });
  }
  return sections.map((section, index) => ({
    ...section,
    id: SECTION_IDS[index],
    title: SECTION_TITLES[index],
  }));
}

function weatherSummary(weather = {}) {
  const details = [];
  const current = weather.current || {};
  const daily = weather.daily || {};
  const currentLabel = current.description?.label || current.conditionLabel;
  if (currentLabel) details.push(`สภาพอากาศที่รายงานคือ${currentLabel}`);
  if (Number.isFinite(current.temperature)) details.push(`อุณหภูมิที่รายงานตอนนี้ประมาณ ${current.temperature} องศาเซลเซียส`);
  if (Number.isFinite(current.humidity)) details.push(`ความชื้นสัมพัทธ์ประมาณ ${current.humidity} เปอร์เซ็นต์`);
  if (Number.isFinite(current.windSpeed)) details.push(`ความเร็วลมที่รายงานประมาณ ${current.windSpeed} กิโลเมตรต่อชั่วโมง`);
  if (Number.isFinite(current.precipitation)) details.push(`ปริมาณฝนที่จุดและเวลารายงานอยู่ที่ ${current.precipitation} มิลลิเมตร`);
  const min = daily.tempMin;
  const max = daily.tempMax;
  if (Number.isFinite(min) && Number.isFinite(max)) details.push(`อุณหภูมิต่ำสุดประมาณ ${min} และสูงสุดประมาณ ${max} องศาเซลเซียส`);
  const rainPeriods = weather.rainWindows?.periods || {};
  const periodLabels = { morning: 'ช่วงเช้า', afternoon: 'ช่วงบ่าย', evening: 'ช่วงเย็นและค่ำ' };
  let hasPeriodRain = false;
  for (const key of Object.keys(periodLabels)) {
    const period = rainPeriods[key];
    if (!period || (!Number.isFinite(period.maxProb) && !Number.isFinite(period.maxMm))) continue;
    hasPeriodRain = true;
    const values = [];
    if (Number.isFinite(period.maxProb)) values.push(`มีโอกาสฝนสูงสุด ${period.maxProb} เปอร์เซ็นต์`);
    if (Number.isFinite(period.maxMm) && period.maxMm > 0) values.push(`มีฝนสะสมสูงสุด ${period.maxMm} มิลลิเมตร`);
    if (values.length) details.push(`${periodLabels[key]}${values.join(' และ')}`);
  }
  if (!hasPeriodRain && Number.isFinite(daily.precipitationProbabilityMax)) {
    details.push(`พยากรณ์วันนี้มีโอกาสฝนสูงสุด ${daily.precipitationProbabilityMax} เปอร์เซ็นต์`);
  }
  if (!details.length) return 'รอบนี้ไม่มีรายละเอียดพยากรณ์ที่พร้อมนำมาเล่า จึงไม่เติมค่าหรือสภาพอากาศขึ้นเอง';
  return `${details.join(' ')} ข้อมูลส่วนนี้ช่วยวางแผนด้านอากาศ และควรแยกจากสถานการณ์น้ำที่ตรวจวัดได้`;
}

function buildQuotaSafeNarration(context = {}, profile = 'male-friendly') {
  const flood = context.floodSituation || {};
  const location = context.location || {};
  const factsUsed = context.factsSnapshot?.factIds || [];
  const ending = voiceEnding(profile);
  const severityText = ({
    normal: 'สถานการณ์น้ำอยู่ในระดับปกติ',
    watch: 'สถานการณ์น้ำอยู่ในระดับเฝ้าระวัง',
    affected: 'มีรายงานสถานการณ์น้ำที่ได้รับผลกระทบ',
    critical: 'มีรายงานสถานการณ์น้ำระดับวิกฤต',
    unknown: 'สถานการณ์น้ำล่าสุดยังยืนยันไม่ได้',
  })[flood.severity] || 'สถานการณ์น้ำล่าสุดยังยืนยันไม่ได้';
  const freshnessText = flood.freshness?.state === 'fresh'
    ? 'ข้อมูลที่ใช้ในรอบนี้ผ่านเกณฑ์ความสดใหม่ของระบบ'
    : flood.freshness?.state === 'stale'
      ? 'ข้อมูลที่ใช้ในรอบนี้เก่ากว่าเกณฑ์ปกติ จึงควรตรวจสอบข้อมูลล่าสุดก่อนตัดสินใจ'
      : 'ระบบยังยืนยันความสดใหม่ของข้อมูลน้ำไม่ได้';
  const trendText = ({ rising: 'แนวโน้มข้อมูลที่ตรวจพบเพิ่มขึ้น', stable: 'แนวโน้มข้อมูลที่ตรวจพบทรงตัว', falling: 'แนวโน้มข้อมูลที่ตรวจพบลดลง' })[flood.trend] || '';
  const summary = String(flood.summary || 'รอบนี้ไม่มีรายละเอียดสถานการณ์น้ำเพิ่มเติมจากแหล่งข้อมูลที่ตรวจสอบได้').trim();
  const stationDetails = (Array.isArray(flood.stations) ? flood.stations : []).slice(0, 2)
    .map((station) => [station.name, station.label].filter(Boolean).join(' รายงานว่า ')).filter(Boolean).join(' ส่วน ');
  const actions = Array.isArray(flood.actions) ? flood.actions.filter(Boolean).join(' ') : '';
  const place = [location.name, location.province].filter(Boolean).join(' จังหวัด');
  const sections = [
    { id: 'opening', title: 'เปิดรายงาน', text: `${ending.greeting}${place ? ` พี่น้อง${place}` : ' ทุกคน'} น้องจุ่นจ้านมาเล่าสถานการณ์เช้านี้ให้ฟัง${ending.gentle} ${severityText} ${summary}`, factsUsed },
    { id: 'water', title: 'สถานการณ์น้ำ', text: `ค่อย ๆ ดูข้อมูลเรื่องน้ำกัน${ending.gentle} ${stationDetails ? `จุดข้อมูลที่มีรายงานคือ ${stationDetails}` : 'รอบนี้ไม่มีรายละเอียดสถานีหรือจุดวัดเพิ่มเติมให้ยืนยัน'} ${trendText} ${freshnessText}`.trim(), factsUsed },
    { id: 'weather', title: 'อากาศประกอบ', text: `ส่วนเรื่องอากาศ ${weatherSummary(context.weatherAnalysis)}`, factsUsed },
    { id: 'next-steps', title: 'สิ่งที่ควรติดตาม', text: `${actions ? `คำแนะนำจากข้อมูลที่ได้รับคือ ${actions}` : 'โปรดติดตามข้อมูลล่าสุดจากหน่วยงานในพื้นที่ก่อนตัดสินใจเรื่องสำคัญ'} พยากรณ์อากาศเป็นข้อมูลประกอบเท่านั้น ไม่ใช้ยืนยันสถานการณ์น้ำ สรุปสั้น ๆ คือขอให้ติดตามข้อมูลน้ำที่ยืนยันได้ และใช้พยากรณ์เพื่อวางแผนด้านอากาศเท่านั้น${ending.gentle} ขอให้ทุกคนมีวันที่ราบรื่น ดูแลตัวเองและคนที่บ้านด้วย${ending.gentle} ขอบคุณที่รับฟัง${ending.polite} แล้วพบกันใหม่ในรายงานครั้งหน้า${ending.gentle}`, factsUsed },
  ];
  const spokenText = sections.map((section) => section.text).join('\n');
  return { sections, spokenText, totalCharacters: spokenText.length, provider: 'quota-safe-fallback' };
}

function parseNarration(response) {
  try {
    const json = JSON.parse(parseGeminiJsonText(extractText(response)));
    const sections = normalizeSections(json?.sections);
    const spokenText = sections.map((section) => section.text).join('\n');
    return { sections, spokenText, totalCharacters: spokenText.length };
  } catch (error) {
    if (!error.stage) error.stage = 'content.narration';
    throw error;
  }
}

async function generateNarration(context, config, opts = {}) {
  if (!config?.content?.apiKey) {
    if (config?.mode === 'production' && !config.dryRun) {
      throw Object.assign(new Error('GEMINI_API_KEY is not configured for narration'), { stage: 'content.narration', retryable: false });
    }
    return { ...buildQuotaSafeNarration(context, config.tts?.profile), provider: 'fallback' };
  }

  const input = buildGeminiReportInput({
    floodSituation: context.floodSituation,
    weatherAnalysis: context.weatherAnalysis,
    location: context.location,
    date: context.date,
  });
  const prompt = [
    'คุณคือน้องจุ่นจ้าน ผู้เล่าข่าวประจำชุมชน พูดภาษาไทยอย่างอบอุ่น ชัดเจน และเหมาะกับผู้สูงอายุ เหมือนกำลังเล่าให้เพื่อนบ้านฟัง ไม่ใช่อ่านรายการข้อมูล',
    'สร้างบทเสียงรายงานเช้าบ้านลำพายความยาวเป้าหมาย 3–5 นาที มีรายละเอียดพอให้เข้าใจ แต่ห้ามยืดด้วยข้อความซ้ำหรือสรุปซ้ำ',
    'ทำให้ฟังเหมือนคนจริง: เปิดด้วยคำทักทายสวัสดี ใช้คำเชื่อมและจังหวะสนทนาที่เป็นธรรมชาติ มีสรุปสั้น ๆ ก่อนจบ ฝากความปรารถนาดีทั่วไป ขอบคุณผู้ฟัง บอกลา และพูดว่าพบกันใหม่ในรายงานครั้งหน้า',
    config.tts?.profile === 'female-friendly' ? 'ผู้พูดเป็นผู้หญิง ใช้คำลงท้ายให้เป็นธรรมชาติ เช่น ค่ะ และ นะคะ ตลอดทั้งบท' : 'ผู้พูดเป็นผู้ชาย ใช้คำลงท้ายให้เป็นธรรมชาติ เช่น ครับ และ นะครับ ตลอดทั้งบท',
    'ใช้คำทักทาย คำขอบคุณ คำอวยพร และถ้อยคำเชื่อมโยงที่อบอุ่นได้ แม้ไม่ใช่ facts; แต่ห้ามแต่งข้อมูล เหตุการณ์ คำแนะนำเฉพาะ ตัวเลข หรือคำยืนยันสถานการณ์ที่ไม่มีใน JSON',
    'สร้าง 4 ช่วงตามลำดับเท่านั้น: (1) เปิดรายงานและสถานะน้ำ (2) รายละเอียดน้ำ แนวโน้มและความสดของข้อมูล (3) พยากรณ์อากาศวันนี้ในฐานะข้อมูลประกอบ (4) สิ่งที่ควรติดตาม ข้อจำกัด และปิดสั้น ๆ',
    'แต่ละช่วงต้องเพิ่มข้อมูลหรือคำอธิบายใหม่ ห้ามนำข้อเท็จจริงหรือประโยคเดิมกลับมาพูดซ้ำ หากข้อมูลไม่พอให้พูดตรง ๆ อย่างกระชับ ห้ามเติมข้อความเพื่อให้ครบเวลา',
    'ใช้เฉพาะ facts JSON ที่ให้มา ห้ามสร้างตัวเลข ชื่อสถานี ถนน พื้นที่ เวลา เหตุการณ์ หรือระดับความรุนแรงใหม่ และให้ใส่ factsUsed เฉพาะ fact ID ที่ใช้จริง',
    'พยากรณ์ฝนไม่ใช่หลักฐานว่ายืนยันว่าเกิดน้ำท่วม ห้ามพูดว่า “ปลอดภัยแน่นอน” หรือ “น้ำท่วมแน่นอน”',
    'ห้ามพูดถึงราคาปาล์ม ราคายาง ข่าวทั่วไป URL, JSON, ชื่อ field หรือคำว่า Card',
    'ตอบ JSON ตาม schema เท่านั้น',
    JSON.stringify(input),
  ].join('\n');
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: {
    responseMimeType: 'application/json',
    thinkingConfig: { thinkingLevel: config.content.thinkingLevel },
    responseSchema: narrationSchema(),
  } };
  const fetchImpl = opts.fetchImpl || fetch;
  const request = async (model, attempts) => {
    const url = GEMINI_BASE_URL + '/' + encodeURIComponent(model) + ':generateContent';
    return fetchGeminiContent(fetchImpl, url, {
      method: 'POST',
      headers: { 'x-goog-api-key': config.content.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, attempts);
  };
  let result = await request(config.content.model, opts.maxAttempts || 2);
  let response = result?.response || result;
  let provider = 'gemini';

  if (!response.ok && response.status === 429 && config.content.fallbackModel && config.content.fallbackModel !== config.content.model) {
    result = await request(config.content.fallbackModel, opts.fallbackMaxAttempts || 1);
    response = result?.response || result;
    provider = 'gemini-fallback';
    if (!response.ok && (response.status === 429 || response.status >= 500)) {
      return { ...buildQuotaSafeNarration(context), provider: 'quota-safe-fallback' };
    }
  }

  if (!response.ok && response.status === 503) {
    result = await request(config.content.model, opts.recoveryAttempts || 1);
    response = result?.response || result;
  }
  if (!response.ok) {
    throw Object.assign(new Error('Gemini narration request failed: ' + response.status), {
      stage: 'content.narration', retryable: response.status === 429 || response.status >= 500,
    });
  }
  return { ...parseNarration(await response.json()), provider };
}

module.exports = { generateNarration, buildQuotaSafeNarration, narrationSchema, normalizeSections };
