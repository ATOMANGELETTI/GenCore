# Task 4b / Wave 4 — Explorer app

Work from: `c:\Storage\Development\Workspace\Cursor\GenCore`

**You own ONLY `apps/explorer/**`.** Do not edit `apps/terminal/**`, crates, ui-kit, root `Cargo.toml` (members already include `apps/explorer/src-tauri`), `.github`, `.husky`, `.vscode`, `.cursor`.

## Goal

Standalone Tauri 2 + Vite + React template app with Nord Polar Night chrome.

Exact content copy:
- Title / heading: `Tauri Explorer Template`
- Version from `get_app_info` (also in titlebar + statusbar)

Layout: Titlebar top, ContentArea middle, Statusbar bottom via `@gencore/ui-kit` `AppShell` with `density="comfortable"`.

## Frontend (`apps/explorer`)

Package name `@gencore/explorer`, version `0.1.0`, private.

Deps: `react@19.2.8`, `react-dom@19.2.8`, `@tauri-apps/api@2.11.1`, `@gencore/ui-kit` workspace, `@gencore/config-typescript`, `@gencore/config-vite`.

Dev: `@tauri-apps/cli@2.11.4`, vite 8.2.1, typescript 7.0.2, vitest, testing-library.

Scripts: `dev`, `build`, `tauri`, `tauri:dev`, `tauri:build`, `test`, `typecheck`, `lint`.

Files:
```
src/main.tsx
src/modules/app/app.component.tsx
src/modules/app/app.theme.css   # density only, no new palette
src/modules/ipc/ipc.app-info.ts
src/modules/ipc/ipc.window.ts
src/modules/ipc/ipc.types.ts
tests/unit/
vite.config.ts  # createTauriViteConfig({ port: 5174 })
tsconfig.json
```

IPC rules:
- UI never calls `invoke` directly.
- `ipc.app-info.ts` wraps `invoke<AppInfo>("plugin:gencore-core|get_app_info")`.
- `ipc.window.ts` uses `getCurrentWindow()` from `@tauri-apps/api/window`. Never `window.__TAURI__`.
- Isolation hook allowlists only `plugin:gencore-core|get_app_info` and core window commands used by the titlebar.

Import globals + polar-night + app.theme.css. ThemeProvider + AppShell. Traffic lights → ipc.window.

## Isolation

`apps/explorer/isolation/index.html` + `isolation.hook.js`.

## Rust (`apps/explorer/src-tauri`)

Modular: `src/lib.rs`, `src/main.rs`, `src/modules/setup/mod.rs`.

Register `gencore_core::init()` and `gencore_fs::init()` (crate names `gencore-core` / `gencore-fs`).

**Capabilities `capabilities/main.json`:** `windows: ["main"]` only:
- `core:window:allow-close`
- `core:window:allow-minimize`
- `core:window:allow-toggle-maximize`
- `core:window:allow-start-dragging`
- `gencore-core:allow-get-app-info`

Do **not** grant `gencore-fs` allows. No `core:default`. No official fs/shell/http/opener.

`tauri.conf.json`:
- identifier `com.gencore.explorer`
- productName `GenCore Explorer`, version `0.1.0`
- window `main`, decorations false, ~1024x720
- `withGlobalTauri`: false
- `freezePrototype`: true if schema allows
- `assetProtocol.enable`: false
- CSP same as terminal (self + ipc only; unsafe-inline styles only if Tailwind requires)
- COOP same-origin, no COEP
- isolation `dir` → `../isolation`
- build: pnpm filter `@gencore/explorer`, devUrl `http://localhost:5174`, frontendDist `../dist`

Icons: minimal Nord set.

Tests: `apps/explorer/tests/unit/` for template copy.

## Constraints

Latest stables. No git commit. Do not touch terminal. typecheck + vitest + `cargo check` for this app crate.

## Report

`.superpowers/sdd/task-4b-report.md`
