# Copilot instructions for GenCore

GenCore is a pnpm + Turborepo monorepo (Node >=22.13, `packageManager: pnpm@11.22.0`)
pairing two Tauri 2 desktop apps with a shared design system and Rust plugin
crates. Keep suggestions consistent with the map and conventions below.

## Monorepo map

- `apps/terminal` — `@gencore/terminal`, a Tauri app, dev server on port `5173`.
- `apps/explorer` — `@gencore/explorer`, a Tauri app, dev server on port `5174`.
- `packages/ui-kit` — `@gencore/ui-kit`, the shared Nord-themed component library.
- `packages/config-typescript`, `packages/config-vite` — shared tooling config, not runtime code.
- `crates/gencore-core` — shared Rust core logic used by both apps' `src-tauri`.
- `crates/gencore-plugin-pty` — Tauri plugin, plugin id `gencore-pty`. **Stub only**: no real PTY I/O is implemented yet.
- `crates/gencore-plugin-fs` — Tauri plugin, plugin id `gencore-fs`. **Stub only**: no real filesystem access is implemented yet.
- Cargo workspace members: `crates/*` plus each app's `apps/*/src-tauri`.

## Conventions

- **Modular naming**: crate folder names use `gencore-plugin-<name>` but the
  Cargo package name and Tauri plugin id are the short form, e.g. folder
  `crates/gencore-plugin-pty` → package/plugin id `gencore-pty`. Don't confuse
  the two when writing plugin registration code or Cargo commands.
- **UI / design system**: use `@gencore/ui-kit` primitives and composites
  instead of hand-rolled components. Theming follows the Nord palette
  (`theme.polar-night.css` for dark, `theme.snow-storm.css` for light); don't
  hardcode colors outside the token system. `ui-kit` is built on `radix-ui`
  (the unified package, not individual `@radix-ui/react-*` packages) and must
  never import `@tauri-apps/*` — it stays platform-agnostic.
- **Tauri security**: respect each app's Content Security Policy and Isolation
  Pattern configuration in `tauri.conf.json`. Grant plugin capabilities at
  least-privilege — don't add capability entries beyond what a command
  actually needs, and don't restore real I/O behavior in the pty/fs plugin
  stubs without an explicit task to do so. Never suggest using the legacy
  `window.__TAURI__` global; use the `@tauri-apps/api` module imports instead.
- **Tests**: co-locate tests under each package/app's `tests/` directory
  (e.g. `tests/unit/*.test.ts(x)` for TS, `tests/*.rs` for Rust integration
  tests), matching the existing layout — not alongside source files.
- **Dependencies**: prefer the latest stable major of any library already in
  use; don't downgrade or pin to older majors without being asked.
- **MCP / tooling**: never add or suggest ad hoc/"shadow" MCP servers or
  editor tool configs. Use the repository's existing, reviewed tooling only.

## Commands

- Install: `pnpm install --frozen-lockfile`
- Lint / typecheck / test everything: `pnpm turbo run lint typecheck test`
- Rust checks: `cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`
