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

  // A 429 on the primary presentation model can be a model-specific
  // free-tier/request quota. Keep the verified facts unchanged and retry
  // the same presentation request on the explicitly configured fallback model.
  if (!response.ok && response.status === 429 && config.content.fallbackModel && config.content.fallbackModel !== config.content.model) {
    const fallbackUrl = GEMINI_BASE_URL + '/' + encodeURIComponent(config.content.fallbackModel) + ':generateContent';
    const fallbackResult = await fetchGeminiContent(fetchImpl, fallbackUrl, {
      method: 'POST',
      headers: { 'x-goog-api-key': config.content.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, opts.fallbackMaxAttempts || 1);
    const fallbackResponse = fallbackResult?.response || fallbackResult;
    if (fallbackResponse.ok) {
      const fallbackPlan = parsePresentationPlan(
        parseGeminiJsonText(extractText(await fallbackResponse.json())),
        { expectedSeverity },
      );
      if (!fallbackPlan.ok) {
        throw Object.assign(new Error('Gemini presentation fallback model validation failed: ' + fallbackPlan.errors.join('; ')), {
          stage: 'content.presentation',
        });
      }
      return {
        ...fallbackPlan.plan,
        factsUsed: fallbackPlan.plan.factsUsed.length ? fallbackPlan.plan.factsUsed : (context.report?.factsUsed || []),
        provider: 'gemini-fallback',
      };
    }
  }

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

function buildQuotaSafeLongFormNarration(context, plan) {
  const flood = context?.floodSituation || {};
  const base = String(plan?.spokenText || context?.report?.spokenText || flood.summary || 'รายงานสถานการณ์น้ำบ้านลำพายวันนี้').trim();
  const actions = Array.isArray(flood.actions) ? flood.actions.filter(Boolean).join(' ') : '';
  const freshness = flood.freshness?.state === 'stale'
    ? 'ข้อมูลสถานการณ์น้ำที่ใช้ในรอบนี้มีความสดใหม่ไม่เพียงพอ จึงควรอ่านผลด้วยความระมัดระวังและตรวจสอบแหล่งข้อมูลล่าสุดเพิ่มเติม'
    : flood.freshness?.state === 'fresh'
      ? 'ข้อมูลสถานการณ์น้ำในรอบนี้อยู่ในสถานะสดตามเกณฑ์ของระบบ'
      : 'สถานะความสดใหม่ของข้อมูลน้ำยังไม่สามารถยืนยันได้';
  const severityText = ({
    normal: 'สถานการณ์น้ำอยู่ในระดับปกติ',
    watch: 'สถานการณ์น้ำอยู่ในระดับเฝ้าระวัง',
    affected: 'สถานการณ์น้ำอยู่ในระดับได้รับผลกระทบ',
    critical: 'สถานการณ์น้ำอยู่ในระดับวิกฤต',
    unknown: 'สถานการณ์น้ำยังยืนยันไม่ได้',
  })[flood.severity] || 'สถานการณ์น้ำยังยืนยันไม่ได้';
  const sectionsText = [
    `สวัสดีครับพี่น้องบ้านลำพาย วันนี้น้องจุ่นจ้านขอมาเล่าสถานการณ์ให้ฟังแบบค่อย ๆ ทำความเข้าใจไปด้วยกันนะครับ จุดสำคัญของรายงานนี้คือเราจะยึดข้อมูลที่ระบบตรวจสอบมาแล้วเป็นหลัก และจะไม่รีบสรุปสิ่งที่ข้อมูลยังไม่ได้ยืนยัน ${severityText} ${base}`,
    `เริ่มจากเรื่องน้ำก่อนนะครับ เพราะนี่คือประเด็นหลักของรายงานเช้าวันนี้ สิ่งที่เราเห็นในข้อมูลที่ตรวจสอบแล้วควรอ่านตามสถานะที่ระบบระบุ ไม่ควรเติมความหมายจากการคาดเดาเอง ${base} ถ้ามีคำแนะนำจากข้อมูลที่ยืนยันแล้ว เราจะยึดคำแนะนำเหล่านั้นเป็นหลัก ${actions}`,
    `ต่อมาลองทำความเข้าใจข้อมูลสำคัญให้ช้าลงอีกนิดครับ รายงานสถานการณ์น้ำไม่ได้มีความหมายเพียงคำว่าเฝ้าระวังหรือปกติ แต่ยังต้องดูว่าข้อมูลนั้นมาจากไหน อัปเดตเมื่อไร และมีข้อจำกัดอะไรบ้าง การฟังรายงานแบบนี้จึงควรแยกข้อเท็จจริงออกจากการคาดการณ์ให้ชัดเจน และใช้ข้อความที่ยืนยันแล้วเป็นฐานในการตัดสินใจ`,
    `เรื่องแนวโน้มก็เช่นกันครับ แนวโน้มมีไว้ช่วยให้เราเห็นทิศทางของสถานการณ์จากข้อมูลที่มี แต่ไม่ได้หมายความว่าเราสามารถทำนายเหตุการณ์ถัดไปได้อย่างแน่นอน เพราะสถานการณ์น้ำเปลี่ยนได้ตามเวลาและตามข้อมูลใหม่ที่เข้ามา ${freshness} ดังนั้นถ้าจะตัดสินใจเรื่องสำคัญ ควรตรวจสอบข้อมูลล่าสุดประกอบเสมอ`,
    `สำหรับพื้นที่และการใช้ชีวิตประจำวัน สิ่งที่สำคัญคืออย่าให้คำอธิบายที่ฟังดูมั่นใจเกินข้อมูลทำให้เราเข้าใจสถานการณ์ผิด รายงานนี้จึงจะพูดเฉพาะสิ่งที่ตรวจสอบได้ หากข้อมูลบางส่วนยังไม่มี เราจะบอกตรง ๆ ว่ายังไม่มี แทนการเติมรายละเอียดที่ระบบไม่ได้รับมา วิธีนี้อาจฟังดูระมัดระวัง แต่ช่วยให้การตัดสินใจของชาวบ้านตั้งอยู่บนข้อมูลจริงมากกว่า`,
    `มาดูเรื่องอากาศกันครับ ข้อมูลพยากรณ์อากาศมีประโยชน์สำหรับการวางแผนชีวิตประจำวันและการเตรียมตัว แต่พยากรณ์ฝนไม่ใช่หลักฐานยืนยันว่าพื้นที่กำลังเกิดน้ำท่วม เราจึงใช้ข้อมูลอากาศเป็นข้อมูลประกอบ และยังคงแยกออกจากสถานการณ์น้ำที่ตรวจวัดจริงอย่างชัดเจน ถ้าฝนมีแนวโน้มมากขึ้น สิ่งที่ควรทำคือรับรู้ไว้เป็นบริบทและติดตามข้อมูลน้ำที่ยืนยันได้ต่อไป`,
    `เวลาฟังคำพยากรณ์ อยากให้จำหลักง่าย ๆ ข้อนี้ครับ ฝนกับน้ำท่วมเป็นคนละเรื่องกัน พยากรณ์ช่วยบอกสภาพอากาศที่คาดว่าจะเกิดขึ้น ส่วนสถานการณ์น้ำต้องอาศัยข้อมูลสถานีหรือแหล่งข้อมูลน้ำที่ตรวจสอบได้ เพราะฉะนั้นเราจะไม่เอาความน่าจะเป็นของฝนมาแปลงเป็นคำยืนยันเรื่องน้ำท่วมโดยอัตโนมัติ วิธีคิดแบบนี้ช่วยลดความสับสนและช่วยให้เราไม่ตื่นตระหนกจากข้อมูลเพียงด้านเดียว`,
    `สิ่งที่ควรทำในเช้าวันนี้จึงเป็นการติดตามข้อมูลตามระดับสถานการณ์ที่ยืนยันแล้วครับ ถ้ามีคำแนะนำจากแหล่งข้อมูล เราจะให้ความสำคัญกับคำแนะนำนั้นก่อน ${actions} และถ้าข้อมูลยังมีข้อจำกัด ให้ใช้ช่องทางแหล่งข้อมูลที่ระบบเตรียมไว้เพื่อตรวจสอบเพิ่มเติม หลักการง่าย ๆ คือรู้ว่าอะไรยืนยันแล้ว รู้ว่าอะไรยังไม่ยืนยัน และอย่าเติมคำตอบให้กับช่องว่างของข้อมูลด้วยการคาดเดา`,
    `ก่อนจบรายการ ขอทบทวนอีกครั้งครับ ${severityText} ${base} ประเด็นที่อยากให้จำคือสถานการณ์น้ำต้องอ่านจากข้อมูลที่ยืนยันแล้ว ส่วนสภาพอากาศเป็นข้อมูลประกอบและไม่ควรนำมาใช้ยืนยันน้ำท่วมเพียงลำพัง ${freshness} ถ้ามีข้อมูลใหม่เข้ามา ควรใช้ข้อมูลใหม่ที่ตรวจสอบได้แทนการยึดติดกับข้อสรุปเดิม`,
    `และนี่คือช่วงปิดรายการครับ ขอบคุณพี่น้องบ้านลำพายที่ติดตามน้องจุ่นจ้านในเช้าวันนี้ เราจะยึดหลักเดิมเสมอ คือเล่าตามข้อมูลที่ตรวจสอบได้ อธิบายสิ่งที่ข้อมูลหมายถึง และบอกข้อจำกัดตรง ๆ เมื่อยังไม่มีคำตอบที่ยืนยันได้ หากต้องติดตามต่อ ให้ดูแหล่งข้อมูลล่าสุดจากช่องทางที่ระบบจัดเตรียมไว้ และค่อย ๆ ตัดสินใจตามสถานการณ์จริงนะครับ`,
  ];
  const storytellerExpansions = [
    'เวลาฟังข้อมูลสถานการณ์น้ำ ลองคิดเหมือนเรากำลังต่อภาพจากข้อมูลหลายชิ้นเข้าด้วยกันครับ แต่ละชิ้นมีหน้าที่ของมันเอง ข้อมูลสถานีช่วยบอกสิ่งที่ตรวจวัดได้ เวลาอัปเดตช่วยบอกว่าเรากำลังฟังข้อมูลใหม่แค่ไหน และระดับสถานการณ์ช่วยให้เราเข้าใจว่าควรติดตามหรือเตรียมตัวในระดับใด การแยกหน้าที่ของข้อมูลออกจากกันจะช่วยให้เราไม่เอาข้อมูลหนึ่งชิ้นไปตอบคำถามที่ข้อมูลนั้นไม่ได้ตอบ',
    'อีกเรื่องที่อยากชวนทำความเข้าใจคือความไม่แน่นอนครับ การบอกว่ายังยืนยันไม่ได้ไม่ได้หมายความว่าไม่มีอะไรเกิดขึ้น แต่หมายความว่าหลักฐานที่ระบบมีอยู่ยังไม่มากพอที่จะสรุปให้หนักแน่น การพูดแบบนี้ตรง ๆ เป็นเรื่องสำคัญ เพราะช่วยให้คนฟังรู้ว่าควรติดตามอะไรต่อ และช่วยป้องกันการสื่อสารที่มั่นใจเกินข้อเท็จจริง',
    'สำหรับการฟังรายงานในตอนเช้า เราไม่จำเป็นต้องจำทุกคำครับ ให้จับสามเรื่องหลัก คือสถานการณ์น้ำที่ยืนยันแล้ว ข้อมูลประกอบที่ช่วยให้เข้าใจบริบท และสิ่งที่ควรติดตามต่อจากแหล่งข้อมูลจริง ถ้าสามเรื่องนี้ชัดเจน เราก็สามารถใช้รายงานเป็นตัวช่วยในการเริ่มต้นวันโดยไม่ต้องตีความข้อมูลเกินกว่าที่มี',
    'สุดท้ายแล้วรายงานที่ดีไม่ใช่รายงานที่พูดให้ดูน่าตื่นเต้นที่สุด แต่เป็นรายงานที่ทำให้คนฟังเข้าใจสิ่งที่เกิดขึ้นตามหลักฐาน รู้ว่าตรงไหนยังมีข้อจำกัด และรู้ว่าจะตรวจสอบต่ออย่างไร นี่คือหลักที่น้องจุ่นจ้านจะยึดไว้ เพื่อให้เสียงรายงานเป็นเหมือนคนช่วยเล่าและช่วยอธิบาย มากกว่าจะเป็นเพียงการอ่านข้อความจากหน้าจอ',
  ];
  const sections = sectionsText.map((text, index) => ({
    id: 'section-' + (index + 1),
    title: ['เปิดรายการ', 'สถานการณ์น้ำ', 'ข้อมูลสำคัญ', 'แนวโน้ม', 'ข้อจำกัดข้อมูล', 'อากาศวันนี้', 'ทำความเข้าใจพยากรณ์', 'สิ่งที่ควรทำ', 'สรุป', 'ปิดรายการ'][index],
    text: text + ' ' + storytellerExpansions[index % storytellerExpansions.length],
    factsUsed: plan?.factsUsed || [],
  }));
  const spokenText = sections.map((section) => section.text).join('\\n');
  return { sections, spokenText, totalCharacters: spokenText.length, provider: 'quota-safe-fallback' };
}

async function generateLongFormNarration(context, plan, config, opts = {}) {
  if (!config?.content?.apiKey) {
    if (config?.mode === 'production' && !config.dryRun) throw Object.assign(new Error('GEMINI_API_KEY is not configured for long-form narration'), { stage: 'content.narration' });
    const base = String(plan?.spokenText || context?.report?.spokenText || 'รายงานสถานการณ์น้ำบ้านลำพายวันนี้');
    const explainers = [
      'ช่วงนี้เราจะค่อย ๆ ทำความเข้าใจข้อมูลที่มีอยู่ โดยย้ำว่าข้อมูลสถานการณ์น้ำต้องอ่านจากแหล่งที่ตรวจสอบได้ และข้อมูลพยากรณ์อากาศเป็นข้อมูลประกอบ ไม่ใช่หลักฐานยืนยันน้ำท่วม',
      'การติดตามสถานการณ์ที่ดีไม่ใช่การรีบสรุปจากข้อมูลเพียงอย่างเดียว แต่ควรดูเวลาอัปเดต แนวโน้ม และข้อมูลจากจุดตรวจร่วมกัน แล้วค่อยตัดสินใจตามสิ่งที่แหล่งข้อมูลยืนยัน',
      'สำหรับพี่น้องในพื้นที่ หากข้อมูลบางส่วนยังไม่พร้อม สิ่งสำคัญคือรับรู้ข้อจำกัดนั้นตรง ๆ และใช้ช่องทางตรวจสอบที่ระบบเตรียมไว้ แทนการคาดเดาเหตุการณ์ล่วงหน้า',
      'เราจะทบทวนสาระสำคัญอีกครั้งอย่างช้า ๆ เพื่อให้ผู้ฟังที่กำลังเตรียมตัวทำงานในตอนเช้าได้ยินประเด็นสำคัญครบ โดยไม่ต้องตีความตัวเลขหรือข้อความจากหน้าจอเอง',
    ];
    const sections = Array.from({ length: 10 }, (_, index) => ({
      id: 'section-' + (index + 1),
      title: ['เปิดรายการ', 'สถานการณ์น้ำ', 'ข้อมูลสำคัญ', 'แนวโน้ม', 'ข้อจำกัดข้อมูล', 'อากาศวันนี้', 'ทำความเข้าใจพยากรณ์', 'สิ่งที่ควรทำ', 'สรุป', 'ปิดรายการ'][index],
      text: (index === 0 ? 'สวัสดีครับพี่น้องบ้านลำพาย วันนี้น้องจุ่นจ้านจะมาเล่าให้ฟังแบบค่อย ๆ เป็นค่อย ๆ ไปครับ ' : '') + base + ' ' + explainers[index % explainers.length] + ' ' + explainers[(index + 1) % explainers.length] + ' ' + base,
      factsUsed: plan?.factsUsed || [],
    }));
    return { sections, spokenText: sections.map((section) => section.text).join('\n'), totalCharacters: sections.reduce((sum, section) => sum + section.text.length, 0), provider: 'fallback' };
  }

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

  // Long-form narration uses the same quota fallback as presentation planning.
  // This preserves the >10-minute gate while avoiding failure when only the
  // primary content model is quota-limited.
  if (!response.ok && response.status === 429 && config.content.fallbackModel && config.content.fallbackModel !== config.content.model) {
    const fallbackUrl = GEMINI_BASE_URL + '/' + encodeURIComponent(config.content.fallbackModel) + ':generateContent';
    const fallbackResult = await fetchGeminiContent(fetchImpl, fallbackUrl, {
      method: 'POST',
      headers: { 'x-goog-api-key': config.content.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, opts.fallbackMaxAttempts || 1);
    const fallbackResponse = fallbackResult?.response || fallbackResult;
    if (fallbackResponse.ok) {
      const json = JSON.parse(parseGeminiJsonText(extractText(await fallbackResponse.json())));
      const sections = Array.isArray(json?.sections) ? json.sections.map((section, index) => ({
        id: String(section?.id || 'section-' + (index + 1)),
        title: String(section?.title || ''),
        text: String(section?.text || '').trim(),
        factsUsed: Array.isArray(section?.factsUsed) ? section.factsUsed.filter(Boolean).map(String) : [],
      })).filter((section) => section.text) : [];
      const combined = sections.map((section) => section.text).join('\\n');
      if (sections.length < 10) throw Object.assign(new Error('Long-form narration fallback must contain 10 sections; received ' + sections.length), { stage: 'content.narration', retryable: false });
      if (combined.length < 7000) throw Object.assign(new Error('Long-form narration fallback is too short: ' + combined.length + ' characters; minimum 7000'), { stage: 'content.narration', retryable: false });
      return { sections, spokenText: combined, totalCharacters: combined.length, provider: 'gemini-fallback' };
    }
    // If both content models are quota-limited, do not loop the same 429 again.
    // Use a deterministic fact-safe narration so TTS can still be validated and
    // the pipeline can report/deliver a truthful announcement.
    if (fallbackResponse.status === 429) return buildQuotaSafeLongFormNarration(context, plan);
  }

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
  const json = JSON.parse(parseGeminiJsonText(extractText(await response.json())));
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
