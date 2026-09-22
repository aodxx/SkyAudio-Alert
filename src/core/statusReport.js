// src/core/statusReport.js
// Writes a small, non-secret JSON status file after every run and commits
// it to the repo. This exists so run diagnostics can be read back through
// the GitHub Contents API (or by anyone browsing the repo) even in
// environments where the raw Actions log endpoint isn't reachable
// (it redirects to Azure Blob Storage, which some sandboxed networks block).
//
// Never put secret values in this file — only stage names, statuses, and
// error messages, which are already secret-scrubbed at the source (see
// audio/tts.js and weather/openMeteo.js).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function readLastRunReport({ repoRoot = process.cwd() } = {}) {
  const absPath = path.join(repoRoot, 'public', 'status', 'last-run.json');
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function shouldSkipDuplicateProductionRun(config, { repoRoot = process.cwd() } = {}) {
  if (config.dryRun || config.mode !== 'production') return false;
  const report = readLastRunReport({ repoRoot });
  const bangkokDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  return Boolean(
    report &&
    report.mode === 'production' &&
    report.generatedAt &&
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(report.generatedAt)) === bangkokDate &&
    report.stages &&
    report.stages['line.send'] === 'success'
  );
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim();
}

function writeStatusReport(result, config, { repoRoot = process.cwd() } = {}) {
  const relPath = path.join('public', 'status', 'last-run.json');
  const absPath = path.join(repoRoot, relPath);

  const report = {
    runId: result.runId,
    mode: config.mode,
    dryRun: config.dryRun,
    stages: result.stages,
    lastError: result.lastError || null,
    audio: result.audioInfo || null,
    generatedAt: new Date().toISOString(),
  };

  try {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, JSON.stringify(report, null, 2));

    run('git', ['config', 'user.name', 'skyaudio-bot'], { cwd: repoRoot });
    run('git', ['config', 'user.email', 'skyaudio-bot@users.noreply.github.com'], { cwd: repoRoot });
    run('git', ['add', relPath], { cwd: repoRoot });

    try {
      run('git', ['diff', '--cached', '--quiet'], { cwd: repoRoot });
      // nothing changed, skip commit
    } catch {
      run('git', ['commit', '-m', `chore(status): run report ${report.runId}`], { cwd: repoRoot });
      run('git', ['push'], { cwd: repoRoot });
    }
  } catch (err) {
    // Status reporting must never crash the pipeline itself.
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ stage: 'status.report', status: 'failure', message: err.message }));
  }
}

module.exports = { writeStatusReport, readLastRunReport, shouldSkipDuplicateProductionRun };
