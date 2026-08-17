# Terminal File Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Terminal Files tab placeholder with a drive-rooted, Nord-flat, VS Code-style file tree (select-only, inline create, refresh, collapse all, live watch).

**Architecture:** `@gencore/ui-kit` owns presentational Tree/FileIcon/Input. `gencore-fs` owns real Windows I/O. Terminal `file-tree` + `ipc.fs.ts` own state and Isolation-backed IPC. Explorer stays a template. `stat` stays stubbed.

**Tech Stack:** React 19.2, Vite 8, Tauri 2, Tailwind 4, Vitest, Cargo. Crates: `sysinfo` (disk feature only), `dunce`, `notify-debouncer-full` 0.7.x, `tempfile` (dev). JS: `@tanstack/react-virtual` latest stable, existing `lucide-react`.

## Global Constraints

- Latest **stable** only. No beta/rc/canary. **Do not** add `notify` 9 rc or `notify-debouncer-full` 0.8 rc. Use **0.7.x**.
- Official Nord hex only. Flat chrome: 1px separators, no drop shadows/gradients/skeuomorphism.
- Plugin package name **must equal** plugin id: `gencore-fs`. Never add `tauri-plugin-fs` or `tauri-plugin-shell`.
- `{module}.{role}.{ext}`. Tests only under that unit’s `tests/` directory.
- UI talks to Rust only through `apps/terminal/src/modules/ipc/`. Isolation allowlist and `capabilities/main.json` stay in lockstep. Grant only commands the UI invokes. Do not grant `stat`, `gencore-pty`, `core:default`, `opener:default`.
- Do not edit `apps/explorer`.
- Working tree is dirty. Stage **only** the files listed in the task. Never `git add -A`.
- Commits allowed (user approved SDD). Conventional commits. No Cursor/AI attribution trailers.
- Work in place on `main` (running `tauri:dev`). Do not create a worktree or switch branches.
- Copy: Files toolbar label is `FILES`. Tooltips: `New File`, `New Folder`, `Refresh`, `Collapse All`. Do not change the main content heading `Tauri Terminal Template`.

---

## File map

**gencore-fs**

- Modify: `crates/gencore-plugin-fs/src/lib.rs`
- Modify: `crates/gencore-plugin-fs/src/modules/mod.rs`
- Modify: `crates/gencore-plugin-fs/src/modules/list/list_api.rs`
- Modify: `crates/gencore-plugin-fs/src/modules/list/list_error.rs`
- Modify: `crates/gencore-plugin-fs/src/modules/list/mod.rs`
- Modify: `crates/gencore-plugin-fs/src/modules/watch/watch_api.rs`
- Modify: `crates/gencore-plugin-fs/src/modules/watch/watch_error.rs`
- Modify: `crates/gencore-plugin-fs/src/modules/watch/mod.rs`
- Modify: `crates/gencore-plugin-fs/build.rs`
- Modify: `crates/gencore-plugin-fs/Cargo.toml`
- Create: `crates/gencore-plugin-fs/src/modules/list_drives/`
- Create: `crates/gencore-plugin-fs/src/modules/create_file/`
- Create: `crates/gencore-plugin-fs/src/modules/create_dir/`
- Create: `crates/gencore-plugin-fs/src/modules/unwatch/`
- Create: `crates/gencore-plugin-fs/src/modules/path_util/path_util.rs` (shared Windows name + dunce helpers)
- Create/Modify: `crates/gencore-plugin-fs/tests/list_commands.rs`, `create_commands.rs`, `watch_commands.rs`
- Modify: `crates/gencore-plugin-fs/tests/stub_commands.rs` (`stat` still NotImplemented; drop list/watch NotImplemented assertions)

**ui-kit**

