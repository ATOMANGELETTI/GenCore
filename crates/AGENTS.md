# Shared crates

- `gencore-core` — `get_app_info` and shared error types. Used by both apps
- `crates/gencore-plugin-pty` — package and plugin id **`gencore-pty`**. Stub PTY commands return typed `NotImplemented`
- `crates/gencore-plugin-fs` — package and plugin id **`gencore-fs`**. Stub FS commands return typed `NotImplemented`

`tauri-plugin` keys ACL by `CARGO_PKG_NAME`. The runtime plugin id passed to `Builder::new` must be that same string or capabilities can never grant the command.

## Conventions

- Modules: `src/modules/{module}/{module}_api.rs` and `{module}_error.rs`
- Commands are `async`, serde structs use `deny_unknown_fields`, errors are typed (`thiserror`), never raw strings
- `build.rs` `COMMANDS` generates `allow-*` / `deny-*`. Default permissions for pty/fs stay empty until a UI needs them
- Tests only in each crate’s `tests/`
- Do not implement real PTY I/O or filesystem access unless the user asks — treat that as security-sensitive
