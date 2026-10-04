// src/content/presentationContract.js
// Validates presentation/narration output without allowing the model to own severity.
const ROLES = Object.freeze(['hero', 'action', 'facts', 'impact', 'weather', 'source', 'uncertainty']);
const TONES = Object.freeze(['calm', 'friendly', 'urgent']);
const DETAILS = Object.freeze(['standard', 'detailed', 'high']);
const SEVERITIES = Object.freeze(['normal', 'watch', 'affected', 'critical', 'unknown']);
const text = (value) => value === null || value === undefined ? '' : String(value).trim();
const list = (value, max) => Array.isArray(value) ? value.map(text).filter(Boolean).slice(0, max) : [];

function parsePresentationPlan(value, { expectedSeverity } = {}) {
  let parsed = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch (_) { return { ok: false, errors: ['PresentationPlan is not valid JSON'] }; }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false, errors: ['PresentationPlan must be an object'] };

  const adapterOwnsSeverity = SEVERITIES.includes(expectedSeverity);
  const severity = adapterOwnsSeverity ? expectedSeverity : 'unknown';
  const cards = Array.isArray(parsed.cards) ? parsed.cards.slice(0, 10).map((card, index) => ({
    id: text(card.id) || 'card-' + (index + 1),
    role: ROLES.includes(card.role) ? card.role : 'facts',
    title: text(card.title),
    body: text(card.body),
    items: list(card.items, 4),
    cta: Array.isArray(card.cta) ? card.cta.slice(0, 3)
      .map((item) => ({ label: text(item?.label), uri: text(item?.uri) }))
      .filter((item) => item.label && item.uri) : [],
  })) : [];
  const plan = {
    schemaVersion: '1.0',
    severity,
    priority: severity,
    visualVariant: severity,
    cards,
    spokenText: text(parsed.spokenText),
    spokenSections: list(parsed.spokenSections, 8),
    audioStyle: {
      tone: TONES.includes(parsed.audioStyle?.tone) ? parsed.audioStyle.tone : 'calm',
      pacing: text(parsed.audioStyle?.pacing) || 'natural',
      detailLevel: DETAILS.includes(parsed.audioStyle?.detailLevel) ? parsed.audioStyle.detailLevel : 'standard',
      emphasis: list(parsed.audioStyle?.emphasis, 6),
    },
    audioSelectionPolicy: 'gemini-adaptive-within-verified-facts',
    actions: list(parsed.actions, 3),
    warnings: list(parsed.warnings, 10),
    factsUsed: list(parsed.factsUsed, 30),
  };
  const errors = adapterOwnsSeverity ? validatePresentationPlan(plan, { expectedSeverity })
    : ['expectedSeverity must be supplied by the verified flood adapter', ...validatePresentationPlan(plan)];
  return errors.length ? { ok: false, errors, plan } : { ok: true, plan };
}

function validatePresentationPlan(plan, { expectedSeverity } = {}) {
  const errors = [];
  if (!plan || typeof plan !== 'object') return ['PresentationPlan must be an object'];
  if (plan.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (!SEVERITIES.includes(plan.severity)) errors.push('severity is invalid');
  if (plan.priority !== plan.severity) errors.push('priority must match verified severity');
  if (plan.visualVariant !== plan.severity) errors.push('visualVariant must match verified severity');
  if (!text(plan.spokenText)) errors.push('spokenText is required');
  if (!Array.isArray(plan.cards) || !plan.cards.length || plan.cards.length > 10) errors.push('cards must contain 1-10 items');
  if (plan.cards?.[0] && (!text(plan.cards[0].title) || !text(plan.cards[0].body))) errors.push('Card 1 must be self-contained');
  if (plan.severity === 'critical' && plan.cards?.[0] && !/ทำ|ติดตาม|หลีกเลี่ยง|ฉุกเฉิน|ทันที|ประกาศ/i.test(plan.cards[0].body)) errors.push('critical Card 1 must contain an immediate action');
  if (plan.severity === 'unknown' && plan.cards?.[0] && !/ยืนยัน|ไม่ทราบ|ไม่พร้อม|ข้อมูล/i.test(plan.cards[0].body)) errors.push('unknown Card 1 must disclose uncertainty');
  if (!TONES.includes(plan.audioStyle?.tone) || !DETAILS.includes(plan.audioStyle?.detailLevel)) errors.push('audioStyle is invalid');
  const combined = [plan.spokenText, ...(plan.actions || []), ...(plan.cards || []).flatMap((card) => [card.title, card.body, ...(card.items || [])])].join('\n');
  if (/ปลอดภัยแน่นอน|น้ำท่วมแน่นอน|ยืนยันว่าเกิดน้ำท่วม|ราคาปาล์ม|ราคายาง|ข่าวสารทั่วไป/i.test(combined)) errors.push('presentation contains unsupported certainty or forbidden topic');
  if (expectedSeverity && plan.severity !== expectedSeverity) errors.push('severity does not match verified flood severity');
  return errors;
}

function buildPresentationPlanFallback({ floodSituation, weatherAnalysis, report }) {
  const severity = SEVERITIES.includes(floodSituation?.severity) ? floodSituation.severity : 'unknown';
  const label = { normal: 'ปกติ', watch: 'เฝ้าระวัง', affected: 'ได้รับผลกระทบ', critical: 'วิกฤต', unknown: 'ยังยืนยันไม่ได้' }[severity];
  const actions = (floodSituation?.actions || []).slice(0, 3);
  const hero = severity === 'unknown'
    ? 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้ จึงไม่ควรสรุปว่าเกิดหรือไม่เกิดน้ำท่วม'
    : (report?.shortSummary || floodSituation?.summary || 'ติดตามสถานการณ์น้ำล่าสุด');
  const cards = [{ id: 'hero', role: severity === 'unknown' ? 'uncertainty' : severity === 'critical' ? 'action' : 'hero', title: 'สถานการณ์น้ำ: ' + label, body: hero, items: [], cta: [] }];
  if (severity === 'critical') {
    cards.push({ id: 'source', role: 'source', title: 'ตรวจสอบข้อมูลทันที', body: 'ติดตามประกาศและแหล่งข้อมูลทางการ', items: [], cta: [
      { label: 'ดูสถานะน้ำ / CCTV', uri: 'https://cctv.maholan.net/' },
      { label: 'สถานการณ์น้ำพัทลุง', uri: 'https://chachoengsao-flood.vercel.app/phatthalung' },
    ] });
  } else {
    cards.push({ id: 'weather', role: 'weather', title: 'พยากรณ์อากาศ', body: weatherAnalysis?.current?.description?.label || 'ติดตามพยากรณ์อากาศ', items: [], cta: [
      { label: 'อากาศ / เรดาร์ฝน', uri: 'https://chachoengsao-flood.vercel.app/phatthalung/weather' },
    ] });
  }
  return {
    schemaVersion: '1.0', severity, priority: severity, visualVariant: severity, cards,
    spokenText: report?.spokenText || '', spokenSections: [],
    audioStyle: { tone: severity === 'critical' ? 'urgent' : 'friendly', pacing: 'natural', detailLevel: severity === 'critical' ? 'high' : 'detailed', emphasis: actions },
    audioSelectionPolicy: 'gemini-adaptive-within-verified-facts', actions, warnings: report?.warnings || [], factsUsed: report?.factsUsed || [],
  };
}

module.exports = { ROLES, parsePresentationPlan, validatePresentationPlan, buildPresentationPlanFallback };
