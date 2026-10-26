#!/usr/bin/env node
'use strict';

// One-off Chak Phra video sender. Intentionally separate from the daily weather workflow.
// Sends up to two LINE video messages to the configured production group.

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function httpsUrl(name) {
  const value = required(name);
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`${name} must be a valid URL`); }
  if (parsed.protocol !== 'https:') throw new Error(`${name} must use HTTPS`);
  return value;
}

async function main() {
  const token = required('LINE_CHANNEL_ACCESS_TOKEN_PROD');
  const groupId = required('LINE_GROUP_ID_PROD');
  const videos = [];

  for (let i = 1; i <= 2; i += 1) {
    const rawVideo = process.env[`VIDEO_URL_${i}`]?.trim();
    const rawPreview = process.env[`PREVIEW_IMAGE_URL_${i}`]?.trim();
    if (!rawVideo && !rawPreview) continue;
    if (!rawVideo || !rawPreview) {
      throw new Error(`Video ${i}: both VIDEO_URL_${i} and PREVIEW_IMAGE_URL_${i} are required`);
    }
    const videoUrl = httpsUrl(`VIDEO_URL_${i}`);
    const previewImageUrl = httpsUrl(`PREVIEW_IMAGE_URL_${i}`);
    videos.push({
      type: 'video',
      originalContentUrl: videoUrl,
      previewImageUrl,
    });
  }

  if (videos.length === 0) {
    throw new Error('No videos supplied. Provide at least VIDEO_URL_1 and PREVIEW_IMAGE_URL_1.');
  }

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: groupId, messages: videos }),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 500);
    throw new Error(`LINE API rejected the send (HTTP ${response.status}): ${detail}`);
  }

  console.log(`LINE accepted ${videos.length} Chak Phra video message(s) for the configured production group.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
