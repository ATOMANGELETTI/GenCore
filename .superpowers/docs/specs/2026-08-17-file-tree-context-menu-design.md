# Files-tab tree context menu and default C: expand

Date: 2026-08-17
Status: approved
Packages: `@gencore/terminal`, `@gencore/ui-kit`

## Problem

The Files tab tree has toolbar create/refresh/collapse, but no row-scoped right-click menu. Right-click does nothing useful (the shell suppresses the native menu). `C:\` starts collapsed, so the first view is only drive letters.

This supersedes the 2026-08-16 file-tree spec non-goal “context menus” for the Terminal Files tab only. Rename, delete, cut/copy files, and Reveal in Explorer stay out of scope.

## Goals

- Right-click a drive, folder, or file in the Files tree to open a Nord-flat ui-kit `ContextMenu`.
- Right-click selects that row so later toolbar New File/Folder use the same target.
- Folder/drive items: Expand or Collapse (one label from `expanded`), New File, New Folder, Refresh (that folder), Copy Path.
- File items: New File and New Folder as siblings, Refresh (parent folder), Copy Path.
- Blank area under the last row: Refresh (whole tree) and Collapse All only.
- New File/Folder still use the existing inline name field. Create in the right-clicked folder (child of folder/drive, sibling of file).
- Copy Path writes the full Windows path (`node.path`) via `navigator.clipboard.writeText`. No new Tauri clipboard plugin or capability.
- After `listDrives()`, expand and watch `C:\` if that drive exists. Do not auto-expand other drives. Do not auto-select `C:` (toolbar create stays disabled until a row is selected).
- Same wrap pattern as titlebar/content: one `ContextMenu` + `ContextMenuTrigger` around the tree viewport. Terminal owns the item tree. AppShell slots stay titlebar/content only.

## Non-goals

Rename, delete, cut/copy/paste files, Reveal in Explorer, submenus, shortcuts, toasts, Explorer app, new `gencore-fs` commands, Isolation/capability changes, `stat`, `gencore-pty`, `window.__TAURI__`.

## Approach

Three layers. The kit never talks to Tauri.

1. `@gencore/ui-kit` `Tree` — add `data-id={row.id}` on each `data-slot="tree-row"`. No ContextMenu inside the kit. Tree still does not forward a ref; the app wraps the height-fill div.
2. Terminal `context-menu.file-tree.tsx` — presentational items, same style as `context-menu.titlebar.tsx`.
3. Terminal `file-tree` — resolve the right-click target, select the row, call hook helpers. `copyText` lives next to the existing clipboard helpers.

## Units

### Tree `data-id` (ui-kit)

- **Does:** Put `data-id={row.id}` on each treeitem.
- **Use:** FileTree `closest("[data-slot='tree-row']")` to know which row was right-clicked.
- **Depends on:** existing `TreeRow.id`.

### `copyText` (terminal clipboard helper)

- **Does:** `navigator.clipboard.writeText(text)` → `Promise<boolean>`. Missing API or throw → `false`.
- **Use:** Copy Path.
- **Depends on:** browser clipboard only.

### `FileTreeContextMenu` (terminal)

- **Does:** Render items for `kind`: `"drive" | "dir" | "file" | "blank"`.
- **Use:** As the `ContextMenu` content child of FileTree.
- **Depends on:** ui-kit `ContextMenuContent`, `ContextMenuItem`, `ContextMenuSeparator`.

### File-tree hook

- **Does:** Auto-expand `C:\` after drives load; `startCreate(kind, targetPath?)`; `refreshPath(path)` (folder/drive → that listing, collapsed → `expand()`; file → parent).
- **Use:** FileTree toolbar and context menu.
- **Depends on:** existing `listDir` / `watchDir` / create IPC.

## Data flow

1. Mount → `listDrives()` → if `C:\` exists → `expand("C:\\")` (list + watch).
2. `contextmenu` on the tree wrapper → if a `data-id` row (not the create draft) → `onSelect(id)` and remember target; create-draft row uses draft `parentPath`; otherwise blank.
3. Menu item → `expand` / `collapse` / `startCreate` / `refresh` / `refreshPath` / `collapseAll` / `copyText(path)`.
4. Create still inserts the inline draft row; Enter/Escape/blur unchanged.

## Error handling

- Copy Path / row Refresh / auto-expand C: fail quietly. Keep the last good tree. No toasts.
- Create still shows the inline name-field error.
- Missing C: → drives listed, all collapsed.

## Security

No new IPC. Isolation and capabilities unchanged. Clipboard write is the same WebView API family as content-menu paste. ui-kit still has no `@tauri-apps/*`. Explorer unchanged.

## Testing

- ui-kit: treeitems expose `data-id` equal to `row.id`.
- Terminal: `copyText` writes or returns false; FileTreeContextMenu item sets by kind; FileTree auto-expands C: not D:; folder vs file vs blank menus; New File from a folder menu creates under that folder; Copy Path writes `node.path`.
- Existing toolbar tests updated so they do not click C: to expand (that click now collapses).

## Constraints

- Official Nord hex only. Flat chrome. Existing menu CVA (no extra shadow/animation).
- `{module}.{role}.{ext}`. Tests only under `tests/`.
- UI talks to Rust only through `src/modules/ipc/`.
- Work in place on `main` (running `tauri:dev`). Do not create a worktree or switch branches.
- Stage only task files. Never `git add -A`.
- Conventional commits. No Cursor/AI attribution trailers.
- Do not edit Explorer, Isolation, capabilities, or `gencore-fs`.
