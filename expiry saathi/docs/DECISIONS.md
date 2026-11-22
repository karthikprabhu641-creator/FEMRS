# Decisions

- **M0 toolchain:** Pin exact package versions and the pnpm release in `package.json` for reproducible installs. TypeScript is pinned to 6.0.3, the latest version supported by the selected `typescript-eslint` release; TypeScript 7 is not yet within its declared peer range.
- **Service worker:** Use the required `injectManifest` strategy with a minimal Workbox precache worker. Notification behavior remains out of scope until the reminder milestone.
