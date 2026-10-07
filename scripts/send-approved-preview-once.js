#!/usr/bin/env node
'use strict';

// One-time production delivery for the exact preview approved on 2026-10-07.
// This intentionally does not change RUN_MODE or the production hard-lock.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { lintFlexMessage } = require('../src/flex/lint');
const { pushMessages, buildAudioMessage } = require('../src/line/messagingApi');

const APPROVED = Object.freeze({
  artifactRunId: '37621337709',
  artifactName: 'line-test-preview-37621337709-1',
  runId: '2026-10-07-lampai-test',
  generatedAt: '2026-10-07T12:40:19.869Z',
  statusSha256: 'a296cf5819124b89436f60dd0a3083359fadeea0ab728eb77297472bd8673069',
  audioSha256: 'f9783d4834fd402342d47d9fc0cdbe9a8d161d2b7d4ab4737dc873a10b3a894b',
  audioBytes: 1849005,
  durationMs: 115536,
  audioRelativePath: 'public/audio/approved-preview-37621337709.mp3',
  markerRelativePath: 'public/status/production-one-time-2026-10-07.json',
  altText: 'พยากรณ์อากาศพัทลุง · 7 ตุลาคม 2569',
});

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function walkFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walkFiles(fullPath));
    else if (entry.isFile()) result.push(fullPath);
  }
  return result;
}

function findUnique(root, suffix) {
  const matches = walkFiles(root).filter((file) => file.split(path.sep).join('/').endsWith(suffix));
  if (matches.length !== 1) throw new Error(`Expected exactly one approved artifact file ending in ${suffix}; found ${matches.length}`);
  return matches[0];
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

function gitCommitAndPush(message, files) {
  execFileSync('git', ['config', 'user.name', 'github-actions[bot]'], { stdio: 'inherit' });
  execFileSync('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], { stdio: 'inherit' });
  execFileSync('git', ['add', '--', ...files], { stdio: 'inherit' });
  execFileSync('git', ['commit', '-m', message], { stdio: 'inherit' });
  // A failed push is fail-closed: no LINE request is made until the public commit exists.
  execFileSync('git', ['push', 'origin', 'HEAD:main'], { stdio: 'inherit' });
  return git(['rev-parse', 'HEAD']);
}

async function verifyArtifact(artifactRoot) {
  const statusFile = findUnique(artifactRoot, '/status/last-run.json');
  const audioFile = findUnique(artifactRoot, '/audio/2026-10-07.mp3');
  const statusBytes = await fsp.readFile(statusFile);
  const audioBytes = await fsp.readFile(audioFile);
  if (sha256(statusBytes) !== APPROVED.statusSha256) throw new Error('Approved status artifact hash mismatch; refusing to send');
  if (sha256(audioBytes) !== APPROVED.audioSha256) throw new Error('Approved MP3 hash mismatch; refusing to send');
  if (audioBytes.length !== APPROVED.audioBytes) throw new Error('Approved MP3 byte length mismatch; refusing to send');

  const status = JSON.parse(statusBytes.toString('utf8'));
  if (status.runId !== APPROVED.runId || status.mode !== 'test' || status.dryRun !== true) throw new Error('Artifact run identity mismatch; refusing to send');
  if (status.generatedAt !== APPROVED.generatedAt || status.lastError !== null) throw new Error('Artifact timestamp/error state mismatch; refusing to send');
  if (status.stages?.['flood.gate'] !== 'success' || status.stages?.['flex.lint'] !== 'success' || status.stages?.['content.safety'] !== 'success' || status.stages?.['audio.validate'] !== 'success' || status.stages?.['line.send'] !== 'skipped') throw new Error('Required preview gates are not all in the approved state');
  if (status.audioWithheld !== false || status.audio?.url !== null || status.audio?.durationMs !== APPROVED.durationMs || status.audio?.bytes !== APPROVED.audioBytes || status.audio?.mimeType !== 'audio/mpeg') throw new Error('Audio metadata does not match the approved preview');

  const flexMessage = status.preview?.flexMessage;
  if (flexMessage?.type !== 'flex' || flexMessage.altText !== APPROVED.altText || flexMessage.contents?.type !== 'carousel' || flexMessage.contents.contents?.length !== 4) throw new Error('Flex payload identity mismatch; refusing to send');
  const lintErrors = lintFlexMessage(flexMessage);
  if (lintErrors.length) throw new Error(`Flex lint failed: ${lintErrors.join('; ')}`);

  const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioFile], { encoding: 'utf8' }).trim();
  const probedDurationMs = Math.round(Number(probe) * 1000);
  if (!Number.isFinite(probedDurationMs) || Math.abs(probedDurationMs - APPROVED.durationMs) > 100) throw new Error(`MP3 duration mismatch: ${probe}s`);
  return { status, flexMessage, audioFile, audioSha256: sha256(audioBytes) };
}

