# Task 4b / Wave 4 — Explorer app — Report

## Summary

Built `@gencore/explorer`: Tauri 2 + Vite + React template app under `apps/explorer/**`, matching the file layout, IPC rules, and security posture in the brief. Heading/title copy is exactly "Tauri Explorer Template"; version is fetched from `get_app_info` and flows into the AppShell's titlebar + statusbar. `apps/explorer` on disk was empty at task start (any prior git-tracked content was stale/unrelated terminal scaffolding); nothing under `apps/terminal`, crates, or ui-kit was touched.

Security: Isolation pattern (`isolation/index.html` + `isolation.hook.js`, allowlisting only `get_app_info` + the 4 window commands used), strict object CSP (`self` + `ipc:`/`http://ipc.localhost` only, no `unsafe-inline`), `freezePrototype: true`, `withGlobalTauri: false`, `assetProtocol.enable: false`, COOP `same-origin`, and a least-privilege `capabilities/main.json` (window chrome + `gencore-core:allow-get-app-info` only; `gencore-fs` registered but granted no permissions). All IPC goes through typed wrappers in `src/modules/ipc/`; no `window.__TAURI__` usage (verified by test).

## Tests

- `typecheck`, `test` (8/8 vitest), `lint` (biome, clean), `cargo check -p gencore-explorer` — all pass.
- `pnpm dev` / `vite` dev server verified to start successfully.

## Out-of-scope fix (flagged for visibility)

`packages/config-vite`'s `createTauriViteConfig` was unusable by any consumer (`vite`/`vite build` failed with `ERR_MODULE_NOT_FOUND`) because its internal relative imports omitted extensions, which Node's native ESM loader requires once Vite externalizes a workspace package during config-file loading. Fixed with a minimal, verified change: added `.ts` extensions to the two relative imports in `packages/config-vite/src/index.ts` + `vite.tauri-factory.ts`, plus `allowImportingTsExtensions: true` in `packages/config-vite/tsconfig.json` and `apps/explorer/tsconfig.json`. Re-verified `config-vite`'s own typecheck/tests still pass. This is outside `apps/explorer/**`; flagging in case another wave/agent also touches `config-vite`.

## Remaining concern

`pnpm build`/`tauri build` (production bundling only, not dev) fails downstream: Vite 8's legacy-target transpile (triggered by `config-vite`'s `chrome105`/`safari13` build targets) needs the optional `esbuild` package, whose install script pnpm blocks by default (`ERR_PNPM_IGNORED_BUILDS`). Fixing requires either a workspace-level `pnpm approve-builds`/`onlyBuiltDependencies` decision (root `package.json`, not mine to change) or adjusting the shared build targets — left unresolved as it's a supply-chain-policy call, not an app bug.

## Fix (Wave 4 critical/important findings, post-review)

- **Critical — config-vite ESM vs Terminal typecheck**: kept the `.ts` suffix
  on `packages/config-vite`'s internal relative imports (required for
  `vite build` to resolve the workspace package; verified extensionless and
  `.js`-suffixed alternatives both fail with `ERR_MODULE_NOT_FOUND`).
  Replaced the two ad-hoc per-package `allowImportingTsExtensions` overrides
  with a single flag in `packages/config-typescript/tsconfig.vite-app.json`
  (shared by `apps/terminal` and `apps/explorer`), plus keeping the flag in
  `packages/config-vite/tsconfig.json` itself (extends `base`, not
  `vite-app`). `pnpm --filter @gencore/terminal typecheck` and
  `pnpm --filter @gencore/explorer typecheck` both pass now.
- **Important — Explorer CSP**: tightened
  `apps/explorer/src-tauri/tauri.conf.json`'s CSP to match Terminal's:
  `default-src 'self'`; `connect-src` limited to `ipc:` +
  `http://ipc.localhost`; `img-src` limited to `'self'` + `data:` (removed
  `asset:`/`http://asset.localhost`); `style-src 'self' 'unsafe-inline'`
  (Tailwind requires the inline style, matching Terminal); added
  `font-src 'self'`, `object-src 'none'`, `base-uri 'none'`. `script-src` was
  dropped to inherit from the now-restrictive `default-src` (Terminal's CSP
  has no separate `script-src` either). `freezePrototype`, isolation pattern,
  `withGlobalTauri: false`, and `assetProtocol.enable: false` were untouched.
- No scope expansion beyond these two findings; only the files named above
  plus these report files were touched.

Report path: `.superpowers/sdd/task-4b-report.md`
