# Explorer app

A real Nord file explorer: browse drives/folders, view a sortable file list, create/rename/delete
(Recycle Bin)/copy/cut-paste files and folders, open files with the OS default app. Advanced
features (grid/icon view, favorites, deep search, previews, multi-tab locations, Assistant file
tools) are intentionally out of scope for now.

- Package `@gencore/explorer`, identifier `com.gencore.explorer`, Vite port **5174**
- `AppShell` density `comfortable`. Titlebar copy stays exactly `Tauri Explorer Template` plus the
  version from `get_app_info` (same convention as Terminal's titlebar — not the app's real name).
  The body is the real file explorer, not a placeholder
- Window chrome goes through `src/modules/ipc/ipc.window.ts` (`getCurrentWindow()`). App info
  through `ipc.app-info.ts`. Filesystem through `ipc.fs.ts`. Opening files/URLs through
  `ipc.opener.ts`. UI never calls `invoke` directly
- Layout: `AppShell` sidebar = `SidePanel` (Tree / Details / Config tabs, same resize/tab-strip
  mechanics as Terminal's side panel but explorer-local content), main content = `FileList`
  (toolbar with back/forward/up/breadcrumb-address-bar/refresh/new-folder/filter, sortable
  Name/Size/Type/Date-modified table, virtualized via `@tanstack/react-virtual`)
- `gencore-fs` commands granted: `list`, `list_drives`, `stat`, `create_file`, `create_dir`,
  `rename`, `delete`, `copy`, `move_paths`, `watch`, `unwatch`. `rename`/`copy`/`move_paths` use
  `#[tauri::command(rename_all = "snake_case")]` on the Rust side — the JS wrappers send literal
  `new_name`/`destination_dir` keys
- `delete` moves to the Recycle Bin (via the `trash` crate), never permanent. `copy`/`move_paths`
  auto-suffix name collisions (`name (2)`, `name (3)`, …) instead of overwriting
- The in-app clipboard (cut/copy/paste) is **app-internal only** (`file-ops.hook.ts`), not the OS
  clipboard — OS clipboard file interop is a later "advanced feature"
- Isolation hook allowlist and `capabilities/main.json` stay least-privilege: window
  close/minimize/toggle-maximize/start-dragging/theme, `gencore-core:allow-get-app-info` /
  `allow-set-theme-icon` / `allow-tray-action` (tray-menu window only), the `gencore-fs:allow-*`
  commands above, `opener:allow-open-path` (unscoped — the app already grants unrestricted
  filesystem access, so scoping file-open would be inconsistent), and scoped
  `opener:allow-open-url` for `https://github.com/ATOMANGELETTI/GenCore`
- Isolation also allowlists `plugin:event|listen` / `plugin:event|unlisten` reconstructed only for
  `tauri://theme-changed` (`{ kind: "Window", label: "main" | "tray-menu" }`) and
  `gencore-fs://entry-changed` (`{ kind: "Any" }`)
- OS appearance maps dark → Polar Night, light → Snow Storm, IPC failure/null → Polar Night by
  default (`themePreference: "system"`). Window theme IPC is `getWindowTheme` /
  `subscribeWindowTheme` in `ipc.window.ts`
- Config tab has a top icon sub-tab toolbar (`config.toolbar.tsx`, same tablist + overflow "All
  Settings" pattern as Terminal's) switching between General and Appearance categories. General
  holds `showHiddenFiles`, `showFileExtensions`, `confirmBeforeDelete`, and `fileSizeFormat`
  (Binary KiB/MiB vs Decimal KB/MB, used by the Size column and Details panel). Appearance holds
  `themePreference` (Polar Night / Snow Storm / Match system — an explicit override on top of the
  OS-appearance default, same picker as Terminal's Config tab). All settings persist to
  `localStorage` under `gencore.explorer.config`; the active sub-tab persists under
  `gencore.explorer.config.active-subview`. No native theme/settings dialog
- Repo URL opens through `ipc.opener.ts` (`openRepoInBrowser`)
- Override density only in `src/modules/app/app.theme.css`. Keep Nord tokens
- Tests: `apps/explorer/tests/` (JS) and `apps/explorer/src-tauri/tests/` (Rust, plus
  `crates/gencore-plugin-fs/tests/` for the filesystem commands themselves)
- Release packaging is root `pnpm package:win64` (Windows x64 portable ZIP only)
