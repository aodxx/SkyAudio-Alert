// src/news/phatthalungNews.js
// Conservative local-news adapter.
// Primary source: Phatthalung Provincial Public Relations Office.
// We only speak short, attributable headlines; if parsing is uncertain,
// the news section is omitted rather than guessed.

const LIST_URL = 'https://phatthalung.prd.go.th/th/page/item/index/id/12';
const SOURCE_NAME = 'สำนักงานประชาสัมพันธ์จังหวัดพัทลุง';

function cleanText(value) {
  return String(value || '')
    .replace(/<script[\\s\\S]*?<\\/script>/gi, ' ')
    .replace(/<style[\\s\\S]*?<\\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\\s+/g, ' ')
    .trim();
}

function normalizeTitle(value) {
  return cleanText(value)
    .replace(/^ข่าวประชาสัมพันธ์\\s*/i, '')
    .replace(/\\s+/g, ' ')
    .trim();
}

function isUsefulHeadline(title) {
  const t = normalizeTitle(title);
  if (!t || t.length < 12 || t.length > 220) return false;
  const blocked = [
    /พยากรณ์อากาศ/i, /อุตุนิยมวิทยา/i, /แผนที่ฝน/i,
    /ปริมาณฝน/i, /พยากรณ์อากาศ 24 ชม/i,
    /ประกาศประกวดราคา/i, /จัดซื้อจัดจ้าง/i, /รับสมัครงาน/i,
    /ดาวน์โหลด/i, /หน้าแรก/i, /เข้าสู่ระบบ/i, /ติดต่อ/i,
  ];
  return !blocked.some((re) => re.test(t));
}

function extractHeadlines(html, limit = 2) {
  const out = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/a>/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const title = normalizeTitle(match[2]);
    if (!isUsefulHeadline(title)) continue;
    let url = null;
    try { url = new URL(match[1], LIST_URL).toString(); } catch {}
    if (out.some((x) => x.title === title)) continue;
    out.push({ title, url });
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchLocalNews(limit = 2) {
  const res = await fetch(LIST_URL, { headers: { 'user-agent': 'SkyAudio-Alert/0.4' } });
  if (!res.ok) throw new Error('local news HTTP ' + res.status);
  const html = await res.text();
  return extractHeadlines(html, limit).map((item) => ({
    ...item,
    sourceName: SOURCE_NAME,
    status: 'ok',
  }));
}

async function getLocalNews(limit = 2) {
  try {
    return await fetchLocalNews(limit);
  } catch {
    return [];
  }
}

module.exports = { LIST_URL, SOURCE_NAME, extractHeadlines, fetchLocalNews, getLocalNews };
