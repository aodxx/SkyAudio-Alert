// src/core/statusReport.js
// Writes a small, non-secret JSON status file after every run and commits
// it to the repo for non-dry runs. Dry-run previews remain local so previewing
// cannot mutate the branch; workflow artifacts carry those previews for review.
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
    audioWithheld: result.audioWithheld === true,
    audio: result.audioInfo || null,
    generatedAt: new Date().toISOString(),
  };
  if (config.dryRun && result.flexMessage && result.narration) {
    report.preview = {
      flexMessage: result.flexMessage,
      narration: {
        provider: result.narration.provider,
        sections: result.narration.sections,
        spokenText: result.narration.spokenText,
        totalCharacters: result.narration.totalCharacters,
      },
    };
  }

  try {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, JSON.stringify(report, null, 2));

    if (config.dryRun) return report;

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
  return report;
}

module.exports = { writeStatusReport, readLastRunReport, shouldSkipDuplicateProductionRun };