- Create: `packages/ui-kit/src/primitives/input/`
- Create: `packages/ui-kit/src/primitives/file-icon/`
- Create: `packages/ui-kit/src/primitives/tree/`
- Modify: `packages/ui-kit/src/primitives/button/button.variants.ts`
- Modify: `packages/ui-kit/src/index.ts`
- Create: `packages/ui-kit/tests/primitives/input/input.test.tsx`
- Create: `packages/ui-kit/tests/primitives/file-icon/file-icon.test.tsx`
- Create: `packages/ui-kit/tests/primitives/tree/tree.test.tsx`
- Modify: `packages/ui-kit/tests/primitives/button.test.tsx`
- Create: `.changeset/terminal-file-tree.md`

**terminal**

- Create: `apps/terminal/src/modules/ipc/ipc.fs.ts`
- Modify: `apps/terminal/src/modules/ipc/ipc.types.ts`
- Create: `apps/terminal/src/modules/file-tree/`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- Modify: `apps/terminal/isolation/isolation.hook.js`
- Modify: `apps/terminal/src-tauri/capabilities/main.json`
- Modify: `apps/terminal/tests/unit/isolation.hook.test.ts`
- Modify: `apps/terminal/tests/unit/side-panel.test.tsx`
- Create: `apps/terminal/tests/unit/file-tree.test.tsx`
- Create: `apps/terminal/tests/unit/ipc.fs.test.ts`
- Modify: `apps/terminal/AGENTS.md`
- Modify: `crates/AGENTS.md`

---

### Task 1: list + list_drives

**Files:**
- Create: `crates/gencore-plugin-fs/src/modules/path_util/mod.rs`, `path_util.rs`
- Create: `crates/gencore-plugin-fs/src/modules/list_drives/{mod.rs,list_drives_api.rs,list_drives_error.rs}`
- Modify: list module, `lib.rs`, `modules/mod.rs`, `build.rs`, `Cargo.toml`
- Test: `crates/gencore-plugin-fs/tests/list_commands.rs`
- Modify: `crates/gencore-plugin-fs/tests/stub_commands.rs` — keep `stat` NotImplemented; remove `list_returns_not_implemented`

**Interfaces:**
- Consumes: nothing from later tasks.
- Produces:
  - `path_util::normalize_path(path: &str) -> String` using `dunce::simplified`
  - `ListArgs { path: String }`
  - `FsKind`: `"file" | "dir" | "symlink"` as serde rename
  - `FsEntry { name, path, kind, extension: Option<String>, hidden: bool, system: bool }`
  - `ListResult { entries: Vec<FsEntry> }`
  - `list(args) -> Result<ListResult, ListError>` with variants `NotFound`, `NotADirectory`, `PermissionDenied`, `Io`
  - `DriveKind`: `fixed | removable | network | optical | unknown`
  - `DriveEntry { name, path, kind, label: Option<String> }`
  - `list_drives() -> Result<Vec<DriveEntry>, ListDrivesError>`
  - ACL commands: `list`, `list_drives` (plus existing `stat`, `watch`)

- [ ] **Step 1: Add workspace deps and write failing tests**

In `crates/gencore-plugin-fs/Cargo.toml` add:

```toml
sysinfo = { version = "0.39", default-features = false, features = ["disk"] }
dunce = "1"
tempfile = { version = "3", optional = false }

[dev-dependencies]
tempfile = "3"
```

Put `sysinfo` and `dunce` under `[dependencies]`. `tempfile` only under `[dev-dependencies]`. Resolve the latest **stable** 0.39.x / 1.x / 3.x with `cargo add` in this crate, not hand-edited lockfiles.

Create `crates/gencore-plugin-fs/tests/list_commands.rs` that:

1. Creates a temp dir with `visible.txt`, `.hidden`, and a `sub` directory; calls `list`; asserts folders first, files after, names present, `hidden` true for `.hidden` on Windows (dotfiles may not be FILE_ATTRIBUTE_HIDDEN — also set hidden via `std::os::windows::fs` or accept `name.starts_with('.')` OR attribute; **require** Windows `file_attributes() & 0x2` when the test sets the attribute, and also treat names starting with `.` as `hidden: true` so `.hidden` is dimmed on all listings).
2. `list` of a missing path returns `ListError::NotFound`.
3. `list` of a file path returns `ListError::NotADirectory`.
4. `list_drives` returns at least one entry whose `path` matches `^[A-Za-z]:\\$` (Windows). `name` is the drive letter display (`C:`). `kind` is one of the enum values. Paths must not start with `\\?\`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test -p gencore-fs --test list_commands`

