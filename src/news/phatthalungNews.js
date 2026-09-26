// src/news/phatthalungNews.js
// Conservative local-news adapter.
// Primary source: Phatthalung Provincial Public Relations Office.
// Only short, attributable headlines are spoken; uncertain parsing is omitted.

const LIST_URL = 'https://phatthalung.prd.go.th/th/page/item/index/id/12';
const SOURCE_NAME = 'สำนักงานประชาสัมพันธ์จังหวัดพัทลุง';

function cleanText(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(value) {
  return cleanText(value)
    .replace(/^ข่าวประชาสัมพันธ์(?:จังหวัดพัทลุง)?\s*:?[\s]*/i, '')
    .replace(/\s+/g, ' ')
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

function parseThaiDate(text) {
  const m = String(text || '').match(/(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(25\d{2})/);
  if (!m) return null;
  const months = {'ม.ค.':1,'ก.พ.':2,'มี.ค.':3,'เม.ย.':4,'พ.ค.':5,'มิ.ย.':6,'ก.ค.':7,'ส.ค.':8,'ก.ย.':9,'ต.ค.':10,'พ.ย.':11,'ธ.ค.':12};
  return { iso: `${m[3]}-${String(months[m[2]]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`, thai: `${m[1]} ${m[2]} ${m[3]}` };
}

function extractHeadlines(html, limit = 2) {
  const out = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const title = normalizeTitle(match[2]);
    if (!isUsefulHeadline(title)) continue;
    let url = null;
    try { url = new URL(match[1], LIST_URL).toString(); } catch {}
    if (!url || !/phatthalung\.prd\.go\.th\/th\/content\/category\/detail\//i.test(url)) continue;
    if (out.some((x) => x.title === title)) continue;
    const tail = String(html || '').slice(re.lastIndex, re.lastIndex + 500);
    const date = parseThaiDate(cleanText(tail));
    out.push({ title, url, date: date?.iso || null, dateThai: date?.thai || null });
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchLocalNews(limit = 2) {
  const res = await fetch(LIST_URL, { headers: { 'user-agent': 'SkyAudio-Alert/0.4' } });
  if (!res.ok) throw new Error('local news HTTP ' + res.status);
  const html = await res.text();
  const items = extractHeadlines(html, limit);
  const enriched = await Promise.all(items.map(async (item) => {
    try {
      const article = await fetch(item.url, { headers: { 'user-agent': 'SkyAudio-Alert/0.4' } });
      if (!article.ok) return item;
      const articleHtml = await article.text();
      const date = parseThaiDate(cleanText(articleHtml));
      return { ...item, date: item.date || date?.iso || null, dateThai: item.dateThai || date?.thai || null };
    } catch {
      return item;
    }
  }));
  return enriched.map((item) => ({
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

module.exports = { LIST_URL, SOURCE_NAME, cleanText, normalizeTitle, parseThaiDate, isUsefulHeadline, extractHeadlines, fetchLocalNews, getLocalNews };
