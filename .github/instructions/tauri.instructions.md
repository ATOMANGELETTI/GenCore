---
applyTo: "apps/*/src-tauri/**,crates/**"
---

# Tauri & Rust plugin instructions

- **CSP**: never weaken or remove the Content Security Policy in an app's
  `tauri.conf.json`. Any new remote origin, inline script, or `unsafe-*`
  directive needs an explicit justification in the PR description.
- **Isolation Pattern**: keep the Isolation Pattern secure application
  enabled where already configured; don't bypass it to simplify debugging.
- **Plugin id == package name**: a plugin's Cargo package name must match
  its registered Tauri plugin id (e.g. crate `gencore-pty` in folder
  `crates/gencore-plugin-pty` registers as plugin id `gencore-pty`, not the
  folder name). Keep this pairing consistent in any new plugin.
- **Least privilege capabilities**: only request the capabilities/permissions
  a command actually needs in the app's `capabilities/*.json`. Do not grant
  broad or wildcard permissions to unblock a stub command.
- **Stub plugins stay stubs**: `gencore-plugin-pty` and `gencore-plugin-fs`
  currently implement no real PTY or filesystem I/O. Do not add real I/O to
  either plugin unless a task explicitly asks for it — and if it does, treat
  the change as security-sensitive (see `SECURITY.md`).
- **No `window.__TAURI__`**: always use the typed `@tauri-apps/api` imports
  from the frontend side; never reference the injected global directly.
- Cargo workspace edition is `2024` (set via `workspace.package.edition`);
  match it in new crates rather than pinning an older edition.
- Format and lint before proposing a change is complete:
  `cargo fmt --all -- --check` and `cargo clippy --workspace --all-targets -- -D warnings`.
  Integration tests live under each crate's `tests/` directory.
