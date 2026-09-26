# SkyAudio-Alert — Architecture Decision Record

## Decision 001 — No AI Agent in production runtime

**Date:** 2026-09-22

**Decision:** The daily production workflow will not depend on Manus or an autonomous AI Agent.

**Reason:** The job is deterministic: fetch weather, analyze known signals, generate a standard report, synthesize speech, and send LINE messages. Removing the agent reduces cost, moving parts, and operational uncertainty.

## Decision 002 — Deterministic Thai forecast generation

**Date:** 2026-09-22

**Decision:** V1 uses templates and rule-based analysis for the Thai forecast.

**Reason:** Daily weather announcements need predictable wording and should not incur an LLM cost.

An LLM can be added later as an optional layer without becoming a single point of failure.

## Decision 003 — Open-Meteo as initial weather provider

**Date:** 2026-09-22

**Decision:** Use Open-Meteo for V1.

**Reason:** It provides the hourly/current forecast variables needed for the first version and has a simple HTTP API.

A provider adapter will make it possible to add another source later.

## Decision 004 — LINE Flex + separate Audio Message

**Date:** 2026-09-22

**Decision:** Send a Flex Message followed by a LINE Audio Message.

**Reason:** The Flex Message provides visual information while the Audio Message makes the announcement accessible to older residents. Audio is not embedded inside the Flex bubble.

## Decision 005 — GitHub Actions for initial scheduling

**Date:** 2026-09-22

**Decision:** Use GitHub Actions as the initial scheduler/runner.

**Reason:** It can provide scheduled and manual execution without operating a dedicated server.

The workflow must include retry/error handling because scheduled execution is not a hard real-time guarantee.

## Decision 006 — Secrets outside source code

**Date:** 2026-09-22

**Decision:** LINE tokens and TTS credentials are stored as GitHub Actions Secrets.

**Reason:** The repository is public and credentials must never be committed.

Any credential pasted into chat should be treated as exposed and replaced before production use.

## Decision 007 — V1 has no database

**Date:** 2026-09-22

**Decision:** Do not introduce a database until the product requires persistent history, deduplication, analytics, or multiple destinations.

**Reason:** Avoid unnecessary complexity and recurring cost.

## Decision 008 — Primary location is fixed in V1

**Date:** 2026-09-22

**Decision:** V1 is configured for บ้านลำพาย at 7.619729, 100.005932.

**Reason:** The first goal is a stable community service. Multi-location support will be designed as an extension rather than complicating the first release.

## Decision 009 — Reserved announcement board is a placeholder, not decorative

**Date:** 2026-09-22

**Decision:** The chalkboard-style panel next to the temperature in the Flex header (`announcementBoard()` in `src/flex/components.js`, wired through `heroTempBlock(current, announcement)`) is a **reserved slot for a future village-announcement feature**, not a design element free to repurpose.

**Reason:** อ๊อด plans a companion PWA in this same repo (possibly adding a database) that lets residents/village admins post announcements — event notices, PR messages, and similar — to be displayed here. Until that data source exists, `forecastData.announcement` is always empty/undefined, so the board renders every day with just its frame and chalk tray, no text. That empty appearance is intentional, not a bug to "fix" by hiding or removing the board.

**Constraints for anyone (human or AI) editing this area:**
- Don't remove the board or repurpose its space for other content (e.g. the market-price card, extra weather stats) without first updating this decision.
- Don't make it conditionally disappear when there is no announcement — it must render at a constant size every day so the card's layout/height doesn't jump.
- Don't turn it into a second Flex message or otherwise grow the bubble to accommodate it — it must stay inside the existing header, by design, so the group doesn't feel the bot is taking over more chat space.
- When the PWA/data source ships, wire it by populating `forecastData.announcement` (a plain string) upstream in the pipeline/formatter — `components.js`/`builder.js` should not need further changes for the basic case.


## Decision 010 — Phase 1 audio carries market and local-news content

**Date:** 2026-09-26

**Decision:** The morning audio report carries the useful daily information set: weather, palm-oil price, rubber price, and a small number of local public-relations headlines. The Flex remains focused on compact weather presentation until Phase 2 redesign.

**Reason:** Audio is the accessibility channel for residents who cannot comfortably read the Flex. Moving the longer information set into audio keeps the visual message compact while making the full morning briefing available by pressing Play.

**Source policy:** Palm/rubber prices use the provincial agriculture/cooperatives source already established by the market adapter. Local news uses the Phatthalung Provincial Public Relations Office. If a source cannot be parsed safely, that section is omitted rather than guessed.
