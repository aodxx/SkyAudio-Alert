const { TOKENS, CTA_URLS, SEVERITY_TOKENS } = require('./tokens');

function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((child) => walk(child, visit));
  if (!node || typeof node !== 'object') return;
  visit(node);
  if (node.contents) walk(node.contents, visit);
  if (node.body) walk(node.body, visit);
}
function bubblesOf(message) {
  return message?.contents?.type === 'carousel' && Array.isArray(message.contents.contents)
    ? message.contents.contents.filter((item) => item?.type === 'bubble') : [];
}
function codepoints(value) {
  return Array.from(String(value ?? '')).length;
}
function textNodesOf(node) {
  const result = [];
  walk(node, (item) => { if (item.type === 'text') result.push(item); });
  return result;
}
function shapeOf(node) {
  if (Array.isArray(node)) return node.map(shapeOf);
  if (!node || typeof node !== 'object') return null;
  const shape = { type: node.type };
  if (node.layout) shape.layout = node.layout;
  if (node.size && node.type === 'bubble') shape.size = node.size;
  if (node.contents) shape.contents = shapeOf(node.contents);
  if (node.body) shape.body = shapeOf(node.body);
  if (node.action) shape.action = { type: node.action.type };
  return shape;
}
function hasVisualBlock(bubble) {
  let visual = false;
  walk(bubble?.body, (node) => {
    if (node.type === 'button' || node.type === 'image') visual = true;
    if (node.type === 'box' && (node.cornerRadius || node.width || (node.layout === 'horizontal' && (node.contents || []).some((child) => child.type === 'box')))) visual = true;
  });
  return visual;
}
function collectUris(node) {
  const result = [];
  walk(node, (item) => { if (item.action?.type === 'uri') result.push(item.action.uri); });
  return result;
}
function lintFlexMessage(message, { factsSnapshot } = {}) {
  const errors = [];
  const bubbles = bubblesOf(message);
  if (message?.type !== 'flex') errors.push('message type must be flex');
  if (!message?.altText || !String(message.altText).startsWith('น้ำ')) errors.push('altText must be flood-first and non-empty');
  if (codepoints(message?.altText) > TOKENS.budget.maxAltTextCodePoints) errors.push('altText exceeds character budget');
  if (message?.contents?.type !== 'carousel') errors.push('contents must be a carousel');
  if (bubbles.length < 2 || bubbles.length > TOKENS.budget.maxBubbles) errors.push('carousel must contain 2-12 bubbles');
  if (Buffer.byteLength(JSON.stringify(message || {}), 'utf8') >= TOKENS.budget.maxPayloadBytes) errors.push('Flex payload exceeds byte budget');

  const sizes = new Set(bubbles.map((bubble) => bubble.size));
  if (sizes.size > 1 || (bubbles.length && sizes.has(undefined))) errors.push('all carousel bubbles must use the same size');
  const structures = bubbles.map((bubble) => JSON.stringify(shapeOf(bubble)));
  if (new Set(structures).size !== structures.length) errors.push('duplicate card structure detected');

  for (const uri of collectUris(message)) {
    if (!Object.values(CTA_URLS).includes(uri)) errors.push('CTA URI is not allow-listed: ' + uri);
  }
  for (const [index, bubble] of bubbles.entries()) {
    const textNodes = textNodesOf(bubble);
    const cardChars = textNodes.reduce((sum, node) => sum + codepoints(node.text), 0);
    if (cardChars > TOKENS.budget.maxCardChars) errors.push('bubble ' + index + ' exceeds per-card text budget');
    if (!textNodes.length || !textNodes.some((node) => node.weight === 'bold')) errors.push('bubble ' + index + ' needs a readable heading');
    if (!hasVisualBlock(bubble)) errors.push('bubble ' + index + ' needs a visual block');
    walk(bubble, (node) => {
      if (node.type === 'box' && Array.isArray(node.contents) && node.contents.length === 0) errors.push('bubble ' + index + ' contains an empty visual tile');
    });
    for (const node of textNodes) {
      const value = String(node.text ?? '').trim();
      if (!value) errors.push('bubble ' + index + ' contains an empty text node');
      if (/^(?:--?|—|n\/a|undefined|null)$/i.test(value)) errors.push('bubble ' + index + ' contains a placeholder');
      if (codepoints(value) > TOKENS.budget.maxTextNodeCodePoints) errors.push('text node exceeds character budget in bubble ' + index);
    }
  }

  if (bubbles.length) {
    const heroTexts = textNodesOf(bubbles[0]);
    if (heroTexts.length > TOKENS.budget.maxHeroTextNodes) errors.push('hero exceeds text-node budget');
    const dynamicHeroText = heroTexts.slice(3).map((node) => String(node.text || '')).join('');
    if (codepoints(dynamicHeroText) > TOKENS.budget.maxHeroChars) errors.push('hero exceeds combined text budget');
  }

  if (factsSnapshot?.severity === 'critical' && bubbles.length) {
    const heroText = textNodesOf(bubbles[0]).map((node) => node.text).join(' ');
    if (!heroText.includes('ทำทันที')) errors.push('critical hero must show immediate action');
    if (!collectUris(bubbles[0]).includes(CTA_URLS.cctv)) errors.push('critical hero must include CCTV CTA');
  }
  if (factsSnapshot?.severity === 'unknown' && bubbles.length) {
    const heroText = textNodesOf(bubbles[0]).map((node) => node.text).join(' ');
    const heroJson = JSON.stringify(bubbles[0]);
    if (!heroText.includes(SEVERITY_TOKENS.unknown.label)) errors.push('unknown hero must disclose uncertainty');
    const normalTokens = ['icon', 'band', 'accent', 'header', 'foreground'].map((key) => SEVERITY_TOKENS.normal[key]);
    if (normalTokens.some((token) => heroJson.includes(token))) errors.push('unknown hero must not use normal visual tokens');
  }
  if (factsSnapshot?.facts?.['flood.freshness.state']?.value === 'stale' && bubbles.length) {
    const heroText = textNodesOf(bubbles[0]).map((node) => node.text).join(' ');
    if (!heroText.includes('ข้อมูลล่าสุด') || !heroText.includes('อาจไม่เป็นปัจจุบัน')) errors.push('stale hero must disclose freshness limitation');
  }
  return [...new Set(errors)];
}

module.exports = { lintFlexMessage, bubblesOf, textNodesOf, collectUris };
