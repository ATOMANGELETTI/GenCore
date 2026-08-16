---
name: add-app
description: Scaffolds a new Tauri 2 + Vite + React app from the terminal/explorer template, wired for Isolation, CSP, typed IPC, and the ui-kit AppShell. Use when the user asks to create a new desktop app in this workspace.
paths:
  - apps/**
---

# Add app

Use this when adding a new app under `apps/{name}` (e.g. a third GenCore surface).

## Steps

1. Copy the structure of `apps/terminal` (smallest reference template): Vite + React
   frontend, `src-tauri/` Rust backend, `tests/` at the app root.
2. Rust package name: `gencore-{name}` in `src-tauri/Cargo.toml`; add it as a member of
   the root `Cargo.toml` workspace.
3. `package.json` name: `@gencore/{name}`, `"private": true`. Depend on
   `@gencore/ui-kit`, `@gencore/config-typescript`, `@gencore/config-vite` via
   `workspace:*`.
4. `tauri.conf.json`:
   - `app.security.pattern` = isolation, with `app.security.pattern.dir` pointing at an
     `isolation/` folder whose hook allowlists only the commands this app's UI calls.
   - `app.security.csp` object form (see `security` rule); `withGlobalTauri: false`;
     `freezePrototype: true`; `assetProtocol.enable: false`.
   - `bundle.active: false`. Windows icons only (PNG + `icon.ico`). Do not set
     `targets: "all"` and do not add `icon.icns`. Release ZIP is `pnpm package:win64`.
5. Capabilities: `src-tauri/capabilities/main.json`, `"windows": ["main"]`, least
   privilege — only the window/core commands the shell actually uses.
6. UI: wrap the root component in `@gencore/ui-kit`'s `AppShell` (titlebar, statusbar).
   All Tauri calls go through typed `ipc.*.ts` wrappers, never raw `invoke` in
   components.
7. Add the app's dev port to `.cursor/environment.json` `ports` if it needs cloud
   preview (coordinate with the controller — this file is shared).
8. Verify: `pnpm --filter @gencore/{name} typecheck`, `test`, `lint`;
   `cargo check -p gencore-{name}`.

## Constraints

Follow `architecture`, `security`, `modular-naming`, and `react-ui-kit` rules.
