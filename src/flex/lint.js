const { TOKENS, CTA_URLS, CTA_LABELS, CARD_IMAGE_URLS } = require('./tokens');

const CARD_CONTRACTS = Object.freeze([
  { imageUrl: null, ctaId: 'flood-source' },
  { imageUrl: CARD_IMAGE_URLS.floodStatus, ctaId: 'water-map' },
  { imageUrl: CARD_IMAGE_URLS.waterMap, ctaId: 'weather-radar' },
  { imageUrl: CARD_IMAGE_URLS.cctv, ctaId: 'cctv' },
]);

function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((child) => walk(child, visit));
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const key of ['contents', 'body', 'footer', 'header', 'hero']) {
    if (node[key]) walk(node[key], visit);
  }
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
function nodesOfType(node, type) {
  const result = [];
  walk(node, (item) => { if (item.type === type) result.push(item); });
  return result;
}
function shapeOf(node) {
  if (Array.isArray(node)) return node.map(shapeOf);
  if (!node || typeof node !== 'object') return null;
  const shape = { type: node.type };
  if (node.layout) shape.layout = node.layout;
  if (node.size && node.type === 'bubble') shape.size = node.size;
  if (node.type === 'image') shape.url = node.url;
  if (node.action) shape.action = { type: node.action.type, uri: node.action.uri };
  for (const key of ['contents', 'body', 'footer', 'header', 'hero']) {
    if (node[key]) shape[key] = shapeOf(node[key]);
  }
  return shape;
}
function collectUris(node) {
  return nodesOfType(node, 'button').flatMap((item) => item.action?.type === 'uri' ? [item.action.uri] : []);
}
function lintFlexMessage(message, { factsSnapshot } = {}) {
  const errors = [];
  const bubbles = bubblesOf(message);
  if (message?.type !== 'flex') errors.push('message type must be flex');
  if (!message?.altText || !String(message.altText).startsWith('พยากรณ์อากาศพัทลุง')) errors.push('altText must identify the Phatthalung forecast');
  if (codepoints(message?.altText) > TOKENS.budget.maxAltTextCodePoints) errors.push('altText exceeds character budget');
  if (message?.contents?.type !== 'carousel') errors.push('contents must be a carousel');
  if (bubbles.length !== CARD_CONTRACTS.length) errors.push('carousel must contain exactly 4 bubbles');
  if (Buffer.byteLength(JSON.stringify(message || {}), 'utf8') >= TOKENS.budget.maxPayloadBytes) errors.push('Flex payload exceeds byte budget');

  if (bubbles.length) {
    const sizes = new Set(bubbles.map((bubble) => bubble.size));
    if (sizes.size > 1 || bubbles.some((bubble) => bubble.size !== 'kilo')) errors.push('all carousel bubbles must use the same size: kilo');
    const structures = bubbles.map((bubble) => JSON.stringify(shapeOf(bubble)));
    if (new Set(structures).size !== structures.length) errors.push('duplicate card structure detected');
  }

  const allowedImages = new Set(Object.values(CARD_IMAGE_URLS));
  for (const image of nodesOfType(message, 'image')) {
    if (!allowedImages.has(image.url)) errors.push('image URL is not allow-listed: ' + String(image.url));
    if (!image.alt) errors.push('image must have descriptive alt text');
  }
  const allowedCtas = new Set(Object.values(CTA_URLS));
  for (const uri of collectUris(message)) {
    if (!allowedCtas.has(uri)) errors.push('CTA URI is not allow-listed: ' + uri);
  }

  for (const [index, bubble] of bubbles.entries()) {
    const contract = CARD_CONTRACTS[index];
    const images = nodesOfType(bubble.body, 'image');
    const bodyChildren = bubble.body?.contents || [];
    if (index === 0 && images.length) errors.push('card 1 must not contain an image');
    if (index > 0 && images.length !== 1) errors.push(`card ${index + 1} must contain exactly one image`);
    if (contract?.imageUrl && images.length === 1 && images[0].url !== contract.imageUrl) errors.push(`card ${index + 1} image URL/order is invalid`);
    if (index > 0 && bodyChildren.length !== 1) errors.push(`card ${index + 1} body must contain only its image`);
    if (images.length && images[0].aspectRatio !== '4:5') errors.push(`card ${index + 1} image must preserve the 4:5 aspect ratio`);
    if (images.length && images[0].aspectMode !== 'fit') errors.push(`card ${index + 1} image must use fit mode`);

    const buttons = nodesOfType(bubble.footer, 'button');
    if (buttons.length !== 1) errors.push(`card ${index + 1} must contain exactly one footer button`);
    const button = buttons[0];
    if (button && contract) {
      const expectedUrl = CTA_URLS[contract.ctaId];
      const expectedLabel = CTA_LABELS[contract.ctaId];
      if (button.action?.type !== 'uri' || button.action.uri !== expectedUrl || button.action.label !== expectedLabel) {
        errors.push(`card ${index + 1} footer button does not match its approved CTA`);
      }
    }

    const textNodes = textNodesOf(bubble.body);
    const cardChars = textNodes.reduce((sum, node) => sum + codepoints(node.text), 0);
    if (cardChars > TOKENS.budget.maxCardChars) errors.push('bubble ' + index + ' exceeds per-card text budget');
    if (index === 0 && !textNodes.some((node) => String(node.text || '').includes('พยากรณ์อากาศประจำวันนี้'))) {
      errors.push('card 1 needs a readable weather heading');
    }
    if (index > 0 && !images[0]?.alt) errors.push(`card ${index + 1} needs accessible image text`);
    for (const node of textNodes) {
      const value = String(node.text ?? '').trim();
      if (!value) errors.push('bubble ' + index + ' contains an empty text node');
      if (/^(?:--?|—|n\/a|undefined|null)$/i.test(value)) errors.push('bubble ' + index + ' contains a placeholder');
      if (codepoints(value) > TOKENS.budget.maxTextNodeCodePoints) errors.push('text node exceeds character budget in bubble ' + index);
    }
  }
  if (factsSnapshot && !factsSnapshot.facts) errors.push('FactsSnapshot is malformed');
  return [...new Set(errors)];
}

module.exports = { lintFlexMessage, bubblesOf, textNodesOf, collectUris, nodesOfType, shapeOf };
