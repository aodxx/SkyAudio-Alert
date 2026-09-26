// src/forecast/thaiScript.js
// Builds the full Thai morning loudspeaker-style announcement.
// Phase 1: weather + market prices + local news are spoken in the audio.
// Target length: about 2–3 minutes, with natural pauses and useful village-level detail.

function round(n) {
  return n === null || n === undefined ? null : Math.round(n);
}

function slotLabel(hour) {
  const h = Number(hour);
  if (h < 9) return 'ช่วงเช้า';
  if (h < 12) return 'ช่วงสาย';
  if (h < 15) return 'ช่วงกลางวัน';
  if (h < 18) return 'ช่วงบ่าย';
  return 'ช่วงเย็น';
}

function buildThaiScript(analysis, adviceSentences, location, dateInfo, marketBrief = [], localNews = []) {
  const { current, daily } = analysis;
  const temp = round(current.temperature);
  const apparent = round(current.apparentTemperature);
  const tMin = round(daily.tempMin);
  const tMax = round(daily.tempMax);
  const lines = [];

  lines.push('สวัสดีตอนเช้าครับ พี่น้องชาวบ้านลำพาย');
  lines.push('น้องจุ่นจ้านมารายงานอากาศประจำวัน ราคาผลผลิต และข่าวสารที่เป็นประโยชน์สำหรับเช้านี้ครับ');
  if (dateInfo) lines.push(dateInfo.spokenText);
  lines.push('ขอเวลาสักนิดนะครับ ฟังกันสบาย ๆ ก่อนออกไปทำงาน');
  lines.push('');

  lines.push('เริ่มจากสภาพอากาศตอนนี้ครับ');
  lines.push('ตอนนี้อุณหภูมิประมาณ ' + temp + ' องศา ' + current.description.label);
  if (apparent !== null) lines.push('ความรู้สึกของอากาศอยู่ที่ประมาณ ' + apparent + ' องศา');
  if (current.humidity !== null) lines.push('ความชื้นในอากาศประมาณ ' + Math.round(current.humidity) + ' เปอร์เซ็นต์');
  if (current.windSpeed !== null) lines.push('ลมพัดประมาณ ' + current.windSpeed.toFixed(1) + ' กิโลเมตรต่อชั่วโมง');
  lines.push('');

  if (tMin !== null && tMax !== null) lines.push('สำหรับวันนี้ อุณหภูมิจะอยู่ประมาณ ' + tMin + ' ถึง ' + tMax + ' องศา');

  const slots = (analysis.hourlyToday || [])
    .filter((h) => h && h.time)
    .filter((h) => [6, 9, 12, 15, 18, 21].includes(Number(h.time.slice(11, 13))))
    .map((h) => ({
      hour: Number(h.time.slice(11, 13)),
      temp: round(h.temperature),
      rain: h.precipitationProbability ?? 0,
      description: h.description?.label || '',
    }));

  if (slots.length) {
    lines.push('ถ้าไล่ดูเป็นช่วง ๆ ของวันนี้นะครับ');
    for (const s of slots) {
      const parts = [slotLabel(s.hour) + 'ประมาณ'];
      if (s.temp !== null) parts.push(s.temp + ' องศา');
      if (s.description) parts.push(s.description);
      if (s.rain >= 30) parts.push('มีโอกาสฝนประมาณ ' + Math.round(s.rain) + ' เปอร์เซ็นต์');
      else parts.push('โอกาสฝนไม่มาก');
      lines.push(parts.join(' '));
    }
  }
  lines.push('');

  if (adviceSentences.length) {
    lines.push('เรื่องที่อยากฝากพี่น้องไว้สำหรับวันนี้ครับ');
    for (const sentence of adviceSentences.slice(0, 3)) lines.push(sentence);
  } else {
    lines.push('วันนี้ถ้าจะออกไปทำงานหรือเดินทาง ก็เตรียมตัวตามสภาพอากาศและดูแลสุขภาพกันด้วยนะครับ');
  }
  lines.push('');

  const usableMarket = marketBrief.filter((x) => x && x.status === 'ok' && Number.isFinite(x.price));
  if (usableMarket.length) {
    lines.push('ต่อไปเป็นราคาผลผลิตล่าสุดที่ระบบตรวจพบจากแหล่งข้อมูลจังหวัดครับ');
    for (const item of usableMarket.slice(0, 2)) {
      const label = item.kind === 'palm' ? 'ปาล์มน้ำมัน' : 'ยางพารา';
      const datePart = item.date ? ' ข้อมูลวันที่ ' + item.date : '';
      lines.push(label + ' ล่าสุด ' + item.price.toFixed(2) + ' บาทต่อกิโลกรัม' + datePart);
    }
    lines.push('ราคานี้เป็นข้อมูลล่าสุดที่ระบบหาได้ และวันที่ของข้อมูลอาจไม่ใช่วันเดียวกับวันที่ประกาศนะครับ');
    lines.push('');
  }

  const usableNews = localNews.filter((x) => x && x.status === 'ok' && x.title);
  if (usableNews.length) {
    lines.push('ปิดท้ายด้วยข่าวสารประชาสัมพันธ์จากจังหวัดพัทลุงครับ');
    for (const item of usableNews.slice(0, 2)) {
      lines.push('ข่าวสาร คือ ' + item.title);
    }
    lines.push('ข่าวสารชุดนี้มาจากสำนักงานประชาสัมพันธ์จังหวัดพัทลุงครับ');
    lines.push('');
  }

  lines.push('ใครจะออกไปสวน ออกไปทำงาน หรือเดินทางช่วงเช้านี้');
  lines.push('ดูฟ้า ดูฝน และเตรียมตัวกันสักนิดนะครับ');
  lines.push('ถ้ามีฝนก็พกร่ม ถ้าแดดแรงก็ดื่มน้ำบ่อย ๆ และพักหลบแดดกันด้วย');
  lines.push('ขอให้พี่น้องบ้านลำพายทุกคนทำงานกันอย่างปลอดภัย สุขภาพแข็งแรง');
  lines.push('แล้วพบกันใหม่พรุ่งนี้เช้าครับ');
  lines.push('น้องจุ่นจ้านขอรายงานไว้เท่านี้ สวัสดีครับ');

  return lines.join('\n');
}

module.exports = { buildThaiScript };
