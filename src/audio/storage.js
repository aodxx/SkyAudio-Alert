// src/audio/storage.js
// Stores generated MP3 in the public repository and returns an immutable jsDelivr URL.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function run(cmd, args, opts = {}) { return execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim(); }
function bangkokDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function storeAudio(buffer, storageConfig, { dryRun = false, repoRoot = process.cwd() } = {}) {
  const dateStr = bangkokDate();
  const relPath = path.join(storageConfig.audioDir, `${dateStr}.mp3`);
  const absPath = path.join(repoRoot, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, buffer);
  if (dryRun) return { committed: false, relPath, url: `file://${absPath}` };

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
  return { committed: true, relPath, sha, url: `https://cdn.jsdelivr.net/gh/${storageConfig.repoOwner}/${storageConfig.repoName}@${sha}/${relPath}` };
}

module.exports = { storeAudio };