// src/weather/weatherCodes.js
// Maps Open-Meteo WMO weather codes to a small internal vocabulary.
// https://open-meteo.com/en/docs (WMO Weather interpretation codes)

const CODE_MAP = {
  0: { key: 'clear', label: 'ท้องฟ้าแจ่มใส', severity: 0 },
  1: { key: 'mostly_clear', label: 'ท้องฟ้าโปร่ง', severity: 0 },
  2: { key: 'partly_cloudy', label: 'มีเมฆบางส่วน', severity: 1 },
  3: { key: 'cloudy', label: 'ท้องฟ้ามีเมฆมาก', severity: 1 },
  45: { key: 'fog', label: 'มีหมอก', severity: 1 },
  48: { key: 'fog', label: 'มีหมอกน้ำแข็ง', severity: 1 },
  51: { key: 'drizzle', label: 'ฝนตกปรอย ๆ', severity: 2 },
  53: { key: 'drizzle', label: 'ฝนตกปรอย ๆ', severity: 2 },
  55: { key: 'drizzle', label: 'ฝนตกปรอย ๆ หนาแน่น', severity: 2 },
  56: { key: 'drizzle', label: 'ฝนตกปรอย ๆ เยือกแข็ง', severity: 2 },
  57: { key: 'drizzle', label: 'ฝนตกปรอย ๆ เยือกแข็งหนาแน่น', severity: 2 },
  61: { key: 'rain', label: 'ฝนตกเล็กน้อย', severity: 3 },
  63: { key: 'rain', label: 'ฝนตกปานกลาง', severity: 3 },
  65: { key: 'heavy_rain', label: 'ฝนตกหนัก', severity: 4 },
  66: { key: 'rain', label: 'ฝนเยือกแข็งเล็กน้อย', severity: 3 },
  67: { key: 'heavy_rain', label: 'ฝนเยือกแข็งหนัก', severity: 4 },
  71: { key: 'rain', label: 'หิมะตกเล็กน้อย', severity: 3 },
  73: { key: 'rain', label: 'หิมะตกปานกลาง', severity: 3 },
  75: { key: 'heavy_rain', label: 'หิมะตกหนัก', severity: 4 },
  77: { key: 'rain', label: 'เกล็ดหิมะ', severity: 2 },
  80: { key: 'rain', label: 'ฝนตกเป็นช่วง ๆ เล็กน้อย', severity: 3 },
  81: { key: 'rain', label: 'ฝนตกเป็นช่วง ๆ ปานกลาง', severity: 3 },
  82: { key: 'heavy_rain', label: 'ฝนตกเป็นช่วง ๆ หนักมาก', severity: 4 },
  85: { key: 'rain', label: 'หิมะตกเป็นช่วง ๆ เล็กน้อย', severity: 3 },
  86: { key: 'heavy_rain', label: 'หิมะตกเป็นช่วง ๆ หนัก', severity: 4 },
  95: { key: 'storm', label: 'พายุฝนฟ้าคะนอง', severity: 5 },
  96: { key: 'storm', label: 'พายุฝนฟ้าคะนองมีลูกเห็บเล็กน้อย', severity: 5 },
  99: { key: 'storm', label: 'พายุฝนฟ้าคะนองมีลูกเห็บหนัก', severity: 5 },
};

function describeWeatherCode(code) {
  return CODE_MAP[code] || { key: 'unknown', label: 'ไม่ทราบสภาพอากาศ', severity: 0 };
}

module.exports = { describeWeatherCode, CODE_MAP };
