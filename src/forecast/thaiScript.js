// src/forecast/thaiScript.js
// Builds the spoken Thai script for TTS from live analysis data.
// Speech is intentionally short, conversational, and pause-friendly for
// older listeners in a village LINE group.

function round(n) {
  return n === null || n === undefined ? null : Math.round(n);
}

function buildThaiScript(analysis, adviceSentences, location, dateInfo) {
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