// src/forecast/thaiScript.js
// Builds the spoken Thai script for TTS from live analysis data (not a
// hard-coded string). Target length: ~30-90 seconds when read aloud.

function round(n) {
  return n === null || n === undefined ? null : Math.round(n);
}

function buildThaiScript(analysis, adviceSentences, location) {
  const { current, daily } = analysis;
  const temp = round(current.temperature);
  const apparent = round(current.apparentTemperature);
  const tMin = round(daily.tempMin);
  const tMax = round(daily.tempMax);
  const condition = current.description.label;

  const lines = [];
  lines.push(`สวัสดีตอนเช้าครับพี่น้อง${location.name}`);
  lines.push('น้องจุ่นจ้านรายงานอากาศประจำวันนี้ครับ');
  lines.push('');
  lines.push(`ตอนนี้อุณหภูมิประมาณ ${temp} องศา ${condition} และรู้สึกประมาณ ${apparent} องศา`);

  if (tMin !== null && tMax !== null) {
    lines.push(`วันนี้อุณหภูมิจะอยู่ประมาณ ${tMin} ถึง ${tMax} องศา`);
  }

  if (adviceSentences.length > 0) {
    lines.push('');
    for (const s of adviceSentences.slice(0, 3)) {
      lines.push(s);
    }
  }

  lines.push('');
  lines.push('ขอให้ทุกคนเดินทางปลอดภัยและมีวันที่ดีครับ');

  return lines.join('\n');
}

module.exports = { buildThaiScript };
