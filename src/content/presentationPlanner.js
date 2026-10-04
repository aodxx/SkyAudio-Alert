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

module.exports = { generatePresentationPlan, plannerSchema };
