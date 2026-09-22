# SkyAudio-Alert — Current Context

## Verified in this work session

The latest GitHub Actions run was successful only because the previous pipeline swallowed an Edge TTS failure and sent a Flex-only dry-run result. The real log showed Edge TTS argument parsing failed when `-5%` was passed as a separate argument. The pipeline therefore did not satisfy the master task acceptance criteria.

The implementation now attaches negative rate values to the CLI option, validates MPEG frame headers and a positive MP3 duration, fails closed on required audio errors, avoids `file://` URLs in dry-run mode, and checks the production jsDelivr URL for HTTPS, HTTP 200, and `audio/mpeg` before LINE delivery.

## Test status

- `npm test`: passing, including regression tests for the Edge rate, MP3 rejection, and LINE milliseconds payload.
- A real Thai Edge TTS command was run in the sandbox and produced a 26,640-byte MP3 that passed MP3 validation.
- GitHub Actions run `35675538268` with `dry_run=false` completed successfully on 2026-09-22. Secrets were accepted by the workflow, audio was committed at `8e55b5d`, the public URL returned HTTP 200 with `audio/mpeg`, and LINE push returned success with two messages (Flex + Audio).
- The public MP3 was downloaded and verified as MPEG ADTS Layer III, 221,184 bytes, and 36.864 seconds by `ffprobe`.

## Acceptance proof

The end-to-end acceptance proof is now complete: the production-style non-dry-run pipeline has successfully generated Thai Edge TTS, validated the MP3, published a public playable audio URL, pushed both Flex + Audio through LINE, and the human recipient confirmed the Audio message arrived and played audibly in LINE. The LINE API cannot report playback state programmatically, so that final playback proof remains human-observed.

## Current hardening decision

Production runs now have a same-day duplicate guard based on `public/status/last-run.json`: a production run is skipped only when the previous successful production report is from the same Asia/Bangkok calendar day. Failed/incomplete runs remain eligible for retry. Test and dry-run modes are unaffected.

## Future community platform vision (recorded 2026-09-22)

SkyAudio-Alert is intentionally being developed as the first, small entry point to a future community communication platform. The daily LINE weather message is the familiar doorway: residents already receive it in the shared group, so future community information can be introduced without repeatedly creating separate message cards that consume group space.

The future concept includes a green community board and a PWA for village leaders, assistants, and health volunteers. Possible future capabilities include appointment/reminder publishing, community and government announcements, photographing official documents and OCR-ing them into text and Thai speech for LINE, and health-related forms created by health volunteers for residents to complete. The accessibility goal is especially important for older residents or people who have difficulty reading: LINE and audio remain the familiar delivery channel, while the PWA is primarily an operational tool for community workers.

This vision is deliberately **not** a request to build the full PWA now. For the current phase, preserve clean integration points in the Morning Message structure (weather, market, future community content, audio), then return focus to making the existing weather/market announcement reliable and useful in the real 7-day trial. The timing of the larger platform should be decided from actual trial experience rather than prematurely expanding the production scope.

The user may explain this vision in a circular or repetitive way while thinking aloud. Treat the underlying intent as one coherent product direction; do not require the user to restate it or interpret repetition as new requirements unless they explicitly introduce a new requirement.
