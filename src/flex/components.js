const { TOKENS, CTA_URLS, CTA_LABELS } = require('./tokens');

function textNode(value, options = {}) {
  return {
    type: 'text',
    text: String(value ?? ''),
    size: options.size || 'sm',
    ...(options.weight ? { weight: options.weight } : {}),
    color: options.color || TOKENS.text.primary,
    wrap: options.wrap !== false,
    ...(options.align ? { align: options.align } : {}),
    ...(options.margin ? { margin: options.margin } : {}),
    ...(options.flex !== undefined ? { flex: options.flex } : {}),
  };
}

function ctaFooter(items = []) {
  const buttons = items
    .filter((item) => item && Object.hasOwn(CTA_URLS, item.id))
    .map((item) => ({
      type: 'button',
      style: 'primary',
      color: '#1769AA',
      height: 'sm',
      action: { type: 'uri', label: CTA_LABELS[item.id], uri: CTA_URLS[item.id] },
    }));
  return { type: 'box', layout: 'vertical', spacing: 'sm', margin: 'md', contents: buttons };
}

module.exports = { textNode, ctaFooter };
