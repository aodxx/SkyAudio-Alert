// src/content/presentationPlanner.js
// Gemini may phrase and organize the presentation; flood severity stays adapter-owned.
const { buildGeminiReportInput } = require('./reportContract');
const { parsePresentationPlan, buildPresentationPlanFallback } = require('./presentationContract');
const { GEMINI_BASE_URL, fetchGeminiContent, parseGeminiJsonText } = require('./geminiReport');

function extractText(json) {
  return json?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
}

function plannerSchema() {
  return {
    type: 'OBJECT',
    properties: {
      cards: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
        id: { type: 'STRING' },
        role: { type: 'STRING', enum: ['hero', 'action', 'facts', 'impact', 'weather', 'source', 'uncertainty'] },
        title: { type: 'STRING' }, body: { type: 'STRING' },
        items: { type: 'ARRAY', items: { type: 'STRING' } },
        cta: { type: 'ARRAY', items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, uri: { type: 'STRING' } }, required: ['label', 'uri'] } },
      }, required: ['id', 'role', 'title', 'body', 'items', 'cta'] } },
      spokenText: { type: 'STRING' },
      spokenSections: { type: 'ARRAY', items: { type: 'STRING' } },
      audioStyle: { type: 'OBJECT', properties: {
        tone: { type: 'STRING', enum: ['calm', 'friendly', 'urgent'] },
        pacing: { type: 'STRING' },
        detailLevel: { type: 'STRING', enum: ['standard', 'detailed', 'high'] },
        emphasis: { type: 'ARRAY', items: { type: 'STRING' } },
      }, required: ['tone', 'pacing', 'detailLevel', 'emphasis'] },
      actions: { type: 'ARRAY', items: { type: 'STRING' } },
      warnings: { type: 'ARRAY', items: { type: 'STRING' } },
      factsUsed: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['cards', 'spokenText', 'spokenSections', 'audioStyle', 'actions', 'warnings', 'factsUsed'],
  };
}

