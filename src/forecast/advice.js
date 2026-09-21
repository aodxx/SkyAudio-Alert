// src/forecast/advice.js
// Converts advice signals from the analyzer into short, friendly Thai
// sentences. Order matters: most actionable/urgent advice first.

const TEMPLATES = {
  RAIN_LIKELY_NOW: () => 'ตอนนี้กำลังมีฝนตกอยู่ครับ หากจะออกจากบ้านอย่าลืมเตรียมร่มหรือเสื้อกันฝน',
  RAIN_LIKELY_EVENING: () => 'ช่วงเย็นมีโอกาสฝนสูง ควรเตรียมร่มไว้ก่อนออกจากบ้าน',
  RAIN_POSSIBLE_EVENING: () => 'ช่วงเย็นมีโอกาสฝนอยู่บ้าง พกร่มติดตัวไว้จะอุ่นใจกว่าครับ',
  RAIN_LIKELY_MORNING: () => 'ช่วงเช้ามีโอกาสฝน ใครต้องออกไปทำธุระแต่เช้าเตรียมร่มไว้ด้วยนะครับ',
  RAIN_LIKELY_AFTERNOON: () => 'ช่วงบ่ายมีโอกาสฝน หากมีนัดกลางแจ้งควรวางแผนล่วงหน้า',
  HOT_MIDDAY: () => 'ช่วงกลางวันอากาศร้อน ควรดื่มน้ำให้เพียงพอและหลีกเลี่ยงแดดจัด',
  HIGH_APPARENT_TEMP: () => 'อากาศตอนนี้รู้สึกร้อนอบอ้าว ควรพักในที่ร่มเป็นระยะ',
  STRONG_WIND: () => 'วันนี้ลมค่อนข้างแรง ระวังสิ่งของปลิวหรือกิ่งไม้หักนะครับ',
  COOL_MORNING: () => 'ช่วงเช้าอากาศค่อนข้างเย็น ใครออกไปทำงานควรเตรียมเสื้อคลุมบาง ๆ',
  OUTDOOR_ACTIVITY_CAUTION: () => 'สภาพอากาศวันนี้ค่อนข้างแปรปรวน ควรติดตามข่าวสารและระมัดระวังการเดินทาง',
};

function buildAdvice(adviceSignals) {
  return adviceSignals
    .filter((s) => TEMPLATES[s])
    .map((s) => TEMPLATES[s]());
}

module.exports = { buildAdvice, TEMPLATES };