Expected: FAIL (new types/commands missing).

- [ ] **Step 3: Implement list, list_drives, path_util**

`FsEntry` / `ListResult` / `DriveEntry` use `#[serde(deny_unknown_fields)]` on args only; results may omit deny_unknown_fields.

`list` uses `std::fs::read_dir`. Follow directory metadata; if symlink, `kind = symlink`. Sort: directories (and symlink-to-dir) first, then files, `to_lowercase` name.

`hidden`: `(attrs & 0x2) != 0` on Windows OR name starts with `.`.
`system`: Windows `(attrs & 0x4) != 0`, else false.

`list_drives`: `Disks::new_with_refreshed_list()`, skip mount points that are not `X:\` drive roots (filter `mount_point` with a letter+colon). Map `DiskKind::HDD | SSD` → `fixed`, `Unknown(-1)` removable if `is_removable()`, optical if name/fs suggests CD/DVD else `unknown`. Use `disk.name()` as `label` when non-empty. `path` = dunce-simplified mount point with trailing `\`.

Register `list_drives` in `build.rs` `COMMANDS` and `invoke_handler`.

Update crate docs: no longer “all stubs”.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p gencore-fs`
Run: `cargo clippy -p gencore-fs --all-targets -- -D warnings`

Expected: PASS. `stat` and `watch` still NotImplemented until later tasks.

- [ ] **Step 5: Commit**

```
feat(gencore-fs): list directories and system drives
```

---

### Task 2: create_file + create_dir

**Files:**
- Create: `crates/gencore-plugin-fs/src/modules/create_file/{mod.rs,create_file_api.rs,create_file_error.rs}`
- Create: `crates/gencore-plugin-fs/src/modules/create_dir/{mod.rs,create_dir_api.rs,create_dir_error.rs}`
- Modify: `path_util.rs` — `validate_windows_file_name`
- Modify: `lib.rs`, `modules/mod.rs`, `build.rs`
- Test: `crates/gencore-plugin-fs/tests/create_commands.rs`

**Interfaces:**
- Consumes: `path_util::normalize_path`
- Produces:
  - `CreateFileArgs { path: String }` / `create_file -> Result<(), CreateFileError>`
  - `CreateDirArgs { path: String }` / `create_dir -> Result<(), CreateDirError>`
  - Errors: `AlreadyExists`, `InvalidName`, `NotFound`, `PermissionDenied`, `Io`
  - `validate_windows_file_name(name: &str) -> bool` — reject empty, `.`, `..`, `<>:"/\|?*`, trailing space/dot, reserved `CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9]` (case-insensitive, also `CON.txt` form: stem before first `.`)

- [ ] **Step 1: Failing tests** in `create_commands.rs`:
  - create file in temp dir, then list contains it with size-empty (0 bytes)
  - second create → `AlreadyExists`
  - `create_file` path `C:\foo\NUL` or name `foo:bar` / `bad<>.txt` → `InvalidName`
  - `create_dir` then list shows `kind: dir`
  - parent missing → `NotFound`

- [ ] **Step 2:** `cargo test -p gencore-fs --test create_commands` — FAIL

- [ ] **Step 3:** `OpenOptions::create_new(true).write(true)` for files; `create_dir` for folders. Validate **final path component** only.

- [ ] **Step 4:** `cargo test -p gencore-fs` and clippy `-D warnings` — PASS

- [ ] **Step 5: Commit** `feat(gencore-fs): create files and folders`

---

### Task 3: watch + unwatch

**Files:**
- Modify: `watch_api.rs`, `watch_error.rs`, `watch/mod.rs`
- Create: `crates/gencore-plugin-fs/src/modules/unwatch/{mod.rs,unwatch_api.rs,unwatch_error.rs}`
- Modify: `lib.rs` — plugin `setup` with `Mutex<HashMap<String, Debouncer<...>>>` state; `AppHandle` emit
- Modify: `build.rs` — add `unwatch`
- Test: `crates/gencore-plugin-fs/tests/watch_commands.rs`

