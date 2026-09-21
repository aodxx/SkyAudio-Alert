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
