const { TOKENS, SEVERITY_TOKENS, CTA_URLS, CTA_LABELS } = require('./tokens');

function safeSeverity(value) {
  return Object.hasOwn(SEVERITY_TOKENS, value) ? value : 'unknown';
}
function textNode(value, options = {}) {
  return {
    type: 'text', text: String(value ?? ''), size: options.size || 'sm',
    ...(options.weight ? { weight: options.weight } : {}),
    color: options.color || TOKENS.text.primary,
    wrap: options.wrap !== false,
    ...(options.align ? { align: options.align } : {}),
    ...(options.margin ? { margin: options.margin } : {}),
    ...(options.flex !== undefined ? { flex: options.flex } : {}),
  };
}
function badge(severity) {
  const token = SEVERITY_TOKENS[safeSeverity(severity)];
  return {
    type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
      { type: 'box', layout: 'vertical', width: '32px', height: '32px', cornerRadius: '16px', backgroundColor: token.band,
        justifyContent: 'center', contents: [textNode(token.icon, { size: 'md', align: 'center' })] },
      textNode(token.label, { size: 'lg', weight: 'bold', color: token.foreground }),
    ],
  };
}
function chip(label, options = {}) {
  return {
    type: 'box', layout: 'vertical', paddingAll: 'xs', cornerRadius: 'md',
    backgroundColor: options.backgroundColor || '#E2E8F0',
    contents: [textNode(label, { size: 'xs', weight: 'bold', color: options.color || TOKENS.text.secondary })],
  };
}
function stationStatusScale(label) {
  const current = String(label || '');
  const states = [
    { label: 'ปกติ', severity: 'normal', matches: /ปกติ/ },
    { label: 'น้ำมาก', severity: 'watch', matches: /น้ำมาก/ },
    { label: 'ใกล้ล้นตลิ่ง', severity: 'affected', matches: /ใกล้\s*ล้นตลิ่ง/ },
    { label: 'ล้นตลิ่ง', severity: 'critical', matches: /ล้นตลิ่ง/ },
  ];
  return {
    type: 'box', layout: 'horizontal', spacing: 'xs', margin: 'sm', contents: states.map((state) => {
      const nearBank = /ใกล้\s*ล้นตลิ่ง/.test(current);
      const active = Boolean(current && (state.severity === 'critical'
        ? /ล้นตลิ่ง/.test(current) && !nearBank
        : state.matches.test(current)));
      const token = SEVERITY_TOKENS[state.severity];
      return chip(state.label, {
        backgroundColor: active ? token.band : '#F1F5F9',
        color: active ? token.foreground : TOKENS.text.muted,
      });
    }),
  };
}
function stationRow(station = {}) {
  const left = [textNode('📍 ' + (station.name || ''), { size: 'sm', weight: 'bold' })];
  if (station.waterway) left.push(textNode(station.waterway, { size: 'xs', color: TOKENS.text.muted }));
  if (station.label) left.push(textNode(station.label, { size: 'xs', color: TOKENS.text.secondary }));
  if (station.trend) left.push(textNode(station.trend, { size: 'xs', color: TOKENS.text.muted }));
  const right = station.distance
    ? [textNode(station.distance, { size: 'sm', weight: 'bold', align: 'end' })]
    : [textNode('ระดับจากแหล่งข้อมูล', { size: 'xs', color: TOKENS.text.muted, align: 'end' })];
  const details = {
    type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
      { type: 'box', layout: 'vertical', flex: 1, contents: left },
      { type: 'box', layout: 'vertical', contents: right },
    ],
  };
  return { type: 'box', layout: 'vertical', margin: 'md', contents: [details, stationStatusScale(station.label)] };
}
function metricTile({ icon = '•', label, value, detail } = {}) {
  const contents = [
    { type: 'box', layout: 'horizontal', spacing: 'xs', contents: [textNode(icon, { size: 'sm' }), textNode(label || 'ข้อมูล', { size: 'xs', weight: 'bold', color: TOKENS.text.secondary })] },
    textNode(value || '', { size: 'md', weight: 'bold' }),
  ];
  if (detail) contents.push(textNode(detail, { size: 'xs', color: TOKENS.text.muted }));
  return { type: 'box', layout: 'vertical', flex: 1, paddingAll: 'sm', cornerRadius: 'md', backgroundColor: TOKENS.surface.subtle, contents };
}
function actionRow(value, { severity = 'watch', label = 'สิ่งที่ควรทำ' } = {}) {
  const critical = safeSeverity(severity) === 'critical';
  const contents = critical && label === 'ทำทันที'
    ? [textNode(label + ': ' + value, { size: 'sm', weight: 'bold', color: TOKENS.text.inverse })]
    : [
      textNode(label, { size: 'xs', weight: 'bold', color: critical ? TOKENS.text.inverse : SEVERITY_TOKENS.affected.foreground }),
      textNode(value, { size: 'sm', weight: 'bold', color: critical ? TOKENS.text.inverse : TOKENS.text.primary }),
    ];
  return {
    type: 'box', layout: 'vertical', paddingAll: 'sm', cornerRadius: 'md',
    backgroundColor: critical ? TOKENS.surface.darkAction : '#FFF7ED',
    contents,
  };
}
function ctaFooter(items = [], { severity = 'normal', primaryId } = {}) {
  const token = SEVERITY_TOKENS[safeSeverity(severity)];
  const buttons = items.filter((item) => item && Object.hasOwn(CTA_URLS, item.id)).map((item) => ({
    type: 'button', style: item.id === primaryId ? 'primary' : 'secondary', height: 'sm',
    ...(item.id === primaryId ? { color: token.accent } : {}),
    action: { type: 'uri', label: CTA_LABELS[item.id], uri: CTA_URLS[item.id] },
  }));
  return { type: 'box', layout: 'vertical', spacing: 'sm', margin: 'md', contents: buttons };
}
function heroBubble({ severity = 'unknown', contents = [], backgroundColor } = {}) {
  const token = SEVERITY_TOKENS[safeSeverity(severity)];
  return {
    type: 'bubble', size: 'kilo', body: {
      type: 'box', layout: 'vertical', paddingAll: 'md', backgroundColor: backgroundColor || token.surface, contents,
    },
  };
}
function bubbleShell({ role, heading, severity = 'unknown', contents = [], headerColor, backgroundColor } = {}) {
  const token = SEVERITY_TOKENS[safeSeverity(severity)];
  const header = {
    type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
      textNode(heading || 'ข้อมูล', { size: 'md', weight: 'bold', color: headerColor || token.foreground, flex: 1 }),
      textNode(role || '', { size: 'xs', color: TOKENS.text.muted, align: 'end' }),
    ],
  };
  return heroBubble({ severity, backgroundColor, contents: [header, ...contents] });
}
const stationsBubble = (options = {}) => bubbleShell({ ...options, role: 'ข้อมูลสถานี' });
const locationsBubble = (options = {}) => bubbleShell({ ...options, role: 'พื้นที่และเส้นทาง' });
const impactBubble = (options = {}) => bubbleShell({ ...options, role: 'ผลกระทบ' });
const actionsBubble = (options = {}) => bubbleShell({ ...options, role: 'คำแนะนำ' });
const weatherBubble = (options = {}) => bubbleShell({ ...options, role: 'อากาศ' });
const sourceBubble = (options = {}) => bubbleShell({ ...options, role: 'แหล่งข้อมูล' });
const whyUnknownBubble = (options = {}) => bubbleShell({ ...options, role: 'ข้อจำกัดข้อมูล' });

module.exports = {
  safeSeverity, textNode, badge, chip, stationStatusScale, stationRow, metricTile, actionRow, ctaFooter,
  heroBubble, stationsBubble, locationsBubble, impactBubble, actionsBubble, weatherBubble, sourceBubble, whyUnknownBubble,
};
