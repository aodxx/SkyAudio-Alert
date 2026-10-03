# SkyAudio-Alert — Verification Checklist

> **Scope review notice — 2026-10-03:** รายการด้านล่างเป็นหลักฐานการผ่านของระบบ legacy ใน TEST เท่านั้น ไม่ใช่ acceptance ของ flood-first product ใหม่ ให้ใช้ [`docs/SCOPE_REVIEW_REPORT.md`](docs/SCOPE_REVIEW_REPORT.md) และ checklist ใน design/refactor docs เพื่อสร้างรายการตรวจชุดใหม่ก่อนเปิด production

## ขั้นที่ 1 — Foundation
- [x] PRD / architecture / core repository structure

## ขั้นที่ 2 — End-to-end TEST LINE verification
- [x] Weather fetch / normalize / analyze
- [x] Palm-oil and rubber market fetch
- [x] Local news fetch
- [x] Thai forecast render
- [x] Thai audio synthesis
- [x] MP3 validation
- [x] Public audio storage / HTTPS validation
- [x] Flex + Audio delivered to TEST LINE
- [x] Latest verified run: `2026-09-29-lampai-test`
- [x] No error reported in the latest run

> **Boundary:** ขั้นที่ 2 ถือว่าผ่านใน TEST environment เท่านั้น ณ 2026-09-29. Production credentials/destination and production delivery have not been marked complete by this checklist.
