# Decisions

- **M0 toolchain:** Pin exact package versions and the pnpm release in `package.json` for reproducible installs. TypeScript is pinned to 6.0.3, the latest version supported by the selected `typescript-eslint` release; TypeScript 7 is not yet within its declared peer range.
- **Service worker:** Use the required `injectManifest` strategy with a minimal Workbox precache worker. Notification behavior remains out of scope until the reminder milestone.
- **M1 domain dependencies:** Pin Zod 4.6.7 for inferred runtime schemas and date-fns 4.4.0 for local `startOfDay`; both are tree-shaken and keep the production JS budget below 170 KB gzip. Pin the Vitest 5.1.1 V8 coverage provider as a dev-only dependency to enforce 100% domain coverage.
- **Batch display context:** Keep database Batch fields separate from the joined `BatchWithProduct` view; FIFO and reminder functions need the product name and category, while the stored batch follows the PDF fields.
- **Category thresholds:** Store per-category expiry status overrides under the `categoryThresholds` Settings key, keyed by category UUID, so the persisted Category fields stay aligned with the build spec.
- **Undo metadata:** Categories include `updatedAt` and optional `deletedAt` so category writes and undo follow repository rules; settings updates carry `updatedAt`. Events remain append-only with the spec's `at` field.
- **M2 dependencies:** Dexie 4.4.7 and dexie-react-hooks 4.4.0 add about 35.3 KB gzip combined (30.9 + 4.4 KB vendor distributions) for offline IndexedDB and reactive queries; fake-indexeddb 6.2.8 is test-only. The current app bundle is unchanged until a production screen imports the database hooks.
