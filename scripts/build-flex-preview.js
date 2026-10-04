#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { buildFlexV2 } = require('../src/flex/builder');
const { lintFlexMessage } = require('../src/flex/lint');
const { SEVERITY_TOKENS } = require('../src/flex/tokens');
const { createFlexInput } = require('../tests/helpers/flexV2Fixtures');

const examples = [
  ['normal', false, 'ปกติ / สด'], ['watch', false, 'เฝ้าระวัง / สด'], ['affected', false, 'ได้รับผลกระทบ / สด'],
  ['critical', false, 'วิกฤต / สด'], ['unknown', false, 'ยังยืนยันไม่ได้'], ['watch', true, 'เฝ้าระวัง / ข้อมูลเก่า'],
];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const sizePx = (size) => ({ xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 28 })[size] || 14;
const radiusPx = (value) => ({ none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 20 })[value] ?? (String(value || '').endsWith('px') ? parseInt(value, 10) : 0);
function render(node) {
  if (Array.isArray(node)) return node.map(render).join('');
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text') {
    return `<span class="flex-text" style="font-size:${sizePx(node.size)}px;color:${esc(node.color || '#0F172A')};font-weight:${node.weight === 'bold' ? 700 : 400};text-align:${esc(node.align || 'start')};flex:${Number(node.flex) || 0}">${esc(node.text)}</span>`;
  }
  if (node.type === 'button') {
    const label = node.action?.label || 'เปิด';
    const uri = node.action?.type === 'uri' ? node.action.uri : '#';
    return `<a class="button ${esc(node.style || 'secondary')}" href="${esc(uri)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  }
  if (node.type === 'bubble') return `<article class="bubble">${render(node.body)}</article>`;
  if (node.type === 'box') {
    const direction = node.layout === 'horizontal' ? 'row' : 'column';
    const style = [
      `display:flex`, `flex-direction:${direction}`, `gap:${node.spacing ? '8px' : '4px'}`,
      `padding:${node.paddingAll ? ({ xs: 4, sm: 8, md: 14, lg: 18 }[node.paddingAll] || 8) : 0}px`,
      `margin-top:${node.margin ? ({ xs: 4, sm: 8, md: 12, lg: 16 }[node.margin] || 8) : 0}px`,
      `background:${esc(node.backgroundColor || 'transparent')}`,
      `border-radius:${radiusPx(node.cornerRadius)}px`,
      node.flex ? `flex:${node.flex}` : '',
      node.width ? `width:${esc(node.width)}` : '', node.height ? `min-height:${esc(node.height)}` : '',
    ].filter(Boolean).join(';');
    return `<div class="flex-box" style="${style}">${render(node.contents || [])}</div>`;
  }
  return render(node.contents || node.body || []);
}
function renderExample([severity, stale, title]) {
  const input = createFlexInput({ severity, stale, stationVariant: 'three-plus', weather: true });
  const message = buildFlexV2(input);
  const errors = lintFlexMessage(message, { factsSnapshot: input.factsSnapshot });
  if (errors.length) throw new Error(`${severity} preview failed lint: ${errors.join('; ')}`);
  const token = SEVERITY_TOKENS[severity];
  return `<section class="example" style="--accent:${token.accent};--surface:${token.surface};--band:${token.band}">
    <header><span class="state-icon">${esc(token.icon)}</span><div><strong>${esc(title)}</strong><small>${esc(message.altText)}</small></div></header>
    <div class="carousel">${message.contents.contents.map(render).join('')}</div>
  </section>`;
}
const html = `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SkyAudio-Alert · Flex v2 preview</title>
<style>
:root{color-scheme:light;font-family:system-ui,-apple-system,"Noto Sans Thai",sans-serif;color:#0f172a;background:#f1f5f9}*{box-sizing:border-box}body{margin:0;padding:24px;max-width:1440px;margin-inline:auto}h1{margin:0 0 6px;font-size:28px}p.lead{margin:0 0 24px;color:#475569}.example{margin:20px 0;padding:18px;border:1px solid #cbd5e1;border-left:5px solid var(--accent);border-radius:16px;background:var(--surface)}.example>header{display:flex;gap:14px;align-items:center;margin-bottom:14px}.state-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:var(--band);font-size:24px}.example header small{display:block;margin-top:4px;color:#475569}.carousel{display:flex;gap:14px;overflow-x:auto;padding:2px 2px 12px;scroll-snap-type:x mandatory}.bubble{flex:0 0 340px;max-width:85vw;border:1px solid #cbd5e1;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 4px 12px #0f172a12;scroll-snap-align:start}.flex-text{display:block;line-height:1.45;white-space:pre-wrap}.flex-box{min-width:0}.button{display:inline-flex;justify-content:center;align-items:center;min-height:34px;padding:7px 12px;border:1px solid #94a3b8;border-radius:9px;text-decoration:none;font-size:13px;font-weight:650;color:#1e293b;background:white}.button.primary{background:var(--accent);border-color:var(--accent);color:white}.button.secondary{background:#fff}footer{margin-top:24px;color:#64748b;font-size:12px}
</style></head><body>
<h1>SkyAudio-Alert — Flex v2 preview</h1><p class="lead">ตัวอย่างจาก renderer และ FactsSnapshot จริง · แตะแนวนอนเพื่อเลื่อนแต่ละ carousel · ไม่ใช่ภาพ LINE production</p>
${examples.map(renderExample).join('\n')}
<footer>สร้างจาก deterministic fixtures; CTA ใช้ allow-list ที่กำหนดใน source · ตรวจ visual accessibility บนอุปกรณ์จริงก่อน production</footer>
</body></html>\n`;
const target = path.join(__dirname, '..', 'docs', 'previews', 'flex-v2.html');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, html);
console.log(`Wrote ${target} (${examples.length} preview cases)`);
