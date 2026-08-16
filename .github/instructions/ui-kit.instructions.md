---
applyTo: "packages/ui-kit/**"
---

# `@gencore/ui-kit` instructions

- Theme with the Nord palette only: consume tokens from `src/tokens` and the
  `theme.polar-night.css` (dark) / `theme.snow-storm.css` (light) stylesheets.
  Do not introduce new hardcoded hex/RGB colors outside the token system.
- Build primitives and composites on the unified `radix-ui` package (already
  a dependency). Do not add individual `@radix-ui/react-*` packages — that
  fragments versioning across the same primitives.
- This package must stay platform-agnostic: never import `@tauri-apps/api`,
  `@tauri-apps/cli`, or reference `window.__TAURI__` from anything under
  `packages/ui-kit`. Tauri integration belongs in `apps/*`, not here.
- Follow the existing export map in `package.json` (`./primitives/*`,
  `./composites/*`, `./tokens`, `./styles/*`) when adding new public
  surface — add new entries there rather than deep-importing from `src/`.
- Put tests under `tests/` mirroring the source path (e.g.
  `src/primitives/button` → `tests/primitives/button.test.tsx`), using
  `vitest` + `@testing-library/react`.
- Run `pnpm --filter @gencore/ui-kit lint typecheck test` before proposing a
  change is complete.
