# Decisions

- **M0 toolchain:** Pin exact package versions and the pnpm release in `package.json` for reproducible installs. TypeScript is pinned to 6.0.3, the latest version supported by the selected `typescript-eslint` release; TypeScript 7 is not yet within its declared peer range.
- **Service worker:** Use the required `injectManifest` strategy with a minimal Workbox precache worker. Notification behavior remains out of scope until the reminder milestone.
- **M1 domain dependencies:** Pin Zod 4.6.7 for inferred runtime schemas and date-fns 4.4.0 for local `startOfDay`; both are tree-shaken and keep the production JS budget below 170 KB gzip. Pin the Vitest 5.1.1 V8 coverage provider as a dev-only dependency to enforce 100% domain coverage.
- **Batch display context:** Keep database Batch fields separate from the joined `BatchWithProduct` view; FIFO and reminder functions need the product name and category, while the stored batch follows the PDF fields.
- **Category thresholds:** Store per-category expiry status overrides under the `categoryThresholds` Settings key, keyed by category UUID, so the persisted Category fields stay aligned with the build spec.
- **Undo metadata:** Categories include `updatedAt` and optional `deletedAt` so category writes and undo follow repository rules; settings updates carry `updatedAt`. Events remain append-only with the spec's `at` field.
- **M2 dependencies:** Dexie 4.4.7 and dexie-react-hooks 4.4.0 add about 35.3 KB gzip combined (30.9 + 4.4 KB vendor distributions) for offline IndexedDB and reactive queries; fake-indexeddb 6.2.8 is test-only. The current app bundle is unchanged until a production screen imports the database hooks.
- **M3 quick add:** Use React Hook Form with the Zod resolver for the quick-add form; both are pinned and remain within the requested small-dependency budget. The user's approved Playwright 1.65.1 test runner is development-only; e2e uses the installed Chrome browser and does not add a browser binary to the app.
- **M3 remembered inputs:** Store the last selected category and unit in localStorage. These are form conveniences, not shop data, so this avoids a database schema change and works offline.
- **M3 translations:** Keep Hinglish as the default dictionary and merge it over English fallback strings through `src/i18n/index.ts`; user-visible copy remains outside components.
- **Offline deep links:** Register the precached `index.html` as the Workbox navigation fallback so routes such as `/add` reopen after an offline reload.
- **M3 bundle budget:** Lazy-load the add-item route so the Home placeholder does not eagerly download form and IndexedDB feature code.
