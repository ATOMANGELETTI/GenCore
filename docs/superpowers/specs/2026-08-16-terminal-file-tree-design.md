# Terminal Files-tab file tree

Date: 2026-08-16
Status: approved
Packages: `@gencore/terminal`, `@gencore/ui-kit`, crate `gencore-fs`

## Problem

The Terminal left panel Files tab (folder icon, Tab 1) is a placeholder. Users need a VS Code-style file tree that starts at every ready system drive (`C:\`, `D:\`, …), with Nord-flat file-type icons, inline create, refresh, collapse-all, and live updates for expanded folders.

## Goals

- Files tab shows a drive-rooted tree. Click folder/drive to expand or collapse. Click file to select only (no open/preview/edit).
- Toolbar Option A: uppercase `FILES` label left; ghost icon actions right: New File, New Folder, Refresh, Collapse All.
- Inline create: name field where the new row’s name would be. Enter commits, Escape cancels.
- Parent: selected folder/drive → child; selected file → sibling. Add buttons disabled until something is selected.
- Show all entries including hidden/system; dim those rows (~45% opacity).
- Refresh reloads drives and every expanded folder. Collapse All closes folders; drive roots stay.
- Watch each expanded folder (non-recursive) so the tree updates live.
- Custom Nord 16×16 flat SVGs in `@gencore/ui-kit` for a recommended developer set (~50–70 mappings, fewer unique glyphs). Unknown extensions use a generic file glyph.
- Toolbar chrome uses Lucide (`FilePlus`, `FolderPlus`, `RefreshCw`, `FoldVertical`) to match the tab bar.
- Virtualized rows so huge folders do not freeze the UI.

## Non-goals

Open/preview/edit, rename, delete, drag-drop, multi-select, context menus, search, git decorations, Explorer app, `stat`, `gencore-pty`, `tauri-plugin-fs`, `tauri-plugin-shell`, reveal-in-Explorer, Recycle Bin.

## Approach

Three layers. The kit never talks to Tauri. The plugin never knows about React. Terminal owns Files-tab behavior.

1. `@gencore/ui-kit` — presentational `Tree`, `FileIcon`, compact `Input`, `icon-sm` Button.
2. `gencore-fs` — real Windows I/O: `list_drives`, `list`, `create_file`, `create_dir`, `watch`, `unwatch`. `stat` stays stubbed and ungranted.
3. Terminal `file-tree` module + `ipc.fs.ts`. Isolation and capabilities grant only those six commands.

## Units

### FileIcon (ui-kit)

- **Does:** Resolve kind from `{ kind: "drive" | "folder" | "file", extension?, open? }` and render a Nord-flat SVG.
- **Use:** Tree rows and inline-create row.
- **Depends on:** Nord tokens only (`nordVar`). No Tauri.

### Tree (ui-kit)

- **Does:** Virtualized presentational tree: indent, chevron, selection, keyboard (arrows, Home/End, Enter), expand/collapse animation with `motion-reduce`.
- **Use:** Terminal file-tree passes a flattened visible-row model.
- **Depends on:** `@tanstack/react-virtual` (latest stable), Button/FileIcon as children via slots/render props — Tree does not import FileIcon if that couples kinds; rows are render props.

### Input (ui-kit)

- **Does:** Compact text field for the inline name. Nord, flat, `h-7`.
- **Use:** Inline create (and future rename).

### gencore-fs commands

- `list_drives` → `DriveEntry[]` via `sysinfo::Disks` (`disk` feature only). Skip empty/not-ready mounts. Paths through `dunce`.
- `list({ path })` → `{ entries: FsEntry[] }`. Folders first, then files, case-insensitive. `hidden`/`system` from `MetadataExt::file_attributes()`.
- `create_file` / `create_dir` → `create_new`; typed errors for exists, illegal Windows names, permission, not found.
- `watch` / `unwatch` → `notify-debouncer-full` 0.7.x, `RecursiveMode::NonRecursive`. Emit `gencore-fs://entry-changed` `{ parent, kind }`.

### Terminal file-tree

- **Does:** Load drives, expand/list, selection, inline create, refresh, collapse, subscribe/unsubscribe watches.
- **Use:** Files tab in `SidePanel`.
- **Depends on:** ui-kit primitives + `ipc.fs.ts` only.

## Data flow

1. Mount Files tab → `listDrives()`.
2. Expand → `list(path)` then `watch({ path, recursive: false })`.
3. Collapse → `unwatch(path)`.
4. Watch event for `parent` → re-`list(parent)` if that node is expanded.
5. Refresh → `listDrives()` + re-list every expanded path.
6. Create → insert draft row; on commit call `create_file`/`create_dir`.

## Security

Privilege expansion: read the tree and create files anywhere the OS user can. Isolation reconstructs FS payloads (string `path`, optional `recursive: false`); it must not reuse the window-label reconstructor. Explorer grants nothing. `stat` and `gencore-pty` stay ungranted. No `core:default`, `opener:default`, `fs:default`.

## Testing

- ui-kit: FileIcon resolver, Tree keyboard, Input, `icon-sm`.
- `gencore-fs`: list temp dir, list_drives on Windows, create/collision/illegal name, watch create+delete.
- Terminal: mocked IPC hook tests; isolation allow/deny; capabilities match UI.
- Manual: drives, expand `C:\`, dim hidden, inline create, refresh, collapse, live update, reduced motion.

## Constraints

- Latest **stable** only. `notify-debouncer-full` **0.7.x**, not 0.8 rc / notify 9 rc.
- Official Nord hex only. Flat chrome: no shadows, no gradients.
- `{module}.{role}.{ext}`. Tests only under each unit’s `tests/`.
- UI talks to Rust only through `src/modules/ipc/`.
- Work in place on `main` (running `tauri:dev`). Stage only task files.
- Commits allowed (user approved SDD). Conventional commits, no AI attribution.
- Do not edit Explorer.
