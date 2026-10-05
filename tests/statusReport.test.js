const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { readLastRunReport, writeStatusReport } = require('../src/core/statusReport');

function git(repoRoot, ...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

test('dry-run writes the exact Flex and narration preview without committing or pushing', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skyaudio-preview-'));
  try {
    git(repoRoot, 'init', '--quiet');
    git(repoRoot, 'config', 'user.name', 'preview-test');
    git(repoRoot, 'config', 'user.email', 'preview-test@example.invalid');
    fs.writeFileSync(path.join(repoRoot, 'README.md'), 'seed\n');
    git(repoRoot, 'add', 'README.md');
    git(repoRoot, 'commit', '--quiet', '-m', 'seed');
    const beforeHead = git(repoRoot, 'rev-parse', 'HEAD');
    const flexMessage = {
      type: 'flex',
      altText: 'รายงานทดสอบ',
      contents: { type: 'carousel', contents: [{ type: 'bubble', body: { type: 'box' } }] },
    };
    const narration = {
      provider: 'gemini',
      sections: [{ id: 'opening', title: 'เปิดรายงาน', text: 'สวัสดีครับ', factsUsed: ['flood.severity'] }],
      spokenText: 'สวัสดีครับ',
      totalCharacters: 10,
    };

    writeStatusReport({
      runId: 'preview-test',
      stages: { 'flex.render': 'success', 'line.send': 'skipped' },
      flexMessage,
      narration,
      audioInfo: { url: null, durationMs: 240000, bytes: 1024, mimeType: 'audio/mpeg', sections: 1 },
      audioWithheld: false,
    }, { mode: 'test', dryRun: true }, { repoRoot });

    const report = readLastRunReport({ repoRoot });
    const afterHead = git(repoRoot, 'rev-parse', 'HEAD');
    const worktree = git(repoRoot, 'status', '--porcelain');
    assert.equal(afterHead, beforeHead);
    assert.match(worktree, /public\//);
    assert.ok(fs.existsSync(path.join(repoRoot, 'public', 'status', 'last-run.json')));
    assert.deepEqual(report.preview, {
      flexMessage,
      narration: {
        provider: 'gemini',
        sections: narration.sections,
        spokenText: narration.spokenText,
        totalCharacters: narration.totalCharacters,
      },
    });
    assert.equal(report.audio.durationMs, 240000);
    assert.equal(report.dryRun, true);
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});
