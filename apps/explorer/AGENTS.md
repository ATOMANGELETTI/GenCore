# Explorer app

Template Tauri 2 shell — not a working file manager.

- Package `@gencore/explorer`, identifier `com.gencore.explorer`, Vite port **5174**
- `AppShell` density `comfortable`. Center copy must be exactly `Tauri Explorer Template` plus the version from `get_app_info`
- Window chrome goes through `src/modules/ipc/ipc.window.ts` (`getCurrentWindow()`). App info through `ipc.app-info.ts`. UI never calls `invoke` directly
- Isolation hook allowlist and `capabilities/main.json` stay least-privilege: window close/minimize/toggle-maximize/start-dragging + `gencore-core:allow-get-app-info`
- `gencore-fs` is registered in Rust. **Do not** grant its stub commands in capabilities until a real UI calls them
- Override density only in `src/modules/app/app.theme.css`. Keep Nord tokens
- Tests: `apps/explorer/tests/` (JS) and `apps/explorer/src-tauri/tests/` (Rust)
