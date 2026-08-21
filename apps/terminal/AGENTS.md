# Terminal app

Template Tauri 2 shell with a real PTY backend. The Files tab is a real drive-rooted tree.

- Package `@gencore/terminal`, identifier `com.gencore.terminal`, Vite port **5173**
- `AppShell` density `compact`. Center copy must be exactly `Tauri Terminal Template` plus the version from `get_app_info`
- Window chrome goes through `src/modules/ipc/ipc.window.ts` (`getCurrentWindow()`). App info through `ipc.app-info.ts`. PTY through `ipc.pty.ts`. Pinned tabs through `ipc.pinned.ts`. UI never calls `invoke` directly
- Files tab uses `gencore-fs` `list` / `list_drives` / `create_file` / `create_dir` / `watch` / `unwatch` through `src/modules/ipc/ipc.fs.ts`
- Files tab right-click uses the ui-kit ContextMenu (Terminal-owned items: Expand/Collapse, New File, New Folder, Refresh, Copy Path; blank area Refresh + Collapse All). `C:\` expands on load. No new Isolation grants
- Isolation hook allowlist and `capabilities/main.json` stay least-privilege: window close/minimize/toggle-maximize/start-dragging/theme + `gencore-core:allow-get-app-info` + scoped `opener:allow-open-url` for `https://github.com/ATOMANGELETTI/GenCore`
- Isolation also allowlists the six `gencore-fs` commands above, the four `gencore-pty` commands (`open` / `write` / `resize` / `close`), `plugin:gencore-core|load_pinned_tabs` (empty args) and `save_pinned_tabs` (`{ json }`), **and** `plugin:event|listen` / `plugin:event|unlisten` reconstructed only for `gencore-fs://entry-changed` (Any), `gencore-pty://data` (Any), `gencore-pty://exit` (Any), and `tauri://theme-changed` (`{ kind: "Window", label: "main" }`)
- Capabilities grant the matching `gencore-fs:allow-*`, `gencore-pty:allow-open` / `allow-write` / `allow-resize` / `allow-close`, `gencore-core:allow-load-pinned-tabs` / `allow-save-pinned-tabs`, plus `core:window:allow-theme` and `core:event:allow-listen` / `allow-unlisten`
- Config tab (left panel) lists Appearance: Match system, Polar Night, Snow Storm. Preference is `{ version: 1, theme }` in `localStorage` key `gencore.terminal.config`. `system` maps OS dark/null/failure → Polar Night, light → Snow Storm via `getWindowTheme` / `subscribeWindowTheme`. Explicit Polar Night or Snow Storm ignores the OS.
- Still no `stat`, `gencore-pty:default`, Explorer PTY, `core:default`, `opener:default`, `core:event:default`, `core:window:default`, `core:window:allow-set-theme`, or emit
- Repo URL opens through `ipc.opener.ts` (`openRepoInBrowser`)
- `gencore-fs` and `gencore-pty` are registered in Rust. Grant only the six Files-tab `gencore-fs` commands and the four Terminal PTY commands the UI wrappers invoke
- Override density only in `src/modules/app/app.theme.css`. Keep Nord tokens
- Tests: `apps/terminal/tests/` (JS) and `apps/terminal/src-tauri/tests/` (Rust)
- Release packaging is root `pnpm package:win64` (Windows x64 portable ZIP only)