async function waitForPublicAudio(url, expectedBytes) {
  let lastError;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (response.ok && contentType.includes('audio/mpeg') && (!contentLength || contentLength === expectedBytes)) return;
      lastError = new Error(`CDN check returned HTTP ${response.status}, content-type=${contentType || 'missing'}, content-length=${contentLength || 'missing'}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Public audio URL did not become verifiable: ${lastError?.message || 'unknown error'}`);
}

async function main() {
  const artifactRoot = path.resolve(process.env.APPROVED_ARTIFACT_DIR || 'approved-artifact');
  const verified = await verifyArtifact(artifactRoot);
  const repoRoot = process.cwd();
  const audioDest = path.join(repoRoot, APPROVED.audioRelativePath);
  const markerPath = path.join(repoRoot, APPROVED.markerRelativePath);

  if (process.argv.includes('--preflight')) {
    console.log(`PREVIEW VERIFIED run=${APPROVED.runId} artifact=${APPROVED.artifactRunId} flex=4-cards audio=${APPROVED.durationMs}ms sha256=${verified.audioSha256}`);
    return;
  }

  if (process.env.SEND_ONCE_CONFIRM !== 'SEND_APPROVED_PREVIEW') throw new Error('Missing exact workflow confirmation; refusing to send');
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN_PROD;
  const groupId = process.env.LINE_GROUP_ID_PROD;
  if (!channelAccessToken || !groupId) throw new Error('Required production LINE secrets are unavailable; no public file or message was sent');
  if (fs.existsSync(markerPath)) throw new Error('One-time delivery marker already exists; refusing any repeat send');
  if (fs.existsSync(audioDest)) throw new Error('Approved public audio destination already exists; refusing to overwrite or duplicate');

  await fsp.mkdir(path.dirname(audioDest), { recursive: true });
  await fsp.mkdir(path.dirname(markerPath), { recursive: true });
  await fsp.copyFile(verified.audioFile, audioDest);
  const marker = {
    state: 'sending',
    approvedRunId: APPROVED.runId,
    artifactRunId: APPROVED.artifactRunId,
    artifactName: APPROVED.artifactName,
    statusSha256: APPROVED.statusSha256,
    audioSha256: APPROVED.audioSha256,
    flexAltText: APPROVED.altText,
    durationMs: APPROVED.durationMs,
    createdAt: new Date().toISOString(),
  };
  await fsp.writeFile(markerPath, `${JSON.stringify(marker, null, 2)}\n`, { flag: 'wx' });

  const publishCommit = gitCommitAndPush('Publish user-approved one-time LINE audio preview', [APPROVED.audioRelativePath, APPROVED.markerRelativePath]);
  const audioUrl = `https://cdn.jsdelivr.net/gh/aodxx/SkyAudio-Alert@${publishCommit}/${APPROVED.audioRelativePath}`;
  await waitForPublicAudio(audioUrl, APPROVED.audioBytes);

  const messages = [verified.flexMessage, buildAudioMessage(audioUrl, APPROVED.durationMs)];
  const response = await pushMessages(messages, { channelAccessToken, groupId }, {
    fetchImpl: (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }),
  });
  marker.state = 'sent';
  marker.sentAt = new Date().toISOString();
  marker.audioUrl = audioUrl;
  marker.lineHttpStatus = response.status;
  await fsp.writeFile(markerPath, `${JSON.stringify(marker, null, 2)}\n`);
  gitCommitAndPush('Record one-time LINE production delivery result', [APPROVED.markerRelativePath]);
  console.log(`LINE_PROD_ACCEPTED http=${response.status} messages=${messages.length} artifactRun=${APPROVED.artifactRunId} audioCommit=${publishCommit}`);
}

main().catch((error) => {
  console.error(`ONE_TIME_SEND_FAILED: ${error.message}`);
  process.exitCode = 1;
});
