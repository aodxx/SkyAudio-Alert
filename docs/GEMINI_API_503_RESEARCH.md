# Gemini API 503: Findings and Retry Fix

## Incident

The LINE Test workflow reached the content-generation stage after the configured Gemini model passed the workflow preflight. Gemini then returned HTTP `503 UNAVAILABLE` with the message that the model was experiencing high demand. The workflow retried twice and failed before speech synthesis or LINE delivery, so no LINE message was sent. A second run after a short pause received the same response.[^1]

This is a transient service-capacity failure, not evidence that the model ID is malformed. The earlier `400` model-name error was resolved when the model configuration was updated; the current failure is a separate backend-availability issue.

## Google guidance

Google's Gemini API troubleshooting guide recommends bounded exponential backoff for retryable errors, including `408`, `429`, and `5xx`; it also recommends adding jitter and not retrying permanent client errors such as `400` or `403`. The guide notes that the official Gemini API SDKs retry transient errors up to four times by default, starting at approximately one second, with a maximum delay of 60 seconds.[^2]

## Repository gaps before this fix

| Area | Current behavior | Required adjustment |
| --- | --- | --- |
| Retry count | Shared wrapper allows two retries by default | Use a Gemini-specific bounded retry profile aligned with Google's SDK guidance |
| Initial delay | 500 ms by default | Start Gemini retries at approximately 1 second |
| Jitter | None | Add bounded random jitter to reduce synchronized retries |
| Retryable statuses | Gemini adapter marks `429` and `5xx` retryable | Also retry `408`; keep `400`/`403` non-retryable |
| Network failures | Raw `fetch` errors are not marked retryable | Classify transient network failures as retryable |
| Observability | Retry event records attempt and message | Record the selected delay as well |

Relevant implementation locations are `src/core/retry.js`, `src/core/pipeline.js`, and `src/content/geminiReport.js`.

## Implemented remediation

This branch adds a dedicated Gemini retry profile rather than increasing retries for every external dependency: four retries, exponential delays starting at 1 second, a 60-second delay ceiling, and bounded jitter. It applies to Gemini content and Gemini TTS requests only. The retry log now records the selected delay, and the content adapter classifies `408` and fetch/network errors as retryable while preserving `400`/`403` as non-retryable. Deterministic tests cover the retry schedule, jitter, and error classification.

A retry can improve the chance of success during a short capacity spike, but it cannot guarantee availability if the selected model remains overloaded. If bounded retries still return `503`, wait longer or choose another model that the same API key can access; do not loop indefinitely.

## Sources

[^1]: GitHub Actions, [LINE Test run 37149350614](https://github.com/aodxx/SkyAudio-Alert/actions/runs/37149350614) and [retry run 37149468344](https://github.com/aodxx/SkyAudio-Alert/actions/runs/37149468344).
[^2]: Google AI for Developers, [Gemini API troubleshooting guide — Retry strategy](https://ai.google.dev/gemini-api/docs/troubleshooting).
