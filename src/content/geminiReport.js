// src/content/geminiReport.js
// Gemini content generation for the flood-first report.
// Facts are supplied by the pipeline; this module never browses or fetches sources.

const { buildGeminiReportInput, parseReportDraft } = require('./reportContract');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function reportError(message, retryable = false, detail) {
  const error = new Error(message);
  error.stage = 'content.generate';
  error.retryable = retryable;
  if (detail) error.detail = detail;
  return error;
}

function floodLabel(situation) {
  return ({ normal: 'ปกติ', watch: 'เฝ้าระวัง', affected: 'ได้รับผลกระทบ', critical: 'วิกฤต', unknown: 'ยังยืนยันไม่ได้' })[situation?.severity] || 'ยังยืนยันไม่ได้';
}

function buildFallbackReport({ floodSituation, weatherAnalysis, location, date }) {
  const flood = floodSituation || { severity: 'unknown', summary: 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้', actions: [] };
  const weather = weatherAnalysis || {};
  const rain = weather.daily?.precipitationProbabilityMax;
  const floodSummary = flood.summary || 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้';
  const weatherSummary = weather.current?.description?.label
    ? `อากาศตอนนี้ ${weather.current.description.label}${weather.current.temperature !== null && weather.current.temperature !== undefined ? ` อุณหภูมิประมาณ ${Math.round(weather.current.temperature)} องศา` : ''}`
    : '';
  const rainSummary = Number.isFinite(rain) && rain >= 40 ? `วันนี้มีโอกาสฝนสูงสุดประมาณ ${Math.round(rain)} เปอร์เซ็นต์` : '';
  const safety = flood.severity === 'critical' || flood.severity === 'affected'
    ? 'ถ้าอยู่ใกล้พื้นที่เสี่ยง ขอให้หลีกเลี่ยงเส้นทางและติดตามประกาศทางการ'
    : flood.severity === 'watch'
      ? 'ช่วยติดตามระดับน้ำและเตรียมของจำเป็นไว้ก่อนนะครับ'
      : flood.severity === 'unknown'
        ? 'ตอนนี้ยังยืนยันข้อมูลน้ำล่าสุดไม่ได้ เปิดดูแหล่งข้อมูลจากปุ่มในข้อความได้เลยครับ'
        : 'ติดตามข้อมูลตามปกติ และพกร่มไว้ถ้าต้องออกจากบ้านนะครับ';
  const spokenText = [
    `สวัสดีครับ น้องจุ่นจ้านรายงานให้บ้านลำพาย${date ? ` ประจำวันที่ ${date}` : ''}`,
    `สถานการณ์น้ำตอนนี้อยู่ในระดับ${floodLabel(flood)}ครับ ${floodSummary}`,
    weatherSummary,
    rainSummary,
    safety,
  ].filter(Boolean).join(' ');
  return {
    schemaVersion: '1.0',
    spokenText,
    shortSummary: `น้ำ${floodLabel(flood)} · ${location?.province || 'พัทลุง'}`,
    priority: flood.severity || 'unknown',
    actions: flood.actions || [],
    factsUsed: ['flood.severity', 'flood.summary', 'weather.current', 'weather.daily.precipitationProbabilityMax'],
    warnings: flood.freshness?.state === 'stale' ? ['ข้อมูลสถานการณ์น้ำเก่าเกินเกณฑ์'] : [],
  };
}

function extractText(json) {
  return json?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
}

function parseGeminiJsonText(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const withoutFence = raw.replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/i, '').trim();
  try {
    JSON.parse(withoutFence);
    return withoutFence;
  } catch (_) {}
  const first = withoutFence.indexOf('{');
  const last = withoutFence.lastIndexOf('}');
  if (first >= 0 && last > first) {
    const candidate = withoutFence.slice(first, last + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch (_) {}
  }
  return withoutFence;
}

async function fetchGeminiContent(doFetch, url, options, maxAttempts = 3) {
  let lastResponse;
  let lastDetail = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const res = await doFetch(url, options);
    if (res.ok) return res;
    lastResponse = res;
    lastDetail = (await res.text().catch(() => '')).slice(0, 500);
    const retryable = res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504;
    if (!retryable || attempt === maxAttempts) break;
    const retryAfter = Number(res.headers?.get?.('retry-after'));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 10000)
      : attempt === 1 ? 5000 : 15000;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return { response: lastResponse, detail: lastDetail };
}

