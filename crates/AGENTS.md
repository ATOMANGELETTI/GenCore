# Shared crates

- `gencore-core` — `get_app_info`, pinned-tab load/save, tray actions, and `get_system_telemetry` (Terminal grants the telemetry command; Explorer does not).
- `crates/gencore-plugin-pty` — package and plugin id **`gencore-pty`**. Real ConPTY sessions via `portable-pty`. Terminal Isolation grants `open` / `write` / `resize` / `close`. Explorer still has no PTY
- `crates/gencore-plugin-fs` — package and plugin id **`gencore-fs`**. Real `list` / `list_drives` / `create_file` / `create_dir` / `watch` / `unwatch` for Terminal. `stat` still returns typed `NotImplemented`
- `crates/gencore-plugin-assistant` — package and plugin id **`gencore-assistant`**. Gemini Developer API assistant for the Terminal side panel: portable SQLite (`gencore-assistant.sqlite` under `GENCORE_DATA_DIR` or `{exe_parent}/data/`) stores conversations, messages, and tool calls; the Gemini API key is Windows-DPAPI-protected and never returned to the WebView (`get_agent_settings` returns only `{ model, context_lines, has_api_key }`). Tool calls are propose-and-confirm: `pty_write`, `switch_tab`, and `reveal_in_files` are proposed by Gemini and only run after the user approves, with `pty_write`'s `session_id` always taken from the conversation's latest snapshot, never from the model. No file create/read agent tools yet (wait for Explorer). Default plugin ACL is empty; Terminal's capability grants the twelve `gencore-assistant:allow-*` commands it invokes

`tauri-plugin` keys ACL by `CARGO_PKG_NAME`. The runtime plugin id passed to `Builder::new` must be that same string or capabilities can never grant the command.

## Conventions

- Modules: `src/modules/{module}/{module}_api.rs` and `{module}_error.rs`
- Commands are `async`, serde structs use `deny_unknown_fields`, errors are typed (`thiserror`), never raw strings
- `build.rs` `COMMANDS` generates `allow-*` / `deny-*`. Plugin default ACL for pty/fs stays empty; Terminal grants specific `gencore-fs:allow-*` and `gencore-pty:allow-*` in its capability
- Tests only in each crate’s `tests/`
