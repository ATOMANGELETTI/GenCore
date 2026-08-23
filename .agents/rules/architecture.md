---
trigger: always_on
description: "GenCore workspace graph — apps, packages, crates, and plugin ids"
---

<!-- Generated from .cursor/rules/architecture.mdc by `pnpm sync:agents`. Do not edit. -->


# Architecture

Monorepo layout (pnpm + Cargo workspaces):

- Apps (Tauri 2 + Vite + React, private): `apps/terminal`, `apps/explorer`.
- Packages (shared JS, `workspace:*`): `@gencore/ui-kit`, `@gencore/config-typescript`,
  `@gencore/config-vite`.
- Crates (shared Rust, root Cargo workspace):
  - `crates/gencore-core` — package/crate name `gencore-core`.
  - `crates/gencore-plugin-pty` — package name **and** Tauri plugin id `gencore-pty`.
  - `crates/gencore-plugin-fs` — package name **and** Tauri plugin id `gencore-fs`.
  - `crates/gencore-plugin-assistant` — package name **and** Tauri plugin id `gencore-assistant`.

Rules:

- Never name a crate or plugin `tauri-plugin-fs` / `tauri-plugin-pty`. The folder is
  `gencore-plugin-{name}`; the package/plugin id is `gencore-{name}`.
- Cross-package JS imports use `workspace:*` in `package.json`, never relative
  `../../packages/...` paths.
- Cross-crate Rust deps go through the root `Cargo.toml` `[workspace]` members list, using
  path dependencies scoped to `crates/*`.
- Apps depend on packages/crates; packages/crates never depend on apps.
- Keep new apps/packages/crates consistent with this graph — update this rule if the graph
  changes.
- Product distribution is **Windows x64 portable ZIP** only (`pnpm package:win64`);
  `bundle.active` stays `false` and apps do not emit NSIS/MSI/dmg/AppImage.