**Interfaces:**
- Consumes: `path_util::normalize_path`
- Produces:
  - `watch(app, state, WatchArgs { path, recursive }) -> Result<(), WatchError>`
  - `unwatch(state, UnwatchArgs { path }) -> Result<(), UnwatchError>`
  - Event name **exactly** `gencore-fs://entry-changed`
  - Payload `{ "parent": string, "kind": "created" | "deleted" | "modified" | "renamed" }`
  - If `recursive == true`, return `WatchError::RecursiveNotSupported` (UI always sends false)
  - Watching an already-watched path is OK (idempotent)
  - `unwatch` missing path is OK (idempotent)

- [ ] **Step 1:** Failing tests: watch temp dir, create a file, wait up to 3s for event (use `std::sync::mpsc` in a unit that calls the command with a test App if that is too heavy — if Tauri AppHandle cannot be built in crate tests, extract `apply_debounced_events` and test mapping; plus a smoke test that `watch` with `recursive: true` errors). Prefer mapping unit tests plus `watch`/`unwatch` idempotence without a full Tauri app if `AppHandle` is unavailable. Document in the report which approach landed.

- [ ] **Step 2:** FAIL

- [ ] **Step 3:** Depend on `notify-debouncer-full` **0.7** via `cargo add notify-debouncer-full@0.7`. `new_debouncer(Duration::from_millis(250), None, handler)`. `RecursiveMode::NonRecursive`. On events, `app.emit("gencore-fs://entry-changed", payload)`.

- [ ] **Step 4:** tests + clippy PASS

- [ ] **Step 5: Commit** `feat(gencore-fs): watch expanded directories`

---

### Task 4: Input + icon-sm Button

**Files:**
- Create: `packages/ui-kit/src/primitives/input/{input.component.tsx,input.types.ts,input.variants.ts,index.ts}`
- Modify: `button.variants.ts` — add `icon-sm: "size-7 p-0"`
- Modify: `packages/ui-kit/src/index.ts`
- Test: `packages/ui-kit/tests/primitives/input/input.test.tsx`
- Modify: `packages/ui-kit/tests/primitives/button.test.tsx`

**Interfaces:**
- `Input` — `data-slot="input"`, CVA: `h-7 rounded-sm border border-border bg-transparent px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60`. No raw unstyled extra `<input>` elsewhere in this task.
- `Button` size `icon-sm` → `size-7`.

- [ ] **Step 1:** Tests: Input renders textbox; Button `size="icon-sm"` has `size-7` (or `h-7` `w-7`). FAIL
- [ ] **Step 2:** FAIL run `pnpm --filter @gencore/ui-kit exec vitest run tests/primitives/input/input.test.tsx tests/primitives/button.test.tsx`
- [ ] **Step 3:** Implement
- [ ] **Step 4:** PASS
- [ ] **Step 5: Commit** `feat(ui-kit): add Input and icon-sm button size`

---

### Task 5: FileIcon

**Files:**
- Create: `packages/ui-kit/src/primitives/file-icon/file-icon.kinds.ts`
- Create: `packages/ui-kit/src/primitives/file-icon/file-icon.glyphs.tsx`
- Create: `packages/ui-kit/src/primitives/file-icon/file-icon.component.tsx`
- Create: `packages/ui-kit/src/primitives/file-icon/file-icon.types.ts`
- Create: `packages/ui-kit/src/primitives/file-icon/index.ts`
- Modify: `packages/ui-kit/src/index.ts`
- Test: `packages/ui-kit/tests/primitives/file-icon/file-icon.test.tsx`

