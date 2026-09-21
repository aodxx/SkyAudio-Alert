// src/audio/storage.js
// Zero-cost asset delivery: commit the generated MP3 into this public repo
// and serve it through jsDelivr's GitHub CDN, pinned to the exact commit
// SHA so the URL is immutable and never serves a stale cached file
// (PRD G5 — 0 THB/month; no paid storage/bucket needed).
//
// Requires the workflow to run with `permissions: contents: write` and
// `git` available on the runner (both true for GitHub Actions ubuntu images).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim();
}

/**
 * Writes the audio buffer into public/audio/, commits it, pushes, and
 * returns a stable jsDelivr URL for the exact commit that was just made.
 *
 * In `dryRun` mode, the file is written locally but never committed/pushed,
 * and a placeholder URL is returned — useful for local/manual testing.
 */
function storeAudio(buffer, storageConfig, { dryRun = false, repoRoot = process.cwd() } = {}) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const relPath = path.join(storageConfig.audioDir, `${dateStr}.mp3`);
  const absPath = path.join(repoRoot, relPath);

  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, buffer);

  if (dryRun) {
    return {
      committed: false,
      relPath,
      url: `file://${absPath}`,
    };
  }

  run('git', ['config', 'user.name', 'skyaudio-bot'], { cwd: repoRoot });
  run('git', ['config', 'user.email', 'skyaudio-bot@users.noreply.github.com'], { cwd: repoRoot });
  run('git', ['add', relPath], { cwd: repoRoot });

  // Nothing to commit (e.g. re-run same day, identical audio) — reuse HEAD.
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

  return { committed: true, relPath, sha, url };
}

module.exports = { storeAudio };
