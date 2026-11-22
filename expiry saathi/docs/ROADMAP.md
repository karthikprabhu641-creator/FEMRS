# Expiry Saathi Roadmap

## MVP (Phase 1)

- [x] **M0 — Project setup:** Vite, React, TypeScript, Tailwind CSS, ESLint, Vitest, PWA plugin, and CI. Done when dev/build/test/lint run cleanly and the app can be installed.
- [ ] **M1 — Domain layer:** expiry status, FIFO sort, reminder rules, and unit tests. Done when domain tests pass, including date-boundary cases.
- [ ] **M2 — Local data:** Dexie schema, repositories, hooks, seed data, and migration test. Done when offline CRUD and tests work.
- [ ] **M3 — Add item:** quick-add flow with date presets and validation. Done when a batch can be added in under 10 seconds.
- [ ] **M4 — Dashboard and items:** counts, search, filters, and FIFO sorting. Done when counts match data and empty states are handled.
- [ ] **M5 — Item actions:** sold/discarded/returned actions, edit, delete with Undo, and event history. Done when events are logged and Undo works.
- [ ] **M6 — Settings:** categories, thresholds, language, and dark mode. Done when changes affect statuses live.
- [ ] **M7 — Reminders:** in-app, local notification, and periodic-sync adapter. Done when due items are notified without duplicates.
- [ ] **M8 — Backup and install:** JSON/CSV/share, install prompt, update flow, and persistent storage. Done when a backup restores in a fresh browser.
- [ ] **M9 — Release polish:** accessibility, Lighthouse 90+, e2e tests, and deployment. Done when offline e2e passes and the deployed app is installable.

## Phase 2

- [ ] **P2 — Shop feedback features:** barcode and Open Food Facts lookup, Web Push, WhatsApp sharing, and reports. Start after testing the MVP in two or three shops for a week; use their feedback to choose scope.

## Phase 3

- Cloud sync, login, and multi-device or staff accounts.
- OCR for printed dates, label/shelf-tag printing, and multi-shop support.