**Interfaces:**
- `export type FileIconKindId = "drive" | "folder" | "folder-open" | "file" | "ts" | "tsx" | "js" | "jsx" | "json" | "toml" | "yaml" | "xml" | "html" | "css" | "md" | "txt" | "rs" | "py" | "go" | "java" | "c" | "cpp" | "cs" | "sh" | "ps1" | "sql" | "svg" | "image" | "audio" | "video" | "pdf" | "archive" | "exe" | "lock" | "env" | "git" | "docker" | "font" | "log"`
- `resolveFileIconKind({ nodeKind, extension, open }: { nodeKind: "drive" | "folder" | "file"; extension?: string; open?: boolean }): FileIconKindId`
- Folder+open → `folder-open`. Drive ignores extension. File extension map (lowercase, no dot):
  - ts, tsx, js, jsx, mjs, cjs → ts/tsx/js/jsx (mjs/cjs → js)
  - json, jsonc → json
  - yml, yaml → yaml
  - scss, sass → css
  - markdown, md → md
  - h, hpp → cpp
  - png, jpg, jpeg, gif, webp, ico → image
  - mp3, wav, flac, ogg → audio
  - mp4, webm, mov, mkv → video
  - zip, gz, 7z, tar, rar → archive
  - exe, dll, msi → exe
  - gitignore, gitattributes → git
  - dockerfile → docker
  - ttf, otf, woff, woff2 → font
  - log → log
  - env → env
  - lock → lock
  - else → file
- `FileIcon` renders `data-slot="file-icon"` SVG `viewBox="0 0 16 16"`, `className="size-4"`, fills via `nordVar("frost-8")` etc. **No Lucide inside FileIcon.** Distinct path per kind (not all the same rectangle). Flat fills, no filters/shadows/gradients.
- Nord mapping: drive `frost-10`, folder `aurora-13`, ts/tsx `frost-8`, js `aurora-13`, rs `aurora-12`, json `aurora-13`, md `frost-9`, py `frost-7`, image `aurora-15`, generic file `polar-3` (dark) — use token vars so Snow Storm still works (`--nord-*`).

- [ ] **Step 1:** Tests: `resolveFileIconKind` cases above; FileIcon sets `data-kind` attribute to the resolved id.
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** Implement glyphs. Keep each glyph a small filled 16×16 shape; uniqueness > photorealism.
- [ ] **Step 4:** PASS `pnpm --filter @gencore/ui-kit exec vitest run tests/primitives/file-icon/file-icon.test.tsx`
- [ ] **Step 5: Commit** `feat(ui-kit): add Nord file-type icons`

---

### Task 6: Tree primitive

**Files:**
- Create: `packages/ui-kit/src/primitives/tree/{tree.component.tsx,tree.types.ts,tree.variants.ts,index.ts}`
- Modify: `packages/ui-kit/package.json` — `pnpm --filter @gencore/ui-kit add @tanstack/react-virtual` (latest stable)
- Modify: `packages/ui-kit/src/index.ts`
- Test: `packages/ui-kit/tests/primitives/tree/tree.test.tsx`

**Interfaces:**
- `TreeRow = { id: string; depth: number; name: string; expandable: boolean; expanded: boolean; selected: boolean; muted?: boolean }`
- `TreeProps = { rows: TreeRow[]; onSelect(id: string): void; onToggle(id: string): void; renderLeading?: (row: TreeRow) => React.ReactNode; renderName?: (row: TreeRow) => React.ReactNode }`
- Role `tree` / each row `treeitem`, `aria-level={depth+1}`, `aria-expanded` when expandable, `aria-selected`.
- Keyboard on the tree: ArrowDown/Up move selection; ArrowRight expand or move into; ArrowLeft collapse or move to parent; Home/End; Enter selects (same as click).
- Chevron: 8px, rotates 90° in `duration-150`, `motion-reduce:transition-none`.
- Row height 22px. Indent `depth * 16`. Selected `bg-accent`. Muted `opacity-45`. `select-none` on the row chrome; name slot may opt into select.
- Virtualize with `@tanstack/react-virtual` over `rows`.

- [ ] **Step 1:** Tests with two rows (drive expanded, child file): click file calls `onSelect`; click chevron/folder calls `onToggle`; ArrowDown from first selects second. FAIL
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** Implement. Do not import FileIcon here — `renderLeading` only.
- [ ] **Step 4:** PASS
- [ ] **Step 5: Commit** `feat(ui-kit): add virtualized Tree primitive`

