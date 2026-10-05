# LINE Test Dry-Run Preview Artifact Implementation Plan

> **For agentic workers:** Execute inline in this session; the user requested a dry-run preview before any LINE send. Use failing tests before behavior changes.

**Goal:** Generate an inspectable Flex/audio preview from the current feature branch without sending to LINE or mutating the Git branch.

**Architecture:** On `DRY_RUN=true`, `writeStatusReport` writes the actual Flex payload, narration, and audio metadata to a local-only preview field and returns without Git operations. The manual test workflow uploads that JSON and the date-stamped MP3 as a short-lived GitHub Actions artifact; the artifact is uploaded even if audio validation degrades, and the workflow never calls LINE in dry-run mode.

**Tech Stack:** Node.js built-in test runner, GitHub Actions, `actions/upload-artifact@v4`, existing Gemini/TTS and FFmpeg validation.

**Spec:** User selected “เตรียมส่งไปยัง LINE TEST หลังสร้าง preview แล้วให้ฉันยืนยัน payload อีกครั้ง”; current `weather-test.yml` defines `dry_run=true` as the default.

## Global Constraints

- Do not call LINE APIs or send messages during preview.
- Do not commit or push `public/status/last-run.json` or generated MP3 during dry-run.
- Include only the Flex message, narration text/sections, and audio status in the preview; never include credentials.
- Upload only the current Bangkok-date MP3; retain the artifact for at most 7 days.
- Keep production status NO-GO and do not merge PR #35 as part of preview preparation.

---

### Task 1: Make dry-run output inspectable and non-mutating

**Files:** Modify `src/core/statusReport.js` and `.github/workflows/weather-test.yml`; create `tests/statusReport.test.js`.

**Interface:** For a dry-run result with `flexMessage` and `narration`, `public/status/last-run.json` contains `preview: { flexMessage, narration: { provider, sections, spokenText, totalCharacters } }`, while the status writer leaves the Git HEAD unchanged. The workflow uploads that report and `public/audio/<Bangkok-date>.mp3` only when `inputs.dry_run` is true.

- [x] Write a failing test using a temporary Git repository; assert dry-run preserves HEAD, leaves the report uncommitted, and serializes the exact Flex and narration preview.
- [x] Run `node --test tests/statusReport.test.js` and confirm it fails because the current status writer commits/pushes during dry-run and omits payload content.
- [x] Add preview fields only for dry-run reports and return before Git config/add/commit/push when `config.dryRun` is true.
- [x] Add an always-run artifact upload step gated by `inputs.dry_run`; upload `public/status/last-run.json` plus only the Bangkok-date MP3, with seven-day retention.
- [ ] Run focused tests, full `npm test`, syntax checks, and `git diff --check`; confirm the workflow artifact path and dry-run gate.
- [ ] Push the update to PR #35, wait for both CI workflows, dispatch `Manual Flood-first test` on the feature branch with `dry_run=true`, then download and validate the preview artifact. Confirm no LINE request and no branch commit/push occurred.
