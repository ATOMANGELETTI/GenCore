# Shared crates

- `gencore-core` — `get_app_info` and shared error types. Used by both apps
- `crates/gencore-plugin-pty` — package and plugin id **`gencore-pty`**. Stub PTY commands return typed `NotImplemented`. Still no real PTY I/O
- `crates/gencore-plugin-fs` — package and plugin id **`gencore-fs`**. Real `list` / `list_drives` / `create_file` / `create_dir` / `watch` / `unwatch` for Terminal. `stat` still returns typed `NotImplemented`

`tauri-plugin` keys ACL by `CARGO_PKG_NAME`. The runtime plugin id passed to `Builder::new` must be that same string or capabilities can never grant the command.

## Conventions

- Modules: `src/modules/{module}/{module}_api.rs` and `{module}_error.rs`
- Commands are `async`, serde structs use `deny_unknown_fields`, errors are typed (`thiserror`), never raw strings
- `build.rs` `COMMANDS` generates `allow-*` / `deny-*`. Plugin default ACL for pty/fs stays empty; Terminal grants specific `gencore-fs:allow-*` in its capability
- Tests only in each crate’s `tests/`
- Do not implement real PTY I/O unless the user asks — treat that as security-sensitive
