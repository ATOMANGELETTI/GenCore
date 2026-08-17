# Wave 4 Combined Review — Terminal (4a) & Explorer (4b)

Read-only review. No files mutated (typecheck/test/cargo check run for verification only).

## Spec compliance

**Terminal (`apps/terminal`)** — matches brief: exact copy `Tauri Terminal Template`, `density="compact"`, `@gencore/terminal` deps/scripts/port 5173 all correct, isolation hook allowlists exactly the 5 commands, capabilities limited to window chrome + `gencore-core:allow-get-app-info` (no `gencore-pty` allows), `withGlobalTauri:false`, `freezePrototype:true`, `assetProtocol.enable:false`, COOP-only headers, typed IPC (`ipc.app-info.ts`/`ipc.window.ts`), no `window.__TAURI__` (asserted by test + grep-verified). CSP matches brief including documented `style-src 'unsafe-inline'` justification. `cargo check -p gencore-terminal` clean; vitest 5/5 pass.

**Explorer (`apps/explorer`)** — matches brief: exact copy `Tauri Explorer Template`, `density="comfortable"`, deps/scripts/port 5174 correct, isolation hook + capabilities equally least-privilege (no `gencore-fs` allows), `withGlobalTauri:false`, `freezePrototype:true`, `assetProtocol.enable:false`, typed IPC, no `window.__TAURI__` (test + grep-verified). `cargo check -p gencore-explorer` clean; vitest 8/8 pass.

## Critical

1. **Terminal typecheck is currently broken** (reproduced): `pnpm --filter @gencore/terminal typecheck` fails with `TS5097` because 4b's out-of-scope edit to `packages/config-vite` (added `.ts` extensions to relative imports) requires consumers to set `allowImportingTsExtensions: true`, which 4b added only to `apps/explorer/tsconfig.json` and `packages/config-vite/tsconfig.json` — not to `apps/terminal/tsconfig.json`. Task-4a-report's "typecheck — pass" claim is now stale/false. Needs either the flag added to terminal's tsconfig, or the shared package fixed a non-breaking way — this is a cross-wave shared-package regression, not a terminal-specific bug.

## Important

2. **Explorer's CSP is missing directives the brief mandated** ("CSP same as terminal"): no `font-src`, `object-src: 'none'`, or `base-uri: 'none'`. Terminal correctly locks these down; Explorer's `tauri.conf.json` omits them entirely, leaving no explicit `<object>`/`<embed>` or `<base>`-tag restriction (relies on `default-src 'self'` fallback only, which is weaker than the explicit `'none'` the brief specified for defense-in-depth).
3. **Explorer's CSP `img-src` allows `asset: http://asset.localhost`** while `assetProtocol.enable` is `false` — dead/inconsistent directive; harmless today but should be removed or `assetProtocol` intentionally enabled to match.
4. **Out-of-scope shared-package edit**: 4b modified `packages/config-vite/{src/index.ts,vite.tauri-factory.ts,tsconfig.json}`, which neither brief authorized (briefs restrict each task to its own `apps/**`). Self-flagged in task-4b-report, but the fix is incomplete (see #1) and needs owner reconciliation since it affects all `config-vite` consumers, not just Explorer.

## Notes (not blocking)

- Both apps correctly resolve `plugin:gencore-core|get_app_info` against the actual `gencore-core` crate (`PLUGIN_ID = "gencore-core"`, command `get_app_info`) — verified against `crates/gencore-core/src/lib.rs`.
- Isolation hooks, capabilities JSON, and IPC wrapper modules are both clean, minimal, and consistent between apps.
- 4b's report also flags `tauri build` failing on `esbuild` optional-dependency install policy (`ERR_PNPM_IGNORED_BUILDS`) — a workspace-level pnpm policy decision, out of scope for both apps; not re-verified here since no build was requested.
