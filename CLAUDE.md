# CLAUDE.md

NutriLog – a personal calorie tracker PWA (Yazio-like). UI language is **German**; code, identifiers and comments are English.

## Git workflow (important – the owner wants everything in `main`)

- The owner wants all finished work to end up on `main` without manual merging or branch cleanup.
- Cloud sessions work on a `claude/...` branch. `.github/workflows/auto-merge.yml` runs tests + build on every push to `claude/**`, merges the branch into `main` (fast-forward or merge commit) and deletes the branch. You do **not** need to open a pull request.
- Before pushing, run `git fetch origin main && git merge origin/main` so the branch is based on the latest `main` (avoids merge conflicts that would block the auto-merge).
- Only push when `npm test` and `npm run build` pass locally – a failing run blocks the merge.
- A push to `main` (or a successful auto-merge) deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## Commands

```bash
npm install
npm run dev        # dev server
npm test           # vitest (unit tests, fake-indexeddb for DB tests)
npm run build      # tsc -b && vite build  → dist/
npm run preview    # serve the production build on :4173
node scripts/generate-icons.mjs   # re-render PNG icons from public/icons/favicon.svg (needs Playwright)
```

## Architecture

- **Stack:** React 19, TypeScript (strict), Vite 8, Tailwind CSS 4 (CSS-first config in `src/index.css`), Dexie 4 (IndexedDB), react-router (HashRouter – required for GitHub Pages sub-path), vite-plugin-pwa (Workbox, `registerType: 'prompt'`), `barcode-detector` ponyfill (ZXing WASM bundled locally, no CDN).
- **No backend.** All user data lives in IndexedDB (`src/db/db.ts`). Backups are JSON export/import (`src/lib/backup.ts`). Bump the Dexie schema version in `db.ts` for any index change and keep `BackupFile.version` compatible.
- **Data access:** all writes go through `src/db/repo.ts`; reactive reads use `useLiveQuery` (see `src/hooks/data.ts`).
- **Nutrition model:** foods store values **per 100 g/ml** (`per100`) plus named `servings` in base units. Diary entries snapshot `per100`, `servings` and the computed totals so deleting/editing a food never changes history. Carbohydrates follow EU labelling (excluding fibre).
- **Calculations:** `src/lib/nutrition.ts` (Mifflin-St Jeor BMR × activity factor ± weekly-rate adjustment with 7700 kcal/kg, safety floor 1200/1500 kcal). Activities use *active* calories `(MET − 1) × kg × h` (`src/lib/activities.ts`).
- **Food sources:** built-in generic foods in `src/data/foods.ts` (validated by `foods.test.ts`: Atwater energy check, sugar ≤ carbs, saturated ≤ fat), Open Food Facts in `src/lib/openfoodfacts.ts` (search.openfoodfacts.org with fallback to the legacy CGI search; product lookup via API v2). OFF rate limits: 10 searches/min → search is debounced.
- **Design tokens:** semantic colours (`page`, `surface`, `surface-2/3`, `line`, `ink`, `ink-2/3`, `brand`, `carbs`, `protein`, `fat`, `water`, `burn`) are defined in `@theme` and overridden under `.dark`. Use these instead of raw Tailwind colours so dark mode keeps working. Reusable primitives live in `src/components/ui/`.
- Use proper German typography in UI strings („…“) – an ASCII `"` inside a JSX attribute string breaks the build.

## Conventions

- Mobile-first, max width `max-w-lg`, safe-area insets (`pt-safe`, `pb-safe`, `env(safe-area-inset-*)`).
- Bottom sheets (`components/ui/Sheet.tsx`) for dialogs; toasts with undo for destructive actions.
- Keep the app fully offline-capable: no runtime CDN assets.
- Add/extend unit tests in `src/**/*.test.ts` for calculation or data-layer changes.
