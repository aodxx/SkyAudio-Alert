const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

const SEVERITY_TOKENS = deepFreeze({
  normal: { label: 'ปกติ', icon: '✅', foreground: '#115E59', band: '#CCFBF1', surface: '#F0FDFA', accent: '#0F766E', header: '#0F766E' },
  watch: { label: 'เฝ้าระวัง', icon: '👀', foreground: '#78350F', band: '#FEF3C7', surface: '#FFFBEB', accent: '#92400E', header: '#92400E' },
  affected: { label: 'ได้รับผลกระทบ', icon: '⚠️', foreground: '#7C2D12', band: '#FFEDD5', surface: '#FFF7ED', accent: '#C2410C', header: '#9A3412' },
  critical: { label: 'วิกฤต', icon: '🚨', foreground: '#991B1B', band: '#FEE2E2', surface: '#FEF2F2', accent: '#B91C1C', header: '#7F1D1D' },
  unknown: { label: 'ยังยืนยันไม่ได้', icon: '❔', foreground: '#334155', band: '#E2E8F0', surface: '#F8FAFC', accent: '#475569', header: '#475569' },
});

const CTA_URLS = deepFreeze({
  cctv: 'https://cctv.maholan.net/',
  'flood-source': 'https://chachoengsao-flood.vercel.app/phatthalung',
  'weather-radar': 'https://chachoengsao-flood.vercel.app/phatthalung/weather',
});

const CTA_LABELS = deepFreeze({ cctv: 'เปิด CCTV', 'flood-source': 'ดูสถานการณ์น้ำ', 'weather-radar': 'ดูเรดาร์ฝน' });
const TOKENS = deepFreeze({
  severity: SEVERITY_TOKENS,
  text: { primary: '#0F172A', secondary: '#334155', muted: '#475569', inverse: '#FFFFFF' },
  surface: { base: '#FFFFFF', subtle: '#F8FAFC', border: '#CBD5E1', darkAction: '#7F1D1D' },
  budget: { maxBubbles: 12, maxPayloadBytes: 50 * 1024, maxAltTextCodePoints: 400, maxTextNodeCodePoints: 120, maxCardChars: 1200, maxHeroTextNodes: 7, maxHeroChars: 120 },
  ctaUrls: CTA_URLS,
  ctaLabels: CTA_LABELS,
});

module.exports = { TOKENS, SEVERITY_TOKENS, CTA_URLS, CTA_LABELS };