async function generateGeminiReport(context, config, opts = {}) {
  const fallback = () => parseReportDraft(buildFallbackReport(context));
  if (!config?.content?.apiKey) {
    if (config?.mode === 'production' && !config.dryRun) throw reportError('GEMINI_API_KEY is not configured');
    const result = fallback();
    if (!result.ok) throw reportError('Fallback report failed validation', false, result.errors.join('; '));
    return { ...result.draft, provider: 'fallback' };
  }
  if (!config.content.model) throw reportError('GEMINI_CONTENT_MODEL is not configured');
  const doFetch = opts.fetchImpl || fetch;
  const input = buildGeminiReportInput({
    floodSituation: context.floodSituation,
    weatherAnalysis: context.weatherAnalysis,
    location: context.location,
    date: context.date,
  });
  const prompt = [
    'คุณคือน้องจุ่นจ้าน ผู้ช่วยรายงานสถานการณ์น้ำและอากาศสำหรับกลุ่มบ้านลำพาย',
    'เขียนภาษาไทยแบบเป็นกันเอง กระชับ และไม่ทำให้คนตื่นตระหนก',
    'ใช้เฉพาะ facts ใน JSON ด้านล่าง ห้ามค้นเว็บ ห้ามเดาตัวเลข ห้ามสร้างสถานการณ์น้ำจากพยากรณ์ฝน',
    'ห้ามพูดถึงราคาปาล์ม ราคายาง ข่าวสารทั่วไป หรือข้อมูลที่ไม่ได้ให้มา',
    'ความยาวปรับตามความสำคัญของวัน ไม่มีโครงหัวข้อและไม่มีเวลาตายตัว',
    'ตอบเป็น JSON ตาม schema ที่กำหนดเท่านั้น',
    JSON.stringify(input),
  ].join('\n');

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      spokenText: { type: 'STRING' },
      shortSummary: { type: 'STRING' },
      priority: { type: 'STRING', enum: ['normal', 'watch', 'affected', 'critical', 'unknown'] },
      actions: { type: 'ARRAY', items: { type: 'STRING' } },
      factsUsed: { type: 'ARRAY', items: { type: 'STRING' } },
      warnings: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['spokenText', 'shortSummary', 'priority', 'actions', 'factsUsed', 'warnings'],
  };

  const structuredBody = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: config.content.thinkingLevel },
      responseSchema,
    },
  };
  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(config.content.model)}:generateContent`;
  const result = await fetchGeminiContent(doFetch, url, {
    method: 'POST',
    headers: { 'x-goog-api-key': config.content.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(structuredBody),
  }, opts.primaryMaxAttempts || 3);
  let res = result?.response || result;

  // Gemini can return 503 for structured-output requests during demand spikes.
  // Retry the same request first; only then reduce request complexity. This keeps
  // the normal path schema-validated while giving the narrative layer a lighter
  // recovery path without changing the verified facts.
  if (!res.ok && res.status === 503) {
    const recoveryBody = {
      contents: [{
        role: 'user',
        parts: [{
          text: [
            prompt,
            'หากไม่สามารถบังคับ JSON schema ได้ ให้ตอบเป็น JSON object ธรรมดาเท่านั้น ห้ามใส่ markdown code fence และต้องมีคีย์ spokenText, shortSummary, priority, actions, factsUsed, warnings ครบถ้วน',
          ].join('\n'),
        }],
      }],
    };
    const recovery = await fetchGeminiContent(doFetch, url, {
      method: 'POST',
      headers: { 'x-goog-api-key': config.content.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(recoveryBody),
    }, opts.recoveryMaxAttempts || 2);
    res = recovery?.response || recovery;
    if (!res.ok) {
      const detail = recovery?.detail || result?.detail || '';
      throw reportError(`Gemini content request failed after structured + recovery retry: ${res.status}`, res.status >= 500 || res.status === 429, detail);
    }
    const recoveryText = parseGeminiJsonText(extractText(await res.json()));
    const recovered = parseReportDraft(recoveryText);
    if (!recovered.ok) {
      throw reportError('Gemini recovery response failed ReportDraft validation', false, recovered.errors.join('; '));
    }
    return { ...recovered.draft, provider: 'gemini' };
  }

  if (!res.ok) {
    const detail = result?.detail || '';
    throw reportError(`Gemini content request failed after retry: ${res.status}`, res.status >= 500 || res.status === 429, detail);
  }
  const text = extractText(await res.json());
  const parsed = parseReportDraft(text);
  if (!parsed.ok) throw reportError('Gemini content failed ReportDraft validation', false, parsed.errors.join('; '));
  return { ...parsed.draft, provider: 'gemini' };
}

module.exports = { GEMINI_BASE_URL, buildFallbackReport, generateGeminiReport, fetchGeminiContent, parseGeminiJsonText };
