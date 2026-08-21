---
name: "add-app"
description: "Scaffolds a new Tauri 2 + Vite + React app from the terminal/explorer template, wired for Isolation, CSP, typed IPC, and the ui-kit AppShell. Use when the user asks to create a new desktop app in this workspace."
---

<!-- Generated from .cursor/skills/add-app/SKILL.md by `pnpm sync:agents`. Do not edit. -->


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
   - `app.security.devCsp` object form: full copy of `csp`, plus `'self'` and
     `ws://localhost:<port>` / `ws://127.0.0.1:<port>` on `connect-src` (the app’s
     Vite `devUrl` port).
   - `bundle.active: false`. Windows icons only (PNG + `icon.ico`). Do not set
     `targets: "all"` and do not add `icon.icns`. Release ZIP is `pnpm package:win64`.
     New `icons/*.png` / `icon.ico` are Git LFS-tracked automatically.
5. Capabilities: `src-tauri/capabilities/main.json`, `"windows": ["main"]`, least
   privilege — only the window/core commands the shell actually uses.
6. UI: wrap the root component in `@gencore/ui-kit`'s `AppShell` (titlebar, statusbar).
   All Tauri calls go through typed `ipc.*.ts` wrappers, never raw `invoke` in
   components.
7. Do not register the app port in `.cursor/environment.json` — that file is Cursor-only.
8. Verify: `pnpm --filter @gencore/{name} typecheck`, `test`, `lint`;
   `cargo check -p gencore-{name}`.

## Constraints

Follow `architecture`, `security`, `modular-naming`, and `react-ui-kit` rules.
