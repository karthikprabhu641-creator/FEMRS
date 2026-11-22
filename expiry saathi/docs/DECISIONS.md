# Decisions

- **M0 toolchain:** Pin exact package versions and the pnpm release in `package.json` for reproducible installs. TypeScript is pinned to 6.0.3, the latest version supported by the selected `typescript-eslint` release; TypeScript 7 is not yet within its declared peer range.
- **Service worker:** Use the required `injectManifest` strategy with a minimal Workbox precache worker. Notification behavior remains out of scope until the reminder milestone.
- **M1 domain dependencies:** Pin Zod 4.6.7 for inferred runtime schemas and date-fns 4.4.0 for local `startOfDay`; both are tree-shaken and keep the production JS budget below 170 KB gzip. Pin the Vitest 5.1.1 V8 coverage provider as a dev-only dependency to enforce 100% domain coverage.
- **Batch display context:** Include the product display name and category ID on the domain Batch shape because FIFO and reminder functions receive batches without a separate product lookup.
