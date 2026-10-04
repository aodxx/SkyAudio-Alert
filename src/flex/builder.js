// src/flex/builder.js
// V1.5 Phase 3: adaptive short-bubble carousel. Card 1 is always self-contained.

const { SEVERITY, safeSeverity, textBlock, cardShell, cta, sourceCtas } = require('./components');

function floodLabel(severity) {
  return SEVERITY[safeSeverity(severity)].label;
}

function freshnessText(flood) {
  const state = flood?.freshness?.state;
  if (state === 'fresh') return 'ข้อมูลอัปเดตแล้ว';
  if (state === 'stale') return 'ข้อมูลเก่ากว่าเกณฑ์';
  return 'ยังไม่ทราบความสดใหม่ของข้อมูล';
}

function stationText(flood) {
  return (flood?.stations || []).slice(0, 3)
    .map((s) => (s.name || 'สถานี') + (s.label ? ' · ' + s.label : ''))
    .join(' • ');
}

function buildFallbackCards(reportData) {
  const flood = reportData.flood || { severity: 'unknown', summary: 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้' };
  const severity = safeSeverity(flood.severity);
  const style = SEVERITY[severity];
  const cards = [];

  const heroChildren = [
    { type: 'box', layout: 'horizontal', margin: 'sm', contents: [
      { type: 'text', text: floodLabel(severity), size: 'sm', weight: 'bold', color: style.color, flex: 1 },
      { type: 'text', text: freshnessText(flood), size: 'xs', color: '#64748B', align: 'end', flex: 1, wrap: true },
    ] },
    textBlock(flood.summary || 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้', { size: 'md', weight: 'bold' }),
  ];

  if (severity === 'critical') {
    heroChildren.push(textBlock('หากอยู่ในพื้นที่เสี่ยง ให้ติดตามประกาศและข้อมูลจากแหล่งทางการทันที', { size: 'sm', weight: 'bold', color: style.color }));
  } else if (severity === 'unknown') {
    heroChildren.push(textBlock('ยังสรุปเหตุการณ์น้ำจริงไม่ได้จากข้อมูลที่ยืนยันได้ในขณะนี้', { size: 'sm', weight: 'bold', color: style.color }));
  }

  cards.push(cardShell({
    title: reportData.report?.shortSummary || 'สถานการณ์น้ำ: ' + floodLabel(severity),
    role: severity === 'unknown' ? 'uncertainty' : severity === 'critical' ? 'action' : 'hero',
    severity, page: '1', children: heroChildren,
  }));

  if (severity === 'affected' || severity === 'critical') {
    const locations = (flood.affectedAreas || []).slice(0, 3).map((x) => x.name || x.label || x).filter(Boolean);
    const roads = (flood.roads || []).slice(0, 2).map((x) => x.name || x.label || x).filter(Boolean);
    const lines = locations.map((x) => 'พื้นที่: ' + x).concat(roads.map((x) => 'ถนน: ' + x));
    cards.push(cardShell({ title: 'จุดที่ควรติดตาม', role: 'impact', severity, page: '2', children: [
      textBlock(lines.length ? lines.join(' • ') : 'ยังไม่มีรายละเอียดพื้นที่เพิ่มเติมที่ยืนยันได้', { size: 'sm' }),
    ] }));
  } else if (severity === 'watch') {
    cards.push(cardShell({ title: 'ข้อมูลที่ควรเฝ้าดู', role: 'facts', severity, page: '2', children: [
      textBlock(stationText(flood) || 'ติดตามค่าจากศูนย์ข้อมูลน้ำพัทลุง', { size: 'sm' }),
    ] }));
  } else if (severity === 'unknown') {
    cards.push(cardShell({ title: 'ทำไมยังยืนยันไม่ได้', role: 'uncertainty', severity, page: '2', children: [
      textBlock('แหล่งข้อมูลน้ำล่าสุดไม่พร้อมหรือความสดใหม่ไม่เพียงพอ จึงไม่ควรสรุปว่าเกิดหรือไม่เกิดน้ำท่วม', { size: 'sm' }),
    ] }));
  } else {
    cards.push(cardShell({ title: 'ข้อมูลสถานการณ์', role: 'facts', severity, page: '2', children: [
      textBlock(stationText(flood) || 'ติดตามข้อมูลน้ำล่าสุดจากศูนย์ข้อมูล', { size: 'sm' }),
    ] }));
  }

  if (severity === 'critical') {
    cards.push(cardShell({ title: 'ตรวจสอบข้อมูลทันที', role: 'source', severity, page: '3', children: sourceCtas(severity) }));
  } else {
    cards.push(cardShell({ title: 'พยากรณ์อากาศ', role: 'weather', severity, page: '3', children: [
      textBlock((reportData.current?.icon || '🌦️') + ' ' + (reportData.current?.conditionLabel || 'ไม่ทราบสภาพอากาศ') + ' · ' + (reportData.current?.temperature ?? '--') + '°', { size: 'md', weight: 'bold' }),
      textBlock('ฝนวันนี้ ' + (reportData.daily?.precipitationProbabilityMax ?? '--') + '% · ลม ' + (reportData.current?.windSpeed ?? '--'), { size: 'xs' }),
      ...sourceCtas(severity),
    ] }));
  }

  return cards;
}

function planCardToBubble(card, plan, index) {
  const severity = safeSeverity(plan.severity);
  const children = [];
  if (card.body) children.push(textBlock(card.body, { size: 'sm' }));
  for (const item of Array.isArray(card.items) ? card.items.slice(0, 4) : []) {
    children.push(textBlock(typeof item === 'string' ? item : ((item.label || '') + ' ' + (item.value || '')).trim(), { size: 'xs' }));
  }
  if (Array.isArray(card.cta)) {
    for (const item of card.cta.slice(0, 3)) {
      if (item.label && item.uri) children.push(cta(item.label, item.uri));
    }
  }
  return cardShell({ title: card.title || 'ข้อมูล', role: card.role, severity, page: String(index + 1), children });
}

function buildFlex(reportData) {
  const flood = reportData.flood || { severity: 'unknown', summary: 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้' };
  const severity = safeSeverity(flood.severity);
  const plan = reportData.presentationPlan;
  let bubbles = plan && Array.isArray(plan.cards) && plan.cards.length
    ? plan.cards.map((card, index) => planCardToBubble(card, plan, index))
    : buildFallbackCards(reportData);

  if (!bubbles.length) bubbles = buildFallbackCards(reportData);

  const altText = 'รายงานสถานการณ์น้ำ' + floodLabel(severity) + ': ' + (reportData.report?.shortSummary || flood.summary || 'ยังยืนยันไม่ได้');
  return {
    type: 'flex',
    altText: altText.slice(0, 400),
    contents: { type: 'carousel', contents: bubbles.slice(0, 10) },
  };
}

module.exports = { buildFlex, buildFallbackCards, freshnessText };
