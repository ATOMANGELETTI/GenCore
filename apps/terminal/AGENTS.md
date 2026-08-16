# Terminal app

Template Tauri 2 shell — not a working terminal emulator.

- Package `@gencore/terminal`, identifier `com.gencore.terminal`, Vite port **5173**
- `AppShell` density `compact`. Center copy must be exactly `Tauri Terminal Template` plus the version from `get_app_info`
- Window chrome goes through `src/modules/ipc/ipc.window.ts` (`getCurrentWindow()`). App info through `ipc.app-info.ts`. UI never calls `invoke` directly
- Isolation hook allowlist and `capabilities/main.json` stay least-privilege: window close/minimize/toggle-maximize/start-dragging + `gencore-core:allow-get-app-info`
- `gencore-pty` is registered in Rust. **Do not** grant its stub commands in capabilities until a real UI calls them
- Override density only in `src/modules/app/app.theme.css`. Keep Nord tokens
- Tests: `apps/terminal/tests/` (JS) and `apps/terminal/src-tauri/tests/` (Rust)
