// src/line/messagingApi.js
// LINE Messaging API adapter — push only. Contains no business logic.

const PUSH_URL = 'https://api.line.me/v2/bot/message/push';

async function pushMessages(messages, lineConfig, opts = {}) {
  const doFetch = opts.fetchImpl || fetch;

  const res = await doFetch(PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lineConfig.channelAccessToken}`,
    },
    body: JSON.stringify({ to: lineConfig.groupId, messages }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`LINE push failed: ${res.status}`);
    err.stage = 'line.send';
    err.retryable = res.status >= 500 || res.status === 429;
    err.detail = text.slice(0, 300);
    throw err;
  }

  return { status: res.status };
}

function buildAudioMessage(url, durationMs) {
  return { type: 'audio', originalContentUrl: url, duration: durationMs };
}

module.exports = { pushMessages, buildAudioMessage, PUSH_URL };
