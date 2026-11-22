# AGENTS.md - Expiry Saathi (Food Expiry Manager PWA)

## What this project is
Offline-first Progressive Web App for small shops (dukaan / kirana). The owner records product
batches with expiry dates and gets reminders before items expire, so stock is sold first (FIFO)
or returned / discarded in time. No backend in v1: all data lives on the device (IndexedDB).
Users are shopkeepers: busy, one-handed, often on low-end Android phones, weak internet.

## Tech stack (do not swap without asking)
- TypeScript (strict), Vite, React, React Router
- Tailwind CSS + Radix UI primitives, lucide-react icons
- Dexie (IndexedDB) + dexie-react-hooks for ALL persistent data; Zustand only for UI state
- vite-plugin-pwa, strategy "injectManifest", custom service worker in src/sw/sw.ts
- date-fns, Zod, react-hook-form
- Vitest + Testing Library (unit), Playwright (e2e), ESLint + Prettier
- Package manager: pnpm (use npm if pnpm is missing). Use latest stable versions.

## Commands
pnpm dev | pnpm build | pnpm preview | pnpm test | pnpm test:e2e | pnpm lint | pnpm typecheck

## Folder layout
src/domain/        pure logic, no React, no Dexie (expiry.ts, reminders.ts, fifo.ts) - 100% tested
src/db/            Dexie schema, migrations, repositories (repos/*.ts)
src/hooks/         React hooks that wrap repos (useBatches, useDashboard, useSettings)
src/features/      one folder per feature: dashboard, add-item, items, item-detail, settings, backup
src/components/    shared UI (Button, Sheet, StatusBadge, DatePresets, Toast, EmptyState)
src/notifications/ delivery adapters: inApp, localNotification, periodicSync, webPush
src/sw/            service worker source
src/i18n/          en.ts, hinglish.ts, hi.ts (default = hinglish)
src/lib/           small utilities (id, csv, share, install-prompt)
docs/              PRD.md, ROADMAP.md, DECISIONS.md

## Domain rules (critical)
1. Expiry is a calendar date stored as the string "YYYY-MM-DD". Never store it as a timestamp.
   Compare using the device's local date (startOfDay). Avoid UTC conversion bugs.
2. Status from days left: expired (<0), today (0), critical (1-3), warning (4-7), soon (8-30),
   ok (>30). Thresholds can be overridden per category in settings. Logic lives ONLY in
   src/domain/expiry.ts.
3. Product vs Batch: a Product holds name, barcode, category. A Batch holds expiryDate, quantity,
   status (active | sold | discarded | returned). One product can have many batches.
   Default sort everywhere: earliest expiry first (FIFO).
4. Never hard-delete user data. Set deletedAt and show an Undo toast for 8 seconds.
5. Components never call Dexie directly. Use repos in src/db/repos via hooks in src/hooks.
6. Everything must work offline. Network (Open Food Facts lookup, push) is an optional
   enhancement inside try/catch with a manual-entry fallback.
7. Reminder delivery is best-effort. The dashboard must ALWAYS show due items when the app opens,
   whatever the notification adapters did.
8. Call navigator.storage.persist() after first successful save to reduce data eviction.
9. Any schema change needs a new Dexie version + migration + a test. Ask before changing schema.

## UI rules
- Mobile-first at 360px width, tap targets at least 48px, bottom navigation, thumb-reachable actions.
- Status is shown with colour + icon + text (never colour alone). High contrast. Dark mode supported.
- Default copy is Hinglish (example: "Aaj expire ho raha hai"). No hardcoded strings in components.
- Add-item flow must be completable in under 10 seconds (search or scan, quantity, date preset).
- Respect prefers-reduced-motion. All inputs have labels. Visible focus states.

## Code rules
- No `any`. Validate imported JSON and network data with Zod.
- Small components, named exports, feature-folder imports only through each feature's index.ts.
- New dependency needs a one-line reason and size impact. Initial JS budget: under 170 KB gzip.
- No secrets in the repo. Data stays on device unless the user opts in to sync (later phase).

## Workflow
- Work one milestone at a time from docs/ROADMAP.md. Before coding, restate the plan in 5 bullets.
- After each milestone run: pnpm typecheck && pnpm lint && pnpm test. Fix everything before moving on.
- Tick the milestone checkboxes in docs/ROADMAP.md. Log non-obvious choices in docs/DECISIONS.md.
- Small commits, conventional style: feat:, fix:, test:, docs:, chore:.
- Ask before: schema changes, adding a backend, adding a dependency over 20 KB gzip.

## Definition of done (per milestone)
- Works offline (test with DevTools offline + Playwright).
- Unit tests for domain logic, one e2e test for the main flow.
- Lighthouse: PWA installable, Performance and Accessibility each 90 or higher on mobile.
- No console errors. Empty, loading and error states handled.