async function generatePresentationPlan(context, config, opts = {}) {
  const expectedSeverity = context.floodSituation?.severity || 'unknown';
  const fallback = () => {
    const raw = buildPresentationPlanFallback({ floodSituation: context.floodSituation, weatherAnalysis: context.weatherAnalysis, report: context.report });
    const parsed = parsePresentationPlan(raw, { expectedSeverity });
    if (!parsed.ok) throw new Error(parsed.errors.join('; '));
    return { ...parsed.plan, provider: 'fallback' };
  };
  if (!config?.content?.apiKey) {
    if (config?.mode === 'production' && !config.dryRun) throw new Error('GEMINI_API_KEY is not configured');
    return fallback();
  }

  const input = buildGeminiReportInput({
    floodSituation: context.floodSituation,
    weatherAnalysis: context.weatherAnalysis,
    location: context.location,
    date: context.date,
  });
  const prompt = [
    'คุณคือ Presentation Planner ของน้องจุ่นจ้าน ไม่ใช่แหล่งข้อเท็จจริง',
    'สร้างรายงานภาษาไทยโดยใช้เฉพาะ facts JSON ที่ให้มา ห้ามค้นเว็บ ห้ามเดา ห้ามเพิ่มตัวเลข สถานี ถนน เวลา หรือเหตุการณ์',
    'ห้ามส่งคืน severity, priority หรือ visualVariant; ระบบจะเติมสถานะจาก flood adapter เอง',
    'Card 1 ต้องอ่านจบได้เองและบอกสถานการณ์น้ำทันที; critical ต้องมีคำแนะนำสำคัญใน Card 1; unknown ต้องบอกความไม่แน่นอน',
    'เลือกจำนวนการ์ดตามความสำคัญ ไม่ต้องมีจำนวนตายตัว และทำให้แต่ละการ์ดสั้นสำหรับการเลื่อนแนวนอน',
    'เสียงยังใช้ข้อกำหนดเดิมใน P2; ห้ามพูดถึงราคาปาล์ม ราคายาง ข่าวสารทั่วไป และห้ามใช้คำยืนยันเกิน facts',
    'CTA ใช้ได้เฉพาะ https://cctv.maholan.net/ https://chachoengsao-flood.vercel.app/phatthalung https://chachoengsao-flood.vercel.app/phatthalung/weather',
    'ตอบ JSON ตาม schema เท่านั้น', JSON.stringify(input),
  ].join('\n');
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: {
    responseMimeType: 'application/json',
    thinkingConfig: { thinkingLevel: config.content.thinkingLevel },
    responseSchema: plannerSchema(),
  } };
  const url = GEMINI_BASE_URL + '/' + encodeURIComponent(config.content.model) + ':generateContent';
  const fetchImpl = opts.fetchImpl || fetch;
  const result = await fetchGeminiContent(fetchImpl, url, {
    method: 'POST',
    headers: { 'x-goog-api-key': config.content.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, opts.maxAttempts || 2);
  let response = result?.response || result;
  if (!response.ok && response.status === 503) {
    const recoveryBody = { contents: [{ role: 'user', parts: [{ text: prompt + '\nหาก schema ไม่ได้ ให้ตอบ JSON ธรรมดาเท่านั้น ห้ามใส่ markdown' }] }] };
    const recovery = await fetchGeminiContent(fetchImpl, url, {
      method: 'POST',
      headers: { 'x-goog-api-key': config.content.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(recoveryBody),
    }, opts.recoveryAttempts || 1);
    response = recovery?.response || recovery;
  }
  if (!response.ok) throw Object.assign(new Error('Gemini presentation plan request failed: ' + response.status), {
    stage: 'content.presentation', retryable: response.status === 429 || response.status >= 500,
  });
  const parsed = parsePresentationPlan(parseGeminiJsonText(extractText(await response.json())), { expectedSeverity });
  if (!parsed.ok) throw Object.assign(new Error('Gemini presentation plan validation failed: ' + parsed.errors.join('; ')), { stage: 'content.presentation' });
  return { ...parsed.plan, factsUsed: parsed.plan.factsUsed.length ? parsed.plan.factsUsed : (context.report?.factsUsed || []), provider: 'gemini' };
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

async function generateLongFormNarration(context, plan, config, opts = {}) {
  const input = buildGeminiReportInput({
    floodSituation: context.floodSituation,
    weatherAnalysis: context.weatherAnalysis,
    location: context.location,
    date: context.date,
  });
  const prompt = [
    'คุณคือ “นักเล่าข่าวประจำหมู่บ้าน” ของน้องจุ่นจ้าน ไม่ใช่ผู้ประกาศข่าวโทรทัศน์ และไม่ใช่ผู้อ่านรายงาน',
    'สร้างบทบรรยายเสียงภาษาไทยสำหรับรายงานเช้าบ้านลำพาย โดยเล่าเป็นธรรมชาติ เหมือนคนรู้จักกำลังอธิบายสถานการณ์ให้ชาวบ้านฟัง',
    'ต้องมี 10 ช่วง: เปิดรายการ, สรุปสถานการณ์น้ำ, จุด/สถานีสำคัญ, แนวโน้มและความสดข้อมูล, พื้นที่/ถนนหรือข้อจำกัดข้อมูล, อากาศวันนี้, อธิบายพยากรณ์กับน้ำท่วม, สิ่งที่ควรทำ, สรุปซ้ำ, ปิดรายการ',
    'แต่ละช่วงต้องมีความยาวเพียงพอสำหรับการเล่า ไม่ใช่หัวข้อสั้น ๆ โดยเป้ารวมอย่างน้อย 7,000 ตัวอักษรภาษาไทย',
    'ใช้เฉพาะ facts JSON และข้อมูลที่ยืนยันแล้ว ห้ามสร้างตัวเลข ชื่อสถานี ถนน พื้นที่ เวลา เหตุการณ์ หรือระดับความรุนแรงใหม่',
    'ถ้าข้อมูลบางช่วงไม่มี ให้พูดอย่างตรงไปตรงมาว่ายังไม่มีข้อมูล และอธิบายวิธีติดตามข้อมูลแทน ห้ามเติมข้อเท็จจริง',
    'อนุญาตให้ขยายด้วยความรู้ทั่วไปที่ปลอดภัย เช่น วิธีตีความคำว่าเฝ้าระวัง ความหมายของข้อมูลสด/เก่า ความแตกต่างระหว่างพยากรณ์ฝนกับน้ำท่วมจริง และวิธีตรวจสอบแหล่งข้อมูล',
    'ห้ามพูดว่า “ปลอดภัยแน่นอน” หรือ “น้ำท่วมแน่นอน” และห้ามใช้ฝนพยากรณ์เป็นหลักฐานว่าน้ำท่วมจริง',
    'ห้ามพูดถึงราคาปาล์ม ราคายาง ข่าวทั่วไป หรือเรื่องนอกขอบเขต',
    'ห้ามอ่าน URL, JSON, ชื่อ field หรือคำว่า Card ให้ผู้ฟัง',
    'ให้พูดเหมือนนักเล่าข่าว: มีคำเชื่อม มีการอธิบายความหมายของข้อมูล มีการทวนประเด็นสำคัญด้วยถ้อยคำใหม่ และมีคำเปิด/ปิดที่เป็นธรรมชาติ',
    'แต่ละ section ต้องระบุ factsUsed เป็น fact ID ที่ใช้จริงเท่านั้น',
    'ตอบ JSON ตาม schema เท่านั้น',
    JSON.stringify(input),
  ].join('\n');
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: {
    responseMimeType: 'application/json',
    thinkingConfig: { thinkingLevel: config.content.thinkingLevel },
    responseSchema: narrationSchema(),
  } };
  const url = GEMINI_BASE_URL + '/' + encodeURIComponent(config.content.model) + ':generateContent';
  const fetchImpl = opts.fetchImpl || fetch;
  const result = await fetchGeminiContent(fetchImpl, url, {
    method: 'POST',
    headers: { 'x-goog-api-key': config.content.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, opts.maxAttempts || 2);
  let response = result?.response || result;
  if (!response.ok && response.status === 503) {
    const recovery = await fetchGeminiContent(fetchImpl, url, {
      method: 'POST',
      headers: { 'x-goog-api-key': config.content.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt + '\nตอบ JSON ธรรมดาเท่านั้น' }] }] }),
    }, opts.recoveryAttempts || 1);
    response = recovery?.response || recovery;
  }
  if (!response.ok) throw Object.assign(new Error('Gemini long-form narration request failed: ' + response.status), {
    stage: 'content.narration', retryable: response.status === 429 || response.status >= 500,
  });
  const json = parseGeminiJsonText(extractText(await response.json()));
  const sections = Array.isArray(json?.sections) ? json.sections.map((section, index) => ({
    id: String(section?.id || 'section-' + (index + 1)),
    title: String(section?.title || ''),
    text: String(section?.text || '').trim(),
    factsUsed: Array.isArray(section?.factsUsed) ? section.factsUsed.filter(Boolean).map(String) : [],
  })).filter((section) => section.text) : [];
  const combined = sections.map((section) => section.text).join('\n');
  if (sections.length < 10) throw Object.assign(new Error('Long-form narration must contain 10 sections; received ' + sections.length), { stage: 'content.narration' });
  if (combined.length < 7000) throw Object.assign(new Error('Long-form narration is too short: ' + combined.length + ' characters; minimum 7000'), { stage: 'content.narration' });
  return { sections, spokenText: combined, totalCharacters: combined.length, provider: 'gemini' };
}

module.exports = { generatePresentationPlan, generateLongFormNarration, plannerSchema, narrationSchema };