---

### Task 7: ipc.fs + Isolation + capabilities

**Files:**
- Create: `apps/terminal/src/modules/ipc/ipc.fs.ts`
- Modify: `apps/terminal/src/modules/ipc/ipc.types.ts`
- Modify: `apps/terminal/isolation/isolation.hook.js`
- Modify: `apps/terminal/src-tauri/capabilities/main.json`
- Modify: `apps/terminal/tests/unit/isolation.hook.test.ts`
- Create: `apps/terminal/tests/unit/ipc.fs.test.ts`

**Interfaces (mirror Rust):**

```ts
export type FsKind = "file" | "dir" | "symlink";
export type DriveKind = "fixed" | "removable" | "network" | "optical" | "unknown";
export interface FsEntry {
  readonly name: string;
  readonly path: string;
  readonly kind: FsKind;
  readonly extension: string | null;
  readonly hidden: boolean;
  readonly system: boolean;
}
export interface DriveEntry {
  readonly name: string;
  readonly path: string;
  readonly kind: DriveKind;
  readonly label: string | null;
}
```

IPC wrappers (only invoke site):

- `listDrives()` → `plugin:gencore-fs|list_drives`
- `listDir(path: string)` → `plugin:gencore-fs|list` `{ path }`
- `createFile(path: string)` → `plugin:gencore-fs|create_file`
- `createDir(path: string)` → `plugin:gencore-fs|create_dir`
- `watchDir(path: string)` → `plugin:gencore-fs|watch` `{ path, recursive: false }`
- `unwatchDir(path: string)` → `plugin:gencore-fs|unwatch` `{ path }`
- `subscribeFsChanges(handler: (payload: { parent: string; kind: string }) => void): Promise<() => void>` using `@tauri-apps/api/event` `listen("gencore-fs://entry-changed", ...)`

Isolation: add those six cmds to `ALLOWED_COMMANDS`. New reconstructors:

- `list_drives`: empty args only (same as get_app_info)
- `list`, `create_file`, `create_dir`, `unwatch`: plain object, keys only `path`, `typeof path === "string"`, length 1..32767, no `\0`
- `watch`: keys `path` and `recursive`, `recursive === false`

Reject extra keys. Still throw for `plugin:gencore-fs|stat` and `plugin:gencore-fs|read`.

Capabilities add (strings only, `windows: ["main"]`):

```
gencore-fs:allow-list
gencore-fs:allow-list-drives
gencore-fs:allow-create-file
gencore-fs:allow-create-dir
gencore-fs:allow-watch
gencore-fs:allow-unwatch
```

Update isolation tests: remove `"gencore-fs"` from blanket `FORBIDDEN_TOKENS` (keep `gencore-pty`, `core:default`, `opener:default`). Assert the six commands are in the hook source. Assert `stat` is **not** in hook source. Assert capabilities JSON equals the previous list **plus** those six allow strings (order: after get-app-info, before opener object — or append before opener; pick **append after get-app-info**).

- [ ] **Step 1:** Tests first (isolation + ipc.fs mock invoke)
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** Implement hook + capabilities + wrappers
- [ ] **Step 4:** `pnpm --filter @gencore/terminal exec vitest run tests/unit/isolation.hook.test.ts tests/unit/ipc.fs.test.ts` PASS
- [ ] **Step 5: Commit** `feat(terminal): grant scoped gencore-fs IPC for the file tree`

---

### Task 8: File tree UI + SidePanel

**Files:**
- Create: `apps/terminal/src/modules/file-tree/file-tree.types.ts`
- Create: `apps/terminal/src/modules/file-tree/file-tree.hook.ts`
- Create: `apps/terminal/src/modules/file-tree/file-tree.component.tsx`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- Modify: `apps/terminal/tests/unit/side-panel.test.tsx`
- Create: `apps/terminal/tests/unit/file-tree.test.tsx`

**UI (Option A):**

