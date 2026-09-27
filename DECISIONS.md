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

## Decision 011 — Header photo is full-bleed and must stay a committed repo file

**Date:** 2026-09-26

**Decision:** `headerBlock()`'s village-hall photo (`assets/flex/village-hall-cutout.jpg`) is the header's full-bleed background (`size:'full'`, `aspectMode:'cover'`), overlaid with the sky-blue brand wash and a bottom text scrim, rather than a small side-by-side thumbnail.

**Reason:** The Phase 4 side-by-side layout (photo at `flex:6` beside the text) rendered small and, per a resident/product ask, didn't read as "the village hall is the header" — a full-bleed photo does. The scrim keeps the existing text (name, district/province, ศาลาเอนกประสงค์ caption) legible over the photo without changing what information is shown.

**Also recorded here:** the previous `village-hall-cutout.png` URL was broken — no file at that path was ever actually committed (an earlier session base64-staged a 120×77 placeholder into `README.md` to satisfy a CI check, then removed it in the very next commit, per commits `c896c00`/`54258fb`). Anyone touching this image must commit the real binary under `assets/flex/`, not stage it as a temporary text-file payload — `git log --all -- <path>` should show the file's real history, and `git ls-tree origin/main -- assets/flex` should list it before relying on the URL in a test or a production run.

**Note — unrelated but observed while investigating:** Decision 009 describes an always-present `announcementBoard()` reserved slot wired through `heroTempBlock(current, announcement)`. That function/board is not present in the current `src/flex/components.js` (`heroTempBlock(current)` takes one argument) — it appears to have been dropped during a later compact-redesign phase without updating Decision 009. Not touched by this change; flagging so it isn't mistaken for intentional.

## Decision 012 — Fixed pixel height + top gravity for the header photo; dropped the duplicate caption line

**Date:** 2026-09-27

**Decision:** `headerBlock()`'s photo box uses an explicit `height:'200px'` (not `aspectRatio` on the Image) with `gravity:'top'`, and the overlay is a single full-height gradient box instead of two stacked boxes. The second caption row (ศาลาเอนกประสงค์.../หมู่ 4...) was removed.

**Reason:** อ๊อด sent a screenshot of the message as actually delivered to the LINE group. `aspectRatio:'2.2:1'` + `gravity:'center'` had let the client crop the image in a way that cut off the roofline and most of the real signboard — the single most identifying part of the photo — while showing mostly foliage and pillars instead. `gravity:'top'` guarantees that if the client crops for any reason, it takes from the bottom (pillars/entrance — expendable) rather than the top (the sign — the point of the photo). The explicit height reuses the same technique `rainProbabilityBox()` already uses for its bar, so it isn't a new/unproven pattern for this codebase's target client. The two-box wash+scrim also produced a visible hard seam between the photo and the text; one box with one gradient spanning the full photo height reads as a single smooth fade instead. The duplicate caption line was dropped per อ๊อด's own "remove what feels too dense" note — it repeated words the now-properly-visible signboard already shows.

## Decision 013 — Swapped to the original full-resolution photo (no cutout, no transparency)

**Date:** 2026-09-27

**Decision:** `assets/flex/village-hall-cutout.jpg` now comes from อ๊อด's original, uncropped photo of the pavilion (blue sky, full symmetric roof, full signboard, no transparent corners), cropped to the roofline+sign+porch band (720×350, ~2.06:1) with the roof peak given a small sky margin and the signboard confirmed (by pixel measurement) to sit within the first ~160px — safely inside the 200px `gravity:'top'` header even under a wide/flat runtime crop. `headerBlock()` itself is unchanged (same height, gravity, single-wash structure from Decision 012).

**Reason:** The previous source was a small, pre-existing user-supplied cutout with irregular transparent corners (a decorative roof-shaped crop), which forced upscaling (visible blur) and a narrow safe rectangle to avoid transparent slivers. The new photo is a plain rectangular original at native resolution — sharper, no upscale artifacts, and gives far more room to choose a well-composed crop instead of being constrained by where the old cutout happened to be opaque.
