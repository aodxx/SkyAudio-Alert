// src/forecast/advice.js
// Converts advice signals from the analyzer into short, friendly Thai
// sentences. Order matters: most actionable/urgent advice first.

const TEMPLATES = {
  RAIN_LIKELY_NOW: () => 'ตอนนี้มีฝนตกอยู่... ถ้าจะออกจากบ้าน พกร่มหรือเสื้อกันฝนไว้ด้วยนะ',
  RAIN_LIKELY_EVENING: () => 'ช่วงเย็นมีโอกาสฝนค่อนข้างสูง... เตรียมร่มไว้ก่อนออกจากบ้านนะ',
  RAIN_POSSIBLE_EVENING: () => 'ช่วงเย็นมีโอกาสฝนอยู่บ้างครับ... พกร่มติดตัวไว้จะอุ่นใจกว่า',
  RAIN_LIKELY_MORNING: () => 'ช่วงเช้ามีโอกาสฝน ใครต้องออกไปทำธุระแต่เช้าเตรียมร่มไว้ด้วยนะ',
  RAIN_LIKELY_AFTERNOON: () => 'ช่วงบ่ายมีโอกาสฝน หากมีนัดกลางแจ้งควรวางแผนล่วงหน้า',
  HOT_MIDDAY: () => 'ช่วงกลางวันอากาศร้อน... ดื่มน้ำบ่อย ๆ และหลบแดดจัดด้วยนะ',
  HIGH_APPARENT_TEMP: () => 'อากาศตอนนี้รู้สึกร้อนอบอ้าว ควรพักในที่ร่มเป็นระยะ',
  STRONG_WIND: () => 'วันนี้ลมค่อนข้างแรง... ระวังของปลิวและกิ่งไม้ด้วยนะ',
  COOL_MORNING: () => 'ช่วงเช้าอากาศค่อนข้างเย็น... ใครออกไปทำงานเตรียมเสื้อคลุมบาง ๆ ไว้ด้วยนะ',
  OUTDOOR_ACTIVITY_CAUTION: () => 'สภาพอากาศวันนี้ค่อนข้างแปรปรวน ควรติดตามข่าวสารและระมัดระวังการเดินทาง',
};

function buildAdvice(adviceSignals) {
  return adviceSignals
    .filter((s) => TEMPLATES[s])
    .map((s) => TEMPLATES[s]());
}

module.exports = { buildAdvice, TEMPLATES };