- Toolbar `h-7` `border-b border-border` `px-2` `flex items-center justify-between` `select-none`
- Left: `span` `text-[10px] font-semibold uppercase tracking-wide text-muted-foreground` text `FILES`
- Right: four `Button variant="ghost" size="icon-sm"` with Lucide `FilePlus`, `FolderPlus`, `RefreshCw`, `FoldVertical`, each wrapped in Tooltip (`New File`, …)
- Add File/Folder `disabled` when `selectedId == null`
- Refresh: `animate-spin` on the icon while a refresh promise is in flight; `motion-reduce:animate-none`
- Tree fills remaining height (`min-h-0 flex-1 overflow-hidden`)
- Drive row name is `C:` (from `DriveEntry.name`); `label` as muted suffix when present
- Inline create: extra row at the insert index with `Input` autofocus; Enter/blur-with-value commits; Escape cancels; error string under the input (`text-destructive text-[10px]`)
- Files tab panel: do **not** center placeholder. Assistant/Settings keep Tab 2 / Tab 3 placeholders.
- Side panel files `tabpanel` content must still **not** have class `flex` on the tabpanel element itself (existing test). Put flex layout on an inner wrapper.

Hook behavior:

- On mount: `listDrives()`, `subscribeFsChanges`
- Expand: `listDir`, then `watchDir`
- Collapse: `unwatchDir` (keep children cached optional; must not show them)
- Refresh: reload drives + all expanded dirs
- Collapse all: every folder `expanded=false`; drives remain
- Watch event: if `parent` is expanded, `listDir(parent)`

Tests (mock `ipc.fs` module):

- Renders `FILES` and four labeled buttons
- Mocks drives `C:\` and `D:\`; both names visible
- Expand C: shows mocked children
- Hidden child has `opacity-45` (or `data-muted`)
- New File disabled until a row is selected
- After selecting a folder, New File shows an input; typing `a.txt` + Enter calls `createFile` with the joined path
- Placeholder `Tab 1` is **gone**. `Tab 2`/`Tab 3` remain for other tabs.

- [ ] **Step 1:** Tests FAIL
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** Implement. Beautiful, tight spacing, Nord only. No new hex.
- [ ] **Step 4:** `pnpm --filter @gencore/terminal exec vitest run tests/unit/file-tree.test.tsx tests/unit/side-panel.test.tsx` PASS
- [ ] **Step 5: Commit** `feat(terminal): add Files-tab drive tree`

---

### Task 9: Docs, changeset, verify

**Files:**
- Modify: `apps/terminal/AGENTS.md` — Files tab uses `gencore-fs` list/list_drives/create/watch; Isolation must allow those commands; still no pty grants
- Modify: `crates/AGENTS.md` — `gencore-fs` implements real list/create/watch for Terminal; `stat` still stub; still no real PTY
- Create: `.changeset/terminal-file-tree.md`

```
---
"@gencore/ui-kit": minor
---

feat: Tree, FileIcon, and Input for the Terminal file tree
```

(Do not changeset private apps.)

- [ ] **Step 1:** Write docs + changeset
- [ ] **Step 2:** Run:

```
pnpm --filter @gencore/ui-kit test
pnpm --filter @gencore/ui-kit typecheck
pnpm --filter @gencore/ui-kit lint
pnpm --filter @gencore/terminal test
pnpm --filter @gencore/terminal typecheck
pnpm --filter @gencore/terminal lint
cargo test -p gencore-fs
cargo clippy -p gencore-fs --all-targets -- -D warnings
```

Expected: all pass. If ui-kit lint fails only on pre-existing `globals.css` wrap, record it and do not “fix” unrelated files.

- [ ] **Step 3: Commit** `docs: file-tree agent notes and ui-kit changeset`

---

## Self-review

- Spec coverage: drives, list, create, watch, Option A toolbar, inline create, dim hidden, virtualization, Isolation, no Explorer — each has a task.
- No TBD placeholders.
- Types: `FsEntry`, `DriveEntry`, event `gencore-fs://entry-changed` used consistently in Tasks 1, 3, 7, 8.
