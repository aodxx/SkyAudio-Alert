const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const BASE_URL = 'https://chachoengsao-flood.vercel.app/phatthalung';
const CTA_URLS = deepFreeze({
  cctv: 'https://cctv.maholan.net/',
  'flood-source': BASE_URL,
  'water-map': `${BASE_URL}/map`,
  'weather-radar': `${BASE_URL}/weather`,
});
const CTA_LABELS = deepFreeze({
  cctv: 'ภาพสด / CCTV',
  'flood-source': 'ศูนย์ช่วยเหลือพัทลุง',
  'water-map': 'แผนที่ระดับน้ำพัทลุง',
  'weather-radar': 'พยากรณ์ / เรดาร์',
});
const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/aodxx/SkyAudio-Alert/main/';
const CARD_IMAGE_URLS = deepFreeze({
  floodStatus: `${IMAGE_BASE_URL}2_20261005_193645_0003.jpg`,
  waterMap: `${IMAGE_BASE_URL}4_20261005_193645_0004.jpg`,
  cctv: `${IMAGE_BASE_URL}6_20261005_193645_0005.jpg`,
});
const TOKENS = deepFreeze({
  text: { primary: '#0F172A', secondary: '#334155', muted: '#475569' },
  budget: { maxPayloadBytes: 50 * 1024, maxAltTextCodePoints: 400, maxTextNodeCodePoints: 120, maxCardChars: 1200 },
  ctaUrls: CTA_URLS,
  ctaLabels: CTA_LABELS,
  cardImageUrls: CARD_IMAGE_URLS,
});

module.exports = { TOKENS, CTA_URLS, CTA_LABELS, CARD_IMAGE_URLS };
