// src/flex/components.js
// Compact flood-first LINE Flex components. No market/news content.

const LINKS = Object.freeze({
  cctv: 'https://cctv.maholan.net/',
  flood: 'https://chachoengsao-flood.vercel.app/phatthalung',
  weather: 'https://chachoengsao-flood.vercel.app/phatthalung/weather',
});
const SEVERITY = Object.freeze({ normal: { label: 'ปกติ', color: '#0F766E', wash: '#D1FAE5' }, watch: { label: 'เฝ้าระวัง', color: '#B45309', wash: '#FEF3C7' }, affected: { label: 'ได้รับผลกระทบ', color: '#C2410C', wash: '#FFEDD5' }, critical: { label: 'วิกฤต', color: '#B91C1C', wash: '#FEE2E2' }, unknown: { label: 'ยังยืนยันไม่ได้', color: '#475569', wash: '#E2E8F0' } });

function headerBlock(location, dateInfo) {
  return { type: 'box', layout: 'vertical', paddingAll: 'md', background: { type: 'linearGradient', angle: '135deg', startColor: '#0F2742', endColor: '#155E75' }, contents: [
    { type: 'text', text: 'น้องจุ่นจ้าน • รายงานประจำวัน', size: 'sm', weight: 'bold', color: '#BAE6FD' },
    { type: 'text', text: location.name || 'บ้านลำพาย', size: 'xl', weight: 'bold', color: '#FFFFFF', margin: 'xs' },
    { type: 'text', text: `${location.district || ''} • ${location.province || 'พัทลุง'}${dateInfo?.solarText ? ` • ${dateInfo.solarText}` : ''}`, size: 'xs', color: '#E0F2FE', margin: 'xs', wrap: true },
  ] };
}
function floodStatusBlock(flood) {
  const style = SEVERITY[flood?.severity] || SEVERITY.unknown;
  const stations = Array.isArray(flood?.stations) ? flood.stations : [];
  const stationText = stations.slice(0, 2).map((s) => `${s.name}${s.label ? ` · ${s.label}` : ''}`).join('\n');
  return { type: 'box', layout: 'vertical', margin: 'md', paddingAll: 'md', cornerRadius: 'lg', backgroundColor: style.wash, contents: [
    { type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: 'สถานการณ์น้ำ', size: 'sm', weight: 'bold', color: '#334155', flex: 1 },
      { type: 'text', text: style.label, size: 'sm', weight: 'bold', color: style.color, align: 'end' },
    ] },
    { type: 'text', text: flood?.summary || 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้', size: 'md', weight: 'bold', color: '#0F172A', margin: 'sm', wrap: true },
    stationText ? { type: 'text', text: stationText, size: 'xs', color: '#475569', margin: 'sm', wrap: true } : { type: 'text', text: 'เปิดศูนย์ข้อมูลเพื่อดูสถานีล่าสุด', size: 'xs', color: '#64748B', margin: 'sm' },
    { type: 'text', text: `ข้อมูล: ${flood?.freshness?.state === 'stale' ? 'เก่ากว่าเกณฑ์' : flood?.freshness?.state === 'fresh' ? 'อัปเดตแล้ว' : 'ยังไม่ทราบความสดใหม่'}`, size: 'xs', color: '#64748B', margin: 'sm' },
  ] };
}
function weatherBlock(data) {
  return { type: 'box', layout: 'vertical', margin: 'md', paddingAll: 'md', cornerRadius: 'lg', backgroundColor: '#EFF6FF', contents: [
    { type: 'text', text: 'พยากรณ์อากาศ', size: 'sm', weight: 'bold', color: '#1E3A8A' },
    { type: 'text', text: `${data.current?.icon || '🌦️'} ${data.current?.conditionLabel || 'ไม่ทราบสภาพอากาศ'} · ${data.current?.temperature ?? '--'}°`, size: 'md', weight: 'bold', color: '#0F172A', margin: 'sm' },
    { type: 'text', text: `ฝนวันนี้ ${data.daily?.precipitationProbabilityMax ?? '--'}% · ลม ${data.current?.windSpeed ?? '--'}`, size: 'xs', color: '#475569', margin: 'xs' },
  ] };
}
function actionButton(label, uri, color) {
  return { type: 'button', style: 'primary', height: 'sm', color, action: { type: 'uri', label, uri } };
}
function actionButtons(floodSeverity) {
  const buttons = [actionButton('ดูสถานะน้ำ / CCTV', LINKS.cctv, '#0F766E'), actionButton('สถานการณ์น้ำพัทลุง', LINKS.flood, '#1D4ED8')];
  if (floodSeverity !== 'critical') buttons.push(actionButton('พยากรณ์อากาศ / เรดาร์ฝน', LINKS.weather, '#2563EB'));
  return { type: 'box', layout: 'vertical', spacing: 'sm', margin: 'md', contents: buttons };
}
function footerBlock() {
  return { type: 'box', layout: 'horizontal', margin: 'md', contents: [{ type: 'text', text: 'ฟังรายละเอียดในข้อความเสียง', size: 'xs', color: '#64748B', flex: 1 }, { type: 'text', text: 'น้องจุ่นจ้าน', size: 'xs', color: '#64748B', align: 'end' }] };
}
module.exports = { LINKS, SEVERITY, headerBlock, floodStatusBlock, weatherBlock, actionButtons, footerBlock };
