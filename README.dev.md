Development notes — GameBoy JS (TypeScript + Vite)

This file summarizes local development steps introduced during modernization.

Dev server

- Start dev server:

  npm run dev

- Open http://localhost:5173/

Build & preview

- Build:

  npm run build

- Preview production build:

  npm run preview

TypeScript migration notes

- tsconfig.json is configured with "allowJs": true and "noEmit": true for incremental migration.
- Convert individual .js files to .ts or .mts gradually. Keep module exports/imports stable to avoid breaking the app.
- Preferred extension for typed modules: .ts for plain ES modules, .mts only if explicit module type is needed.

Testing

- Unit tests: vitest (npm run test)
- E2E: Playwright (npm run test:e2e) — requires test ROMs under tests/roms (gitignored)

Notes

- Do not commit ROMs.
- When converting heavy modules (CPU/GPU/MMU), run unit tests after each file change.
