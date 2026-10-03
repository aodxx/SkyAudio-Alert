// src/flex/builder.js
// Compact flood-first Flex payload.

const { headerBlock, floodStatusBlock, weatherBlock, actionButtons, footerBlock } = require('./components');

function buildFlex(reportData) {
  const flood = reportData.flood || { severity: 'unknown', summary: 'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้' };
  const bodyContents = [
    headerBlock(reportData.location, reportData.dateInfo),
    floodStatusBlock(flood),
    weatherBlock(reportData),
    actionButtons(flood.severity),
    footerBlock(),
  ];
  const bubble = { type: 'bubble', size: 'kilo', body: { type: 'box', layout: 'vertical', paddingAll: 'md', backgroundColor: '#F8FAFC', contents: bodyContents } };
  const altText = `สถานการณ์น้ำ${flood.severity === 'watch' ? 'เฝ้าระวัง' : flood.severity === 'affected' ? 'ได้รับผลกระทบ' : flood.severity === 'critical' ? 'วิกฤต' : ''} ${reportData.location?.province || 'พัทลุง'} · ${reportData.current?.conditionLabel || 'พยากรณ์อากาศ'}`;
  return { type: 'flex', altText: altText.slice(0, 400), contents: bubble };
}
module.exports = { buildFlex };
