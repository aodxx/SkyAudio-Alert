// src/audio/storage.js
// Stores generated MP3 in the public repository and returns an immutable jsDelivr URL.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function run(cmd, args, opts = {}) { return execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim(); }
function bangkokDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function validatePublicAudioUrl(url) {
  if (!/^https:\/\//i.test(url) || /^(https?:\/\/)?(localhost|127\.0\.0\.1)(?::|\/|$)/i.test(url)) {
    const err = new Error('Audio URL must be a public HTTPS URL');
    err.stage = 'audio.url';
    throw err;
  }
  let headers;
  try {
    headers = run('curl', ['-L', '-sS', '-I', '--max-time', '30', url]);
  } catch (err) {
    const failure = new Error('Public audio URL check failed');
    failure.stage = 'audio.url';
    failure.detail = String(err.stderr || err.message || '').slice(0, 300);
    throw failure;
  }
  const status = [...headers.matchAll(/HTTP\/\S+\s+(\d{3})/g)].pop()?.[1];
  const contentType = headers.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim().toLowerCase() || '';
  if (status !== '200' || !contentType.includes('audio/mpeg')) {
    const err = new Error(`Public audio URL is not playable: HTTP ${status || 'unknown'}, ${contentType || 'missing content-type'}`);
    err.stage = 'audio.url';
    throw err;
  }
  return { status: Number(status), contentType };
}

function storeAudio(buffer, storageConfig, { dryRun = false, repoRoot = process.cwd() } = {}) {
  const dateStr = bangkokDate();
  const relPath = path.join(storageConfig.audioDir, `${dateStr}.mp3`);
  const absPath = path.join(repoRoot, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, buffer);
  if (dryRun) return { committed: false, relPath, localPath: absPath, url: null, skipped: 'dry-run' };

  run('git', ['config', 'user.name', 'skyaudio-bot'], { cwd: repoRoot });
  run('git', ['config', 'user.email', 'skyaudio-bot@users.noreply.github.com'], { cwd: repoRoot });
  run('git', ['add', relPath], { cwd: repoRoot });
  let sha;
  try {
    run('git', ['diff', '--cached', '--quiet'], { cwd: repoRoot });
    sha = run('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
  } catch {
    run('git', ['commit', '-m', `chore(audio): daily forecast audio ${dateStr}`], { cwd: repoRoot });
    run('git', ['push'], { cwd: repoRoot });
    sha = run('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
  }
  const url = `https://cdn.jsdelivr.net/gh/${storageConfig.repoOwner}/${storageConfig.repoName}@${sha}/${relPath}`;
  const remote = validatePublicAudioUrl(url);
  return { committed: true, relPath, sha, url, status: remote.status, contentType: remote.contentType };
}

module.exports = { storeAudio, validatePublicAudioUrl };
