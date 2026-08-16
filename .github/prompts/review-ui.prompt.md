---
mode: ask
description: Review a frontend / ui-kit change for GenCore conventions.
---

Review the current diff (or the file(s) I mention) against these checks and
report findings as a short checklist, calling out any failing item with the
file and line:

1. **Nord theming** — no hardcoded colors outside `packages/ui-kit/src/tokens`
   and the `theme.polar-night.css` / `theme.snow-storm.css` stylesheets.
2. **`radix-ui` usage** — uses the unified `radix-ui` package, not individual
   `@radix-ui/react-*` packages.
3. **Platform boundary** — `packages/ui-kit` never imports `@tauri-apps/*` or
   references `window.__TAURI__`.
4. **No `window.__TAURI__`** anywhere in frontend code, including `apps/*`;
   Tauri APIs are imported from `@tauri-apps/api` instead.
5. **Exports** — new public UI surface is added to `package.json`'s `exports`
   map rather than deep-imported.
6. **Tests** — new/changed components have corresponding tests under
   `tests/` (vitest + `@testing-library/react`), not alongside the source.
7. **Types** — no new `any`/`@ts-expect-error` without a comment explaining
   why it's necessary.

Finish with a one-line verdict: `Approve`, `Approve with nits`, or
`Changes requested`.
