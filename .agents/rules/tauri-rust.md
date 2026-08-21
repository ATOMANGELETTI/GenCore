---
trigger: glob
globs:
  - "**/src-tauri/**"
  - "crates/**"
description: "Tauri Rust command and plugin conventions"
---

<!-- Generated from .cursor/rules/tauri-rust.mdc by `pnpm sync:agents`. Do not edit. -->


# Tauri Rust

- Commands are `async fn`, return `Result<T, E>` with a typed, serializable error enum —
  never `String` errors and never `.unwrap()`/`.expect()` in command bodies.
- All DTOs use `#[serde(deny_unknown_fields)]` on structs crossing the IPC boundary.
- A plugin crate's Cargo package name **must equal** its Tauri plugin id (e.g. crate
  `gencore-pty` registers as plugin `gencore-pty`, not `tauri-plugin-pty`).
- Plugin `build.rs` declares its command ACL via the `COMMANDS` const so
  `tauri-plugin` codegen produces matching permission files under `permissions/`.
- Capabilities stay least-privilege: only list the exact commands a window's UI calls,
  scoped to `"windows": ["main"]`.
- New commands are stubs (`todo!()`-free, but may return a placeholder `Ok(...)`) until
  the UI actually invokes them — do not pre-grant capabilities for unused commands.
- Errors implement `serde::Serialize` (directly or via `#[derive(Serialize)]` +
  `thiserror::Error`) so the frontend gets a structured error, not a stringified panic.
