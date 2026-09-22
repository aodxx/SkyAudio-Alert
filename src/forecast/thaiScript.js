// src/forecast/thaiScript.js
// Builds the spoken Thai script for TTS from live analysis data.
// Speech is intentionally short, conversational, and pause-friendly for
// older listeners in a village LINE group.

function round(n) {
  return n === null || n === undefined ? null : Math.round(n);
}

function buildThaiScript(analysis, adviceSentences, location, dateInfo, marketBrief = []) {
  const { current, daily } = analysis;
  const temp = round(current.temperature);
  const apparent = round(current.apparentTemperature);
  const tMin = round(daily.tempMin);
  const tMax = round(daily.tempMax);
  const condition = current.description.label;

  const lines = [];
  lines.push(`สวัสดีตอนเช้าพี่น้องชาว${location.name}`);
  lines.push('น้องจุ่นจ้านมารายงานอากาศประจำวันนี้');
  if (dateInfo) {
    lines.push(dateInfo.spokenText);
    lines.push('');
  }
  lines.push(`ตอนนี้... อุณหภูมิประมาณ ${temp} องศา`);
  lines.push(`${condition} และรู้สึกประมาณ ${apparent} องศา`);

  if (tMin !== null && tMax !== null) {
    lines.push(`วันนี้... อุณหภูมิอยู่ประมาณ ${tMin} ถึง ${tMax} องศา`);
  }

  const usableMarket = marketBrief.filter((x) => x && x.status === 'ok' && Number.isFinite(x.price));
  if (usableMarket.length) {
    lines.push('');
    for (const item of usableMarket.slice(0, 2)) {
      const label = item.kind === 'palm' ? 'ปาล์มน้ำมัน' : 'ยางพารา';
      lines.push(`${label} ล่าสุด ${item.price.toFixed(2)} บาทต่อกิโลกรัม` + (item.date ? ` ข้อมูลวันที่ ${item.date}` : ''));
    }
  }

  for (const s of adviceSentences.slice(0, 2)) {
    lines.push('');
    lines.push(s);
  }

  lines.push('');
  lines.push('ใครจะออกไปทำงาน... เตรียมตัวให้เหมาะกับอากาศนะ');
  lines.push('ขอให้ทุกคนเดินทางปลอดภัย และมีวันที่ดีครับ');

  return lines.join('\n');
}

module.exports = { buildThaiScript };