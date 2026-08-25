---
name: add-crate-module
description: Adds a new module (command + error type) to an existing Rust crate, wired into its build.rs command ACL, with tests. Use when the user asks to add a Tauri command, module, or capability-backed feature to a crate under crates/**.
---

# Add crate module

Use this when adding a new module to `crates/gencore-core`, `crates/gencore-plugin-pty`,
`crates/gencore-plugin-fs`, or `crates/gencore-plugin-assistant`.

## Steps

1. Create `src/modules/{module}/{module}_api.rs` with one or more `#[tauri::command]`
   `async fn`s. Return `Result<T, {Module}Error>`.
2. Create `src/modules/{module}/{module}_error.rs` with a typed error enum deriving
   `serde::Serialize` (and `thiserror::Error` for `Display`). No stringly-typed errors.
3. Register the new module in the crate's `lib.rs` (`mod modules { mod {module}; }` or
   equivalent) and add its commands to the plugin's `invoke_handler` list.
4. Update `build.rs`'s `COMMANDS` const to include the new command name(s) so the
   generated permission files match.
5. Decide stub vs. real: if the UI doesn't call this command yet, implement it as a
   real (not `todo!()`) but minimal handler — do not grant it in any app's capabilities
   until the UI actually invokes it (see the security baseline in the root `AGENTS.md`).
6. Add integration tests under `crates/{crate}/tests/{module}_test.rs`.
7. Run `cargo check -p {crate-name}`, `cargo test -p {crate-name}`, and
   `cargo clippy -p {crate-name}` before finishing.

## Constraints

- Plugin package name must equal its plugin id (`gencore-pty`, `gencore-fs`,
  `gencore-assistant`) — never `tauri-plugin-*`.
- `#[serde(deny_unknown_fields)]` on any struct crossing the IPC boundary.
