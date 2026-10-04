// src/flex/components.js
// V1.5 Phase 3: compact, horizontal, flood-first Flex carousel components.

const LINKS = Object.freeze({
  cctv: 'https://cctv.maholan.net/',
  flood: 'https://chachoengsao-flood.vercel.app/phatthalung',
  weather: 'https://chachoengsao-flood.vercel.app/phatthalung/weather',
});

const SEVERITY = Object.freeze({
  normal: { label: 'ปกติ', color: '#0F766E', wash: '#D1FAE5', accent: '#0F766E' },
  watch: { label: 'เฝ้าระวัง', color: '#B45309', wash: '#FEF3C7', accent: '#B45309' },
  affected: { label: 'ได้รับผลกระทบ', color: '#C2410C', wash: '#FFEDD5', accent: '#C2410C' },
  critical: { label: 'วิกฤต', color: '#B91C1C', wash: '#FEE2E2', accent: '#B91C1C' },
  unknown: { label: 'ยังยืนยันไม่ได้', color: '#475569', wash: '#E2E8F0', accent: '#475569' },
});

function safeSeverity(value) {
  return SEVERITY[value] ? value : 'unknown';
}

function textBlock(text, options = {}) {
  return {
    type: 'text',
    text: String(text || ''),
    size: options.size || 'sm',
    weight: options.weight,
    color: options.color || '#0F172A',
    margin: options.margin || 'sm',
    wrap: true,
    flex: options.flex,
  };
}

function cardShell({ title, role, severity, children, page }) {
  const style = SEVERITY[safeSeverity(severity)];
  const roleLabel = {
    hero: 'สถานการณ์น้ำ',
    action: 'ควรทำตอนนี้',
    facts: 'ข้อมูลสำคัญ',
    impact: 'พื้นที่/ผลกระทบ',
    weather: 'พยากรณ์อากาศ',
    source: 'แหล่งข้อมูล',
    uncertainty: 'ข้อจำกัดข้อมูล',
  }[role] || 'ข้อมูล';
  return {
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'md',
      backgroundColor: '#F8FAFC',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: roleLabel, size: 'xs', weight: 'bold', color: style.color, flex: 1 },
            { type: 'text', text: page || '', size: 'xs', color: '#64748B', align: 'end' },
          ],
        },
        textBlock(title, { size: 'lg', weight: 'bold', margin: 'sm' }),
        ...children,
      ],
    },
  };
}

function cta(label, uri, color = '#1D4ED8') {
  return { type: 'button', style: 'primary', height: 'sm', color, action: { type: 'uri', label: String(label).slice(0, 20), uri } };
}

function sourceCtas(severity) {
  const buttons = [
    cta('ดูสถานะน้ำ / CCTV', LINKS.cctv, '#0F766E'),
    cta('สถานการณ์น้ำพัทลุง', LINKS.flood, '#1D4ED8'),
  ];
  if (severity !== 'critical') buttons.push(cta('อากาศ / เรดาร์ฝน', LINKS.weather, '#2563EB'));
  return buttons;
}

function headerBlock(location, dateInfo) {
  return { type: 'box', layout: 'vertical', paddingAll: 'md', background: { type: 'linearGradient', angle: '135deg', startColor: '#0F2742', endColor: '#155E75' }, contents: [
    textBlock('น้องจุ่นจ้าน • รายงานประจำวัน', { size: 'sm', weight: 'bold', color: '#BAE6FD', margin: 'none' }),
    textBlock(location?.name || 'บ้านลำพาย', { size: 'xl', weight: 'bold', color: '#FFFFFF', margin: 'xs' }),
    textBlock((location?.district || '') + ' • ' + (location?.province || 'พัทลุง') + (dateInfo?.solarText ? ' • ' + dateInfo.solarText : ''), { size: 'xs', color: '#E0F2FE', margin: 'xs' }),
  ] };
}

module.exports = { LINKS, SEVERITY, safeSeverity, textBlock, cardShell, cta, sourceCtas, headerBlock };
