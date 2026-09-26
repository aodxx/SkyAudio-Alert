// src/market/phatthalungPrices.js
// Official Phatthalung agriculture-market source adapter.
// Decision for the first 7-day trial: use the Provincial Agriculture and
// Cooperatives Office as the primary source for palm oil and rubber.
// If the article cannot be parsed safely, return null rather than repeating
// stale data or guessing a price.

const LIST_URL = 'https://www.opsmoac.go.th/phatthalung-contact-situation';
const SOURCE_NAME = 'สำนักงานเกษตรและสหกรณ์จังหวัดพัทลุง';

function cleanText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
}

function extractLatestArticleLink(html, titlePattern) {
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html))) {
    const text = cleanText(decodeHtml(match[2]));
    if (titlePattern.test(text)) {
      const href = match[1];
      return new URL(href, LIST_URL).toString();
    }
  }
  return null;
}

function parseThaiDate(title) {
  const m = String(title || '').match(/(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(25\d{2})/);
  if (!m) return null;
  const months = {'ม.ค.':1,'ก.พ.':2,'มี.ค.':3,'เม.ย.':4,'พ.ค.':5,'มิ.ย.':6,'ก.ค.':7,'ส.ค.':8,'ก.ย.':9,'ต.ค.':10,'พ.ย.':11,'ธ.ค.':12};
  return `${m[3]}-${String(months[m[2]]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
}

function parsePriceFromText(text, kind) {
  const t = cleanText(text);
  const keyword = kind === 'palm' ? /ปาล์ม/ : /ยางพารา|ยางแผ่น|น้ำยาง/;
  if (!keyword.test(t)) return null;

  // Prefer values explicitly followed by บาท/กก. or บาทต่อกิโลกรัม.
  const explicit = [...t.matchAll(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*บาท\s*(?:\/|ต่อ)?\s*(?:กก\.|กิโลกรัม)/g)]
    .map(m => Number(m[1].replace(/,/g,'')))
    .filter(Number.isFinite);

  if (explicit.length) return Math.max(...explicit);

  // Conservative fallback: only accept a decimal value near the product
  // keyword. This deliberately avoids bare integers because source articles
  // also contain dates, acreage, stock counts, and other unrelated numbers.
  const near = t.match(/(?:ปาล์ม|ยางพารา|ยางแผ่น|น้ำยาง)[^.]{0,180}?([0-9]{1,3}\.[0-9]{1,2})/);
  if (near) {
    const n = Number(near[1]);
    if (n >= 1 && n <= 300) return n;
  }
  return null;
}

function extractImageSources(html) {
  const out = [];
  const re = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const url = new URL(decodeHtml(m[1]), LIST_URL).toString();
      if (/\.(?:png|jpe?g|webp)(?:[?#].*)?$/i.test(url)) out.push(url);
    } catch {}
  }
  return [...new Set(out)];
}

function extractImageText(html) {
  const out = [];
  const re = /<img[^>]+>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    for (const attr of ['alt', 'title']) {
      const x = tag.match(new RegExp(attr + "=[\\\"']([^\\\"']*)[\\\"']", "i"));
      if (x) out.push(decodeHtml(x[1]));
    }
  }
  return out.join(' ');
}

function parseOcrPrice(text, kind) {
  const t = String(text || '').replace(/,/g, '');
  const explicit = [...t.matchAll(/(\d{1,3}\.\d{1,2})\s*(?:baht|บาท)?\s*(?:\/|per)?\s*(?:kg|kilogram|กก|กิโล)/gi)]
    .map(m => Number(m[1]))
    .filter(Number.isFinite);
  const validExplicit = explicit.filter(n => kind === 'palm' ? n >= 1 && n <= 15 : n >= 40 && n <= 150);
  if (validExplicit.length) return validExplicit[0];

  const candidates = [...t.matchAll(/\b(\d{1,3}\.\d{1,2})\b/g)]
    .map(m => Number(m[1]))
    .filter(Number.isFinite)
    .filter(n => kind === 'palm' ? n >= 1 && n <= 15 : n >= 40 && n <= 150);

  return candidates.length === 1 ? candidates[0] : null;
}

async function ocrImagesForPrice(html, kind) {
  const { spawnSync } = require('node:child_process');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const probe = spawnSync('tesseract', ['--version'], { encoding: 'utf8' });
  const language = process.env.TESSERACT_LANG || 'tha+eng';
  if (probe.error || probe.status !== 0) return null;

  const imageUrls = extractImageSources(html);
  for (let i = 0; i < imageUrls.length; i++) {
    const file = path.join(os.tmpdir(), 'skyaudio-price-' + Date.now() + '-' + i + '.jpg');
    try {
      const res = await fetch(imageUrls[i], { headers: { 'user-agent': 'SkyAudio-Alert/0.4' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 6 * 1024 * 1024) continue;
      fs.writeFileSync(file, buf);
      const out = spawnSync('tesseract', [file, 'stdout', '--psm', '6', '-l', language], {
        encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024
      });
      if (out.status === 0) {
        const price = parseOcrPrice(out.stdout, kind);
        if (price != null) return price;
      }
    } catch {
      // Continue to the next image.
    } finally {
      try { fs.unlinkSync(file); } catch {}
    }
  }
  return null;
}

async function fetchArticle(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'SkyAudio-Alert/0.4' } });
  if (!res.ok) throw new Error('price source HTTP ' + res.status);
  return res.text();
}

async function fetchLatestPrice(kind) {
  const titlePattern = kind === 'palm'
    ? /ราคาปาล์มน้ำมันประจำวันที่/
    : /ราคายางพาราประจำวันที่/;

  const listRes = await fetch(LIST_URL, { headers: { 'user-agent': 'SkyAudio-Alert/0.4' } });
  if (!listRes.ok) throw new Error(`price listing HTTP ${listRes.status}`);
  const listHtml = await listRes.text();
  const articleUrl = extractLatestArticleLink(listHtml, titlePattern);
  if (!articleUrl) return null;

  const articleHtml = await fetchArticle(articleUrl);
  const titleMatch = cleanText(articleHtml).match(titlePattern.source + '[^<]{0,80}');
  const date = parseThaiDate(titleMatch ? titleMatch[0] : '');
  let price = parsePriceFromText(articleHtml, kind);
  let method = price != null ? 'html' : null;

  if (price == null) {
    price = parsePriceFromText(extractImageText(articleHtml), kind);
    if (price != null) method = 'image-metadata';
  }

  if (price == null) {
    price = await ocrImagesForPrice(articleHtml, kind);
    if (price != null) method = 'image-ocr';
  }

  if (price == null) {
    return { kind, sourceName: SOURCE_NAME, articleUrl, date, price: null, status: 'unparsed' };
  }

  return { kind, sourceName: SOURCE_NAME, articleUrl, date, price, unit: 'บาท/กก.', status: 'ok', method };
}

async function fetchMarketBrief() {
  const results = await Promise.allSettled([fetchLatestPrice('palm'), fetchLatestPrice('rubber')]);
  return results.map((r, i) => r.status === 'fulfilled'
    ? r.value
    : ({ kind: i === 0 ? 'palm' : 'rubber', sourceName: SOURCE_NAME, price: null, status: 'error', error: r.reason?.message }));
}

module.exports = { LIST_URL, SOURCE_NAME, fetchLatestPrice, fetchMarketBrief, parsePriceFromText, parseOcrPrice, extractLatestArticleLink };
