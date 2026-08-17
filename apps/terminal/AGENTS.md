# Terminal app

Template Tauri 2 shell — not a working terminal emulator. The Files tab is a real drive-rooted tree.

- Package `@gencore/terminal`, identifier `com.gencore.terminal`, Vite port **5173**
- `AppShell` density `compact`. Center copy must be exactly `Tauri Terminal Template` plus the version from `get_app_info`
- Window chrome goes through `src/modules/ipc/ipc.window.ts` (`getCurrentWindow()`). App info through `ipc.app-info.ts`. UI never calls `invoke` directly
- Files tab uses `gencore-fs` `list` / `list_drives` / `create_file` / `create_dir` / `watch` / `unwatch` through `src/modules/ipc/ipc.fs.ts`
- Isolation hook allowlist and `capabilities/main.json` stay least-privilege: window close/minimize/toggle-maximize/start-dragging + `gencore-core:allow-get-app-info` + scoped `opener:allow-open-url` for `https://github.com/ATOMANGELETTI/GenCore`
- Isolation also allowlists the six `gencore-fs` commands above **and** `plugin:event|listen` / `plugin:event|unlisten` reconstructed only for `gencore-fs://entry-changed`
- Capabilities grant the matching `gencore-fs:allow-*` plus `core:event:allow-listen` / `allow-unlisten`
- Still no `stat`, `gencore-pty`, `core:default`, `opener:default`, `core:event:default`, or emit
- Repo URL opens through `ipc.opener.ts` (`openRepoInBrowser`)
- `gencore-fs` and `gencore-pty` are registered in Rust. Grant only the six Files-tab `gencore-fs` commands. **Do not** grant `gencore-pty` stubs until a real UI calls them
- Override density only in `src/modules/app/app.theme.css`. Keep Nord tokens
- Tests: `apps/terminal/tests/` (JS) and `apps/terminal/src-tauri/tests/` (Rust)
- Release packaging is root `pnpm package:win64` (Windows x64 portable ZIP only)
