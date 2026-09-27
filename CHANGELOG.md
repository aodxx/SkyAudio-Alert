## Unreleased — Header fix from live LINE screenshot (signboard cropped out, scrim seam)
- อ๊อด sent the actual rendered message from the LINE group: the header's `aspectRatio:'2.2:1'` + `gravity:'center'` combo let the client crop off the top of the photo — the roofline and most of the real signboard were gone, leaving mostly foliage/pillars — and the two separate overlay boxes (brand wash + bottom scrim) met at a hard visible seam instead of a smooth fade.
- `headerBlock()`: photo now uses an explicit `height:'200px'` on the wrapping box (deterministic crop regardless of bubble width, same technique already used for the rain-probability bar) with `gravity:'top'`, so any needed crop takes from the bottom (pillars/entrance) rather than the top (the sign). Replaced the two-box wash+scrim with one gradient box spanning the full photo height — no more seam.
- Dropped the second caption row ("ศาลาเอนกประสงค์ประจำหมู่บ้าน" / "หมู่ 4 • โคกชะงาย"): it duplicated both the real signboard (now actually visible) and the name/district lines already shown, and was the "too dense" clutter อ๊อด flagged. Header now shows just the photo + name + district/province.
- Re-cropped `assets/flex/village-hall-cutout.jpg` from the full safe (non-transparent) rectangle of the original photo — wider (3.2:1 source) so gravity:'top' cropping has more headroom before touching the sign.
- Regenerated `docs/examples/sample-flex-rainy-evening.json`; updated AT-09 to check `gravity`, explicit `height`, and a single full-height wash instead of the dropped caption text. All 24 tests pass.

## Unreleased — Header photo fix + full-bleed redesign
- Fixed a broken image reference: `assets/flex/village-hall-cutout.png` was referenced by `src/flex/components.js` but was never actually committed to the repo (an earlier session base64-staged a 120×77 placeholder into `README.md` for a CI check, then removed it) — the header image has been rendering broken/missing since. Committed the real photo at `assets/flex/village-hall-cutout.jpg` (cropped from อ๊อด's photo of the actual pavilion, transparent corners removed, 2.2:1) and updated the URL/extension.
- Redesigned `headerBlock()`: the photo is now the header's actual full-bleed background (`size:'full'`, edge-to-edge) instead of a small side-by-side thumbnail, with the existing sky-blue brand wash + a bottom scrim overlaid on top (`position:'absolute'`) so location name, district/province, and the ศาลาเอนกประสงค์ caption stay legible. No other components or the bubble's `mega` size changed.
- Regenerated `docs/examples/sample-flex-rainy-evening.json`.
- Added AT-09 regression test: asserts the header contains a `size:'full'`/`aspectMode:'cover'` image at the correct HTTPS URL and exactly two absolute overlays (tint + scrim) carrying the location text.

## Unreleased — Phase 1 audio expansion
- Moved palm-oil and rubber prices into the spoken morning report; dates are spoken so stale data is not presented as today.
- Added an official Phatthalung local-news adapter and included up to two short attributable headlines in the audio.
- Tuned the Thai script for a 2–3 minute village loudspeaker format with Gemini TTS as the production voice.
- Added parser and spoken-content regression tests; Node CI is green after the phase1 changes.

# Changelog

## Unreleased — Production hardening
- Added a same-day production duplicate guard using the persisted run status. A successful production delivery prevents accidental second announcements on the same Asia/Bangkok date; failed/incomplete runs remain retryable.
- Recorded completion of the human LINE playback acceptance check: the Flex + Thai Audio message was received and the audio played successfully in LINE.

## Unreleased — End-to-end hardening
- Fixed Edge TTS negative-rate invocation by attaching `--rate=-5%` to the option value; the previous invocation failed in the real GitHub Actions log.
- MP3 validation now checks MPEG frame headers and reads a positive duration instead of accepting any non-empty buffer.
- Audio synthesis, validation, storage, and public URL failures now fail the job; they are no longer swallowed and reported as a successful Flex-only run.
- Dry runs no longer expose `file://` as an audio URL and log that LINE delivery was skipped.
- Production audio URLs are checked for public HTTPS, HTTP 200, and `audio/mpeg` before LINE delivery.
- Added regression tests for Edge TTS rate formatting, MP3 rejection, and LINE audio duration payload.
- Verified non-dry-run GitHub Actions run `35675538268`: Edge TTS, MP3 validation, audio commit, public jsDelivr URL, and LINE push of two messages all succeeded. Direct LINE receipt/playback still requires human observation in the Test Group.

## 0.2.0 — Phase 2–6 implementation
- Implemented deterministic weather engine (`src/weather`): Open-Meteo adapter, normalization, WMO code mapping, rule-based analyzer (temperature categories, rain windows, advice signals, theme resolution).
- Implemented forecast layer (`src/forecast`): Thai advice sentences, dynamic Thai TTS script, hourly-slot formatter.
- Implemented Flex layer (`src/flex`): theme palette with day/night modifier, reusable components, full bubble builder matching the reference screenshot layout (header, hero temperature, quick indicators, hourly row, daily summary, advice box, footer).
- Implemented audio layer (`src/audio`): Google Cloud TTS adapter, size/duration validation (duration is a heuristic estimate — see `validate.js` for the documented limitation), zero-cost storage via committing to this repo and serving through jsDelivr pinned to the commit SHA.
- Implemented LINE layer (`src/line`): push adapter for Flex + Audio messages.
- Implemented orchestration (`src/core`): pipeline with per-stage structured logging, retry with backoff for transient errors, entry point supporting `RUN_MODE` and `DRY_RUN`.
- Added GitHub Actions workflows: daily 06:00 Asia/Bangkok schedule, manual test workflow with a dry-run toggle.
- Added fixtures (`sunny`, `rainy-evening` — matching the reference screenshot's weather) and a zero-dependency test suite using Node's built-in test runner (`node --test`).
- Known limitation to revisit: audio duration is estimated from script length rather than parsed from the MP3 file. Acceptable for V1; flagged for Phase 7 hardening.

## 0.1.0 — Phase 1 (prior session)
- PRD, architecture decisions, API contract, repository structure.
