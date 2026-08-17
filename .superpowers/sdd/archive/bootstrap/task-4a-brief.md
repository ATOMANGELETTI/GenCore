# Task 4a / Wave 4 — Terminal app

Work from: `c:\Storage\Development\Workspace\Cursor\GenCore`

**You own ONLY `apps/terminal/**`.** Do not edit `apps/explorer/**`, crates, ui-kit, root `Cargo.toml` (members already include `apps/terminal/src-tauri`), `.github`, `.husky`, `.vscode`, `.cursor`.

## Goal

Standalone Tauri 2 + Vite + React template app with Nord Polar Night chrome.

Exact content copy:
- Title / heading: `Tauri Terminal Template`
- Version from `get_app_info` (also in titlebar + statusbar)

Layout: Titlebar top, ContentArea middle, Statusbar bottom via `@gencore/ui-kit` `AppShell` with `density="compact"`.

## Frontend (`apps/terminal`)

Package name `@gencore/terminal`, version `0.1.0`, private.

Deps: `react@19.2.8`, `react-dom@19.2.8`, `@tauri-apps/api@2.11.1`, `@gencore/ui-kit` workspace, `@gencore/config-typescript`, `@gencore/config-vite`.

Dev: `@tauri-apps/cli@2.11.4`, vite 8.2.1, typescript 7.0.2, vitest, testing-library.

Scripts: `dev` (vite), `build` (tsc + vite build), `tauri`, `tauri:dev`, `tauri:build`, `test`, `typecheck`, `lint`.

Files:
```
src/main.tsx
src/index.html  (or root index.html — Vite default)
src/modules/app/app.component.tsx
src/modules/app/app.theme.css   # density only, no new palette
src/modules/ipc/ipc.app-info.ts
src/modules/ipc/ipc.window.ts
src/modules/ipc/ipc.types.ts
tests/unit/   # AppShell copy + mocked invoke
vite.config.ts  # createTauriViteConfig({ port: 5173 })
tsconfig.json
```

IPC rules:
- UI never calls `invoke` directly.
- `ipc.app-info.ts` wraps `invoke<AppInfo>("plugin:gencore-core|get_app_info")` (confirm exact command id against `crates/gencore-core`).
- `ipc.window.ts` uses `getCurrentWindow()` from `@tauri-apps/api/window` for close/minimize/toggleMaximize. Never `window.__TAURI__`.
- Isolation hook allowlists only: `plugin:gencore-core|get_app_info` and core window commands used by the titlebar. Drop everything else.

Import `@gencore/ui-kit/styles/globals.css` + `theme.polar-night.css` then `app.theme.css`.

ThemeProvider + AppShell. Traffic lights wired to ipc.window.

## Isolation

`apps/terminal/isolation/index.html` + `isolation.hook.js` with `window.__TAURI_ISOLATION_HOOK__`.

## Rust (`apps/terminal/src-tauri`)

Modular: `src/lib.rs`, `src/main.rs` (desktop entry), `src/modules/setup/mod.rs`.

Register `gencore_core::init()` and `gencore_pty::init()` (crate package names `gencore-core` / `gencore-pty`, paths `../../../crates/...`).

**Capabilities `capabilities/main.json`:** `windows: ["main"]` only. Permissions ONLY:
- `core:window:allow-close`
- `core:window:allow-minimize`
- `core:window:allow-toggle-maximize`
- `core:window:allow-start-dragging`
- `gencore-core:allow-get-app-info`

Do **not** grant `gencore-pty` allows. No `core:default` dump. No shell/http/fs/opener.

`tauri.conf.json` (Tauri 2):
- identifier `com.gencore.terminal`
- productName `GenCore Terminal`, version `0.1.0`
- window label `main`, decorations false, ~960x640
- `withGlobalTauri`: false
- `app.security.freezePrototype`: true if schema allows
- `assetProtocol.enable`: false
- CSP object: default-src `'self'`; connect-src `ipc:` + `http://ipc.localhost`; img-src `'self'` `data:`; style-src `'self'` `'unsafe-inline'` **only if required for Tailwind** (document in a one-line comment in report); font-src `'self'`; object-src/base-uri `'none'`
- headers: `Cross-Origin-Opener-Policy: same-origin` only (no COEP)
- isolation pattern `dir` → `../isolation`
- build: beforeDev/beforeBuild via pnpm filter `@gencore/terminal`, devUrl `http://localhost:5173`, frontendDist `../dist`

Icons: generate a minimal Nord PNG and `pnpm exec tauri icon` if possible; otherwise a valid placeholder set so `tauri build` config is complete.

`Cargo.toml` edition 2024, workspace deps.

Tests: `apps/terminal/tests/unit/` for template copy (mock IPC). `src-tauri/tests/` only if useful.

## Constraints

Latest stables. No git commit. Do not touch explorer. After install: typecheck + vitest for this package. `cargo check -p` the terminal package name you chose.

## Report

`.superpowers/sdd/task-4a-report.md`
