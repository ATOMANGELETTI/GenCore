# Terminal Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a real xterm.js + portable-pty terminal in the Terminal app’s right pane, with pill tabs (create/close/rename/pin), pinned-tab persistence, and a bundled Oh My Posh capsule prompt that follows Polar Night / Snow Storm.

**Architecture:** `gencore-pty` owns ConPTY sessions and emits `gencore-pty://data` (base64) / `gencore-pty://exit`. `gencore-core` reads/writes `{app_data_dir}/pinned-tabs.json` only. Terminal Isolation + `ipc.pty.ts` / `ipc.pinned.ts` are the only JS IPC. The right `ContentArea` hosts a nord1 pill tab strip and xterm. Oh My Posh exe is fetched (not git-tracked); themes and `gencore-prompt.ps1` are committed. Explorer is unchanged.

**Tech Stack:** React 19.2, Vite 8, Tauri 2, Tailwind 4, Vitest, `@xterm/xterm` + `@xterm/addon-fit` + `@xterm/addon-serialize` + `@xterm/addon-webgl` (latest **stable**), `portable-pty`, `uuid` (v4), `base64`. Oh My Posh latest stable Windows amd64.

**Spec:** `.superpowers/docs/specs/2026-08-20-terminal-window-design.md`

## Global Constraints

- Latest **stable** only. No beta/rc/canary.
- Official Nord hex only (`nord0`–`nord15`). Flat chrome: 1px separators, no drop shadows/gradients on chrome.
- Plugin package name **must equal** plugin id: `gencore-pty`. Never add `tauri-plugin-pty` or `tauri-plugin-shell`.
- `{module}.{role}.{ext}`. Tests only under that unit’s `tests/` directory. No colocated `*.test.ts`.
- UI talks to Rust only through `apps/terminal/src/modules/ipc/`. Isolation and `capabilities/main.json` stay in lockstep.
- `windows: ["main"]` only. No `core:default`, `gencore-pty:default`, `opener:default`, `core:event:default`, `plugin:event|emit`, `window.__TAURI__`.
- Do not grant Explorer any PTY or pinned-tab commands. Do not implement `stat`.
- Titlebar copy stays `Tauri Terminal Template` plus `get_app_info` version. Do not show version in the statusbar.
- Shell: system `pwsh` if on PATH, else `powershell.exe`. Do **not** bundle PowerShell 7. UI must **not** pass a shell path.
- `OpenArgs.theme` is only `"polar-night"` or `"snow-storm"` (optional; default polar-night). Isolation reconstructs that enum; it never accepts a filesystem path for the theme or omp.exe.
- `.gitattributes` does **not** LFS `*.exe`. Fetch `oh-my-posh.exe` into a **gitignored** resource path. Commit themes + `gencore-prompt.ps1` only.
- Chrome font stays `"Terminess Nerd Font"`. xterm uses `"Terminess Nerd Font Mono"` only. Do not rebind `--font-sans` or `--font-mono`.
- CSP `font-src` stays `'self'`. No web-links addon (opener is GitHub-only).
- Patch changeset for `@gencore/ui-kit` (Mono font) only. Terminal is private — no app changeset.
- Stage **only** the files listed in the task. Never `git add -A`.
- Conventional commits. No Cursor/AI attribution trailers.
- Work in place on the current branch. Do not create a worktree unless asked.
- Do not bump major versions.
- Superpowers files stay under `.superpowers/docs/`. Do not write `docs/superpowers/`.
- Commit steps are for implementation sessions after the user approves execution. If commits are not approved, skip the Commit step and leave the tree dirty.

---

## File map

**ui-kit**

- Create: `packages/ui-kit/src/assets/fonts/nerdfonts/terminus/TerminessNerdFontMono-Regular.ttf` (Git LFS, like the other TTFs)
- Create: `packages/ui-kit/src/assets/fonts/nerdfonts/terminus/TerminessNerdFontMono-Bold.ttf` (optional but preferred)
- Modify: `packages/ui-kit/src/styles/fonts.css`
- Modify: `packages/ui-kit/tests/styles/fonts.test.ts`
- Create: `.changeset/terminess-nerd-font-mono.md`

**gencore-core**

- Create: `crates/gencore-core/src/modules/pinned_store/pinned_store_api.rs`
- Create: `crates/gencore-core/src/modules/pinned_store/pinned_store_error.rs`
- Create: `crates/gencore-core/src/modules/pinned_store/mod.rs`
- Modify: `crates/gencore-core/src/modules/mod.rs`
- Modify: `crates/gencore-core/src/modules/error/error_error.rs`
- Modify: `crates/gencore-core/src/lib.rs`
- Modify: `crates/gencore-core/build.rs`
- Create: `crates/gencore-core/tests/pinned_store.rs`

**gencore-pty**

- Modify: `crates/gencore-plugin-pty/Cargo.toml` (via `cargo add`)
- Modify: `crates/gencore-plugin-pty/src/lib.rs`
- Modify: `crates/gencore-plugin-pty/src/modules/session/session_api.rs`
- Modify: `crates/gencore-plugin-pty/src/modules/session/session_error.rs`
- Modify: `crates/gencore-plugin-pty/src/modules/session/mod.rs`
- Modify: `crates/gencore-plugin-pty/src/modules/io/io_api.rs`
- Modify: `crates/gencore-plugin-pty/src/modules/io/io_error.rs`
- Modify: `crates/gencore-plugin-pty/src/modules/resize/resize_api.rs`
- Modify: `crates/gencore-plugin-pty/src/modules/resize/resize_error.rs`
- Create: `crates/gencore-plugin-pty/src/modules/session/session_map.rs`
- Create: `crates/gencore-plugin-pty/src/modules/session/session_shell.rs`
- Modify: `crates/gencore-plugin-pty/tests/stub_commands.rs` (replace NotImplemented tests; keep deny_unknown_fields)
- Create: `crates/gencore-plugin-pty/tests/session_commands.rs`

**terminal app**

- Create: `apps/terminal/src/modules/ipc/ipc.pty.ts`
- Create: `apps/terminal/src/modules/ipc/ipc.pinned.ts`
- Modify: `apps/terminal/src/modules/ipc/ipc.types.ts`
- Create: `apps/terminal/src/modules/terminal/terminal.types.ts`
- Create: `apps/terminal/src/modules/terminal/terminal.theme.ts`
- Create: `apps/terminal/src/modules/terminal/terminal.xterm.ts`
- Create: `apps/terminal/src/modules/terminal/terminal.osc7.ts`
- Create: `apps/terminal/src/modules/terminal/terminal.hook.ts`
- Create: `apps/terminal/src/modules/terminal/terminal.component.tsx`
- Create: `apps/terminal/src/modules/context-menu/context-menu.terminal.tsx`
- Modify: `apps/terminal/src/modules/app/app.component.tsx`
- Modify: `apps/terminal/isolation/isolation.hook.js`
- Modify: `apps/terminal/src-tauri/capabilities/main.json`
- Modify: `apps/terminal/src-tauri/tauri.conf.json` (`bundle.resources`)
- Create: `apps/terminal/src-tauri/resources/oh-my-posh/gencore-polar-night.omp.json`
- Create: `apps/terminal/src-tauri/resources/oh-my-posh/gencore-snow-storm.omp.json`
- Create: `apps/terminal/src-tauri/resources/oh-my-posh/gencore-prompt.ps1`
- Create: `scripts/fetch-oh-my-posh.ps1`
- Modify: `scripts/package-win64.ps1` (fetch omp before terminal build)
- Modify: `.gitignore` (`apps/terminal/src-tauri/resources/oh-my-posh/oh-my-posh.exe`)
- Modify: `apps/terminal/tests/unit/isolation.hook.test.ts`
- Create: `apps/terminal/tests/unit/terminal.hook.test.ts`
- Create: `apps/terminal/tests/unit/terminal.osc7.test.ts`
- Create: `apps/terminal/tests/unit/terminal.theme.test.ts`
- Modify: `apps/terminal/AGENTS.md`
- Modify: `crates/AGENTS.md`
- Modify: `AGENTS.md` (template line: Terminal now has a real emulator; still no Explorer PTY)

Do not edit `apps/explorer`. Do not add a ui-kit Tabs primitive.

---

### Task 1: Terminess Nerd Font Mono

**Files:**
- Create: `packages/ui-kit/src/assets/fonts/nerdfonts/terminus/TerminessNerdFontMono-Regular.ttf`
- Create: `packages/ui-kit/src/assets/fonts/nerdfonts/terminus/TerminessNerdFontMono-Bold.ttf`
- Modify: `packages/ui-kit/src/styles/fonts.css`
- Modify: `packages/ui-kit/tests/styles/fonts.test.ts`
- Create: `.changeset/terminess-nerd-font-mono.md`

**Interfaces:**
- Consumes: existing Terminess (non-Mono) `@font-face` rules; OFL README already in that folder
- Produces: additional family name `"Terminess Nerd Font Mono"` (Regular + Bold). `--font-sans` and `--font-mono` **unchanged** (`"Terminess Nerd Font"`).

- [ ] **Step 1: Write the failing font test**

In `packages/ui-kit/tests/styles/fonts.test.ts`, add a third describe (keep the existing two tests exactly):

```ts
const terminessMonoFaces = [
  "../assets/fonts/nerdfonts/terminus/TerminessNerdFontMono-Regular.ttf",
  "../assets/fonts/nerdfonts/terminus/TerminessNerdFontMono-Bold.ttf",
] as const;

describe("fonts.css Mono cut", () => {
  it("registers Terminess Nerd Font Mono without rebinding chrome stacks", () => {
    const fontsCss = readStylesheet("fonts.css");
    const globalsCss = readStylesheet("globals.css");

    expect(fontsCss).toContain('font-family: "Terminess Nerd Font Mono"');
    for (const url of terminessMonoFaces) {
      expect(fontsCss).toContain(url);
    }
    expect(globalsCss).toMatch(/--font-sans:\s*"Terminess Nerd Font"/);
    expect(globalsCss).toMatch(/--font-mono:\s*"Terminess Nerd Font"/);
    expect(globalsCss).not.toContain("Terminess Nerd Font Mono");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/ui-kit test -- tests/styles/fonts.test.ts`

Expected: FAIL — Mono family / TTF urls missing.

- [ ] **Step 3: Add the Mono TTFs and @font-face**

Copy **Terminess Nerd Font Mono** Regular and Bold from the same Nerd Fonts Terminus patch as the existing four files (see the folder README). Git LFS tracks `*.ttf` already — run `git lfs install` if needed. Append to `fonts.css` (do not edit the four existing faces):

```css
@font-face {
  font-family: "Terminess Nerd Font Mono";
  src: url("../assets/fonts/nerdfonts/terminus/TerminessNerdFontMono-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: block;
}

@font-face {
  font-family: "Terminess Nerd Font Mono";
  src: url("../assets/fonts/nerdfonts/terminus/TerminessNerdFontMono-Bold.ttf") format("truetype");
  font-weight: 700;
  font-style: normal;
  font-display: block;
}
```

Create `.changeset/terminess-nerd-font-mono.md`:

```md
---
"@gencore/ui-kit": patch
---

feat: bundle Terminess Nerd Font Mono for terminal cell glyphs
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/ui-kit test -- tests/styles/fonts.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-kit/src/assets/fonts/nerdfonts/terminus/TerminessNerdFontMono-Regular.ttf packages/ui-kit/src/assets/fonts/nerdfonts/terminus/TerminessNerdFontMono-Bold.ttf packages/ui-kit/src/styles/fonts.css packages/ui-kit/tests/styles/fonts.test.ts .changeset/terminess-nerd-font-mono.md
git commit -m "feat(ui-kit): bundle Terminess Nerd Font Mono for xterm cells"
```

---

### Task 2: gencore-core pinned-tabs store

**Files:**
- Create: `crates/gencore-core/src/modules/pinned_store/pinned_store_error.rs`
- Create: `crates/gencore-core/src/modules/pinned_store/pinned_store_api.rs`
- Create: `crates/gencore-core/src/modules/pinned_store/mod.rs`
- Modify: `crates/gencore-core/src/modules/mod.rs`
- Modify: `crates/gencore-core/src/modules/error/error_error.rs`
- Modify: `crates/gencore-core/src/lib.rs`
- Modify: `crates/gencore-core/build.rs`
- Create: `crates/gencore-core/tests/pinned_store.rs`

**Interfaces:**
- Consumes: `AppHandle::path().app_data_dir()`
- Produces:
  - `PINNED_TABS_FILE_NAME: &str = "pinned-tabs.json"`
  - `PINNED_TABS_JSON_MAX_BYTES: usize = 8 * 1024 * 1024`
  - `DEFAULT_PINNED_TABS_JSON: &str = "{\"version\":1,\"activeId\":null,\"tabs\":[]}"`
  - `pub fn pinned_tabs_path(dir: &Path) -> PathBuf`
  - `pub fn read_pinned_tabs_file(path: &Path) -> Result<String, PinnedStoreError>`
  - `pub fn write_pinned_tabs_file(path: &Path, json: &str) -> Result<(), PinnedStoreError>`
  - `#[tauri::command] pub async fn load_pinned_tabs<R: Runtime>(app: AppHandle<R>) -> Result<String, CoreError>`
  - `#[tauri::command] pub async fn save_pinned_tabs<R: Runtime>(app: AppHandle<R>, args: SavePinnedTabsArgs) -> Result<(), CoreError>`
  - `SavePinnedTabsArgs { json: String }` with `deny_unknown_fields`
  - Isolation cmds: `plugin:gencore-core|load_pinned_tabs`, `plugin:gencore-core|save_pinned_tabs`
  - Permissions: `gencore-core:allow-load-pinned-tabs`, `gencore-core:allow-save-pinned-tabs` (generated). **Not** added to `permissions/default.toml`.

- [ ] **Step 1: Write the failing file-helper tests**

Create `crates/gencore-core/tests/pinned_store.rs`:

```rust
use std::fs;
use std::path::PathBuf;

use gencore_core::{
    DEFAULT_PINNED_TABS_JSON, PINNED_TABS_JSON_MAX_BYTES, PinnedStoreError, SavePinnedTabsArgs,
    pinned_tabs_path, read_pinned_tabs_file, write_pinned_tabs_file,
};

fn temp_dir() -> PathBuf {
    let dir = std::env::temp_dir().join(format!("gencore-pinned-{}", std::process::id()));
    fs::create_dir_all(&dir).expect("temp dir");
    dir
}

#[test]
fn missing_file_returns_default_json() {
    let path = pinned_tabs_path(&temp_dir().join("empty-subdir-does-not-exist-yet"));
    let json = read_pinned_tabs_file(&path).expect("default");
    assert_eq!(json, DEFAULT_PINNED_TABS_JSON);
}

#[test]
fn write_then_read_round_trips() {
    let dir = temp_dir();
    let path = pinned_tabs_path(&dir);
    write_pinned_tabs_file(&path, "{\"version\":1,\"activeId\":\"a\",\"tabs\":[]}").unwrap();
    let json = read_pinned_tabs_file(&path).unwrap();
    assert!(json.contains("\"activeId\":\"a\""));
}

#[test]
fn write_rejects_oversized_payload() {
    let dir = temp_dir();
    let path = pinned_tabs_path(&dir);
    let too_big = "x".repeat(PINNED_TABS_JSON_MAX_BYTES + 1);
    let err = write_pinned_tabs_file(&path, &too_big).unwrap_err();
    assert!(matches!(err, PinnedStoreError::TooLarge));
}

#[test]
fn save_args_reject_unknown_fields() {
    let parsed: Result<SavePinnedTabsArgs, _> =
        serde_json::from_value(serde_json::json!({ "json": "{}", "extra": true }));
    assert!(parsed.is_err());
}
```

If those symbols are not exported yet, the test will fail to compile — that is the red.

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p gencore-core --test pinned_store`

Expected: FAIL (unresolved imports / missing module).

- [ ] **Step 3: Implement pinned store**

`pinned_store_error.rs`:

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PinnedStoreError {
    #[error("pinned tabs payload is too large")]
    TooLarge,
    #[error("failed to read pinned tabs: {0}")]
    Read(String),
    #[error("failed to write pinned tabs: {0}")]
    Write(String),
    #[error("application data directory is unavailable")]
    AppDataDir,
}

impl serde::Serialize for PinnedStoreError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
```

Helpers + commands in `pinned_store_api.rs` (commands take `AppHandle`, helpers take `Path` so tests do not need Tauri):

```rust
pub const PINNED_TABS_FILE_NAME: &str = "pinned-tabs.json";
pub const PINNED_TABS_JSON_MAX_BYTES: usize = 8 * 1024 * 1024;
pub const DEFAULT_PINNED_TABS_JSON: &str = "{\"version\":1,\"activeId\":null,\"tabs\":[]}";

pub fn pinned_tabs_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(PINNED_TABS_FILE_NAME)
}

pub fn read_pinned_tabs_file(path: &Path) -> Result<String, PinnedStoreError> {
    match std::fs::read_to_string(path) {
        Ok(json) => Ok(json),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(DEFAULT_PINNED_TABS_JSON.to_string()),
        Err(err) => Err(PinnedStoreError::Read(err.to_string())),
    }
}

pub fn write_pinned_tabs_file(path: &Path, json: &str) -> Result<(), PinnedStoreError> {
    if json.len() > PINNED_TABS_JSON_MAX_BYTES {
        return Err(PinnedStoreError::TooLarge);
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|err| PinnedStoreError::Write(err.to_string()))?;
    }
    std::fs::write(path, json).map_err(|err| PinnedStoreError::Write(err.to_string()))
}
```

`load_pinned_tabs`: resolve `app.path().app_data_dir()`, then `read_pinned_tabs_file`. `save_pinned_tabs`: same dir + `write_pinned_tabs_file`. Map errors with `?` into `CoreError`.

Add `PinnedStore(#[from] PinnedStoreError)` to `CoreError`. Export new items from `lib.rs`. `build.rs`: `COMMANDS: &[&str] = &["get_app_info", "load_pinned_tabs", "save_pinned_tabs"];`. `init` handler includes both new commands. **Do not** add them to `permissions/default.toml`.

- [ ] **Step 4: Run tests**

Run: `cargo test -p gencore-core --test pinned_store`

Expected: PASS. Also `cargo clippy -p gencore-core --all-targets -- -D warnings`.

- [ ] **Step 5: Commit**

```bash
git add crates/gencore-core
git commit -m "feat(core): persist pinned-tabs.json in app data"
```

---

### Task 3: Real gencore-pty (portable-pty)

**Files:**
- Modify: `crates/gencore-plugin-pty/Cargo.toml` via `cargo add portable-pty uuid --features uuid/v4 base64`
- Modify session/io/resize modules, `lib.rs`
- Create `session_map.rs`, `session_shell.rs`
- Replace stub tests; add `tests/session_commands.rs`

**Interfaces:**
- Consumes: `portable_pty::{native_pty_system, CommandBuilder, PtySize}`
- Produces:
  - `OpenArgs { cols: u16, rows: u16, #[serde(default)] cwd: Option<String>, #[serde(default)] theme: Option<String> }`
  - `OpenResult { session_id: String }`
  - `PTY_DATA_EVENT: &str = "gencore-pty://data"`
  - `PTY_EXIT_EVENT: &str = "gencore-pty://exit"`
  - `PtyDataPayload { session_id: String, data: String }` // data = standard base64
  - `PtyExitPayload { session_id: String, code: Option<i32> }`
  - `SessionMap = HashMap<String, PtySession>` managed in plugin `setup`
  - `open(app, state, args) -> Result<OpenResult, SessionError>`
  - `write(state, args) -> Result<(), IoError>`
  - `resize(state, args) -> Result<(), ResizeError>`
  - `close(state, args) -> Result<(), SessionError>`
  - `resolve_shell() -> PathBuf` (`pwsh` on PATH else `powershell.exe`)
  - `theme` allowed values: `None` / `Some("polar-night")` / `Some("snow-storm")`. Anything else → `SessionError::InvalidTheme`.
  - Errors: drop `NotImplemented`. Use `SessionNotFound`, `SpawnFailed(String)`, `InvalidCwd`, `InvalidTheme`, `Io(String)` as needed on each enum.

`open` must **not** take a shell path. It may set env `POSH_THEME` and `PATH` prefix later (Task 7); in this task, spawn the resolved shell with `-NoLogo` at `cwd` or the user profile dir (`dirs::home_dir()` or `USERPROFILE`). Add `dirs` only if needed; prefer `std::env::var("USERPROFILE")` on Windows.

- [ ] **Step 1: Write failing arg + spawn tests**

Replace NotImplemented tests in `stub_commands.rs` with deny_unknown_fields tests that include optional `cwd` / `theme`. Add `tests/session_commands.rs`:

```rust
#[test]
fn open_args_default_theme_and_cwd_are_optional() {
    let parsed: OpenArgs = serde_json::from_value(serde_json::json!({ "cols": 80, "rows": 24 })).unwrap();
    assert_eq!(parsed.cols, 80);
    assert!(parsed.cwd.is_none());
    assert!(parsed.theme.is_none());
}

#[test]
fn open_args_reject_unknown_fields() {
    let parsed: Result<OpenArgs, _> =
        serde_json::from_value(serde_json::json!({ "cols": 80, "rows": 24, "shell": "cmd.exe" }));
    assert!(parsed.is_err());
}
```

Windows-only smoke (ignore on other OS):

```rust
#[cfg(windows)]
#[test]
fn open_echo_and_close() {
    // This test needs a Tauri dummy AppHandle OR test the SessionMap helpers
    // `spawn_session` / `write_session` / `kill_session` extracted from commands.
    // Prefer testing those helpers with a std mpsc instead of emit if AppHandle
    // is awkward: `spawn_session` takes an `Fn(PtyDataPayload)` callback.
}
```

Extract `spawn_session(map, args, on_data, on_exit) -> Result<String, SessionError>` so the test can collect bytes until it sees output or 3s timeout, then `kill_session`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test -p gencore-pty --test stub_commands --test session_commands`

Expected: FAIL (OpenResult / spawn_session missing; NotImplemented still there).

- [ ] **Step 3: Implement portable-pty**

`cargo add` in `crates/gencore-plugin-pty`: `portable-pty`, `uuid` with `v4`, `base64`.

`session_shell.rs`: walk `PATH` + `PATHEXT` for `pwsh.exe` / `pwsh`, else `powershell.exe`.

`session_map.rs`: `PtySession { writer: Mutex<Box<dyn Write + Send>>, master: Box<dyn MasterPty + Send>, child: Mutex<Box<dyn Child + Send + Sync>> }` — adjust to whatever `portable-pty` latest stable actually exports. Resize via `master.resize(PtySize { cols, rows, pixel_width: 0, pixel_height: 0 })`.

Spawn:

```rust
let pair = native_pty_system()
    .openpty(PtySize { rows: args.rows, cols: args.cols, pixel_width: 0, pixel_height: 0 })
    .map_err(|err| SessionError::SpawnFailed(err.to_string()))?;
let mut cmd = CommandBuilder::new(resolve_shell());
cmd.arg("-NoLogo");
if let Some(cwd) = args.cwd.as_deref() {
    cmd.cwd(cwd);
} else if let Ok(home) = std::env::var("USERPROFILE") {
    cmd.cwd(home);
}
let child = pair.slave.spawn_command(cmd).map_err(|err| SessionError::SpawnFailed(err.to_string()))?;
```

Reader thread: read into a 8 KiB buffer, `base64::engine::general_purpose::STANDARD.encode`, call `on_data`. On EOF, `child.wait()`, `on_exit(code)`.

Commands clone `AppHandle` and `emit` `PTY_DATA_EVENT` / `PTY_EXIT_EVENT`. Plugin `setup` `app.manage(Arc::new(Mutex::new(SessionMap::new())))`. On `close`, kill child, remove map entry.

`open` returns `OpenResult { session_id: Uuid::new_v4().to_string() }`.

- [ ] **Step 4: Run tests**

Run: `cargo test -p gencore-pty`

Expected: PASS (Windows spawn smoke included). `cargo clippy -p gencore-pty --all-targets -- -D warnings`.

- [ ] **Step 5: Commit**

```bash
git add crates/gencore-plugin-pty Cargo.lock
git commit -m "feat(pty): spawn ConPTY sessions with portable-pty"
```

---

### Task 4: Isolation, capabilities, IPC wrappers

**Files:**
- Modify: `apps/terminal/isolation/isolation.hook.js`
- Modify: `apps/terminal/src-tauri/capabilities/main.json`
- Modify: `apps/terminal/tests/unit/isolation.hook.test.ts`
- Create: `apps/terminal/src/modules/ipc/ipc.pty.ts`
- Create: `apps/terminal/src/modules/ipc/ipc.pinned.ts`
- Modify: `apps/terminal/src/modules/ipc/ipc.types.ts`
- Modify: `apps/terminal/AGENTS.md`
- Modify: `crates/AGENTS.md`
- Modify: `AGENTS.md` (one sentence: Terminal emulator is real; Explorer still has no PTY)

**Interfaces:**
- Consumes: Task 2/3 command names and event names
- Produces: JS wrappers below. Isolation reconstructs payloads; never reuse the window-label reconstructor for PTY.

```ts
// ipc.types.ts additions
export interface OpenPtyArgs {
  readonly cols: number;
  readonly rows: number;
  readonly cwd?: string;
  readonly theme?: "polar-night" | "snow-storm";
}
export interface OpenPtyResult { readonly session_id: string; }
export interface PtyDataPayload { readonly session_id: string; readonly data: string; }
export interface PtyExitPayload { readonly session_id: string; readonly code: number | null; }
```

```ts
// ipc.pty.ts
export function openPty(args: OpenPtyArgs): Promise<OpenPtyResult>;
export function writePty(sessionId: string, data: string): Promise<void>;
export function resizePty(sessionId: string, cols: number, rows: number): Promise<void>;
export function closePty(sessionId: string): Promise<void>;
export function subscribePtyData(handler: (payload: PtyDataPayload) => void): Promise<() => void>;
export function subscribePtyExit(handler: (payload: PtyExitPayload) => void): Promise<() => void>;
```

Commands: `plugin:gencore-pty|open|write|resize|close`. Events: `gencore-pty://data`, `gencore-pty://exit`.

```ts
// ipc.pinned.ts
export function loadPinnedTabs(): Promise<string>;
export function savePinnedTabs(json: string): Promise<void>;
```

Commands: `plugin:gencore-core|load_pinned_tabs` (empty args), `plugin:gencore-core|save_pinned_tabs` (`{ json }`).

- [ ] **Step 1: Write failing isolation tests first**

In `isolation.hook.test.ts`:

1. Change `FORBIDDEN_TOKENS` from `"gencore-pty"` to `"gencore-pty:default"` (and keep `core:default`, `opener:default`, `core:event:default`, `core:window:default`, `core:window:allow-set-theme`).
2. Add PTY cmds to `ALLOWED` expectations; still throw on `plugin:gencore-pty|spawn`.
3. Add `PTY_DATA_EVENT` / `PTY_EXIT_EVENT` to the listen allowlist tests (copy the `entry-changed` Any-target cases).
4. Add `plugin:gencore-core|load_pinned_tabs` to `EMPTY_ARG_COMMANDS`.
5. Extend the capabilities `toEqual` array: after `gencore-core:allow-get-app-info` insert `gencore-core:allow-load-pinned-tabs`, `gencore-core:allow-save-pinned-tabs`; after fs unwatch insert `gencore-pty:allow-open`, `allow-write`, `allow-resize`, `allow-close`.
6. New tests: open reconstructs `{ cols, rows }`; open with cwd reconstructs `{ cols, rows, cwd }`; open with `theme: "snow-storm"` kept; open with `theme: "nord"` throws; open with `shell` throws; write data > 64 KiB throws; save json > 8 MiB throws; listen to `gencore-pty://data` with Any works; listen to `gencore-pty://pwn` throws.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/isolation.hook.test.ts`

Expected: FAIL (hook still forbids PTY; capabilities missing grants).

- [ ] **Step 3: Implement hook + capabilities + wrappers**

`ALLOWED_COMMANDS` add:

```js
"plugin:gencore-pty|open",
"plugin:gencore-pty|write",
"plugin:gencore-pty|resize",
"plugin:gencore-pty|close",
"plugin:gencore-core|load_pinned_tabs",
"plugin:gencore-core|save_pinned_tabs",
```

`isAllowedListenEvent`: also `gencore-pty://data` and `gencore-pty://exit` with `isAnyTarget`. `isUnlistenArgs` event allowlist includes those two names.

Validators (mirror fs style, no `forEach` if the file uses index loops):

- `isPtyOpenArgs`: plain object; `cols`/`rows` finite numbers in 1..999; optional `cwd` path (same `isAllowedPath`); optional `theme` exactly `"polar-night"` or `"snow-storm"`; no other keys.
- `isPtyWriteArgs`: `session_id` non-empty string ≤ 64; `data` string ≤ 65536; those two keys only.
- `isPtyResizeArgs`: `session_id` + `cols` + `rows`.
- `isPtyCloseArgs`: `session_id` only.
- `isSavePinnedArgs`: `{ json }` string length ≤ 8388608.

Reconstruct inner payloads with only those fields (do not pass through extra keys). `load_pinned_tabs` uses the same empty-args path as `get_app_info`.

`capabilities/main.json` description: drop “No gencore-pty commands are granted yet.” Add the six new allow strings listed in Step 1.

Implement `ipc.pty.ts` / `ipc.pinned.ts` / types. Update `AGENTS.md` files: Isolation **does** grant the four PTY commands + two PTY events + two pinned-tab core commands; still no `stat`, no Explorer PTY, no `gencore-pty:default`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/isolation.hook.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/isolation apps/terminal/src-tauri/capabilities/main.json apps/terminal/tests/unit/isolation.hook.test.ts apps/terminal/src/modules/ipc apps/terminal/AGENTS.md crates/AGENTS.md AGENTS.md
git commit -m "feat(terminal): allowlist pty IPC and pinned-tab store"
```

---

### Task 5: Tab strip + xterm host

**Files:**
- Create terminal module files listed in the file map (except persist save debounce can be a stub `savePinned` no-op until Task 6)
- Create `context-menu.terminal.tsx`
- Modify `app.component.tsx`
- Create `apps/terminal/tests/unit/terminal.hook.test.ts`
- Create `apps/terminal/tests/unit/terminal.theme.test.ts`
- Create `apps/terminal/tests/unit/terminal.osc7.test.ts`

**Interfaces:**
- Consumes: `openPty`, `writePty`, `resizePty`, `closePty`, `subscribePtyData`, `subscribePtyExit`, `useTheme`
- Produces:
  - `TerminalTab { id: string; name: string | null; pinned: boolean; cwd: string | null; sessionId: string | null; status: "live" | "exited" }`
  - `useTerminalSession()`: `{ tabs, activeId, newTab, closeTab, setActive, renameTab, togglePin, closeOthers, closeUnpinned, restartTab }`
  - `nordXtermTheme(theme: ThemeName): ITheme` — Polar Night bg `#2E3440`, Snow Storm bg `#ECEFF4`; ANSI 0–15 = nord0–nord15 in order; cursor = frost-8 `#88C0D0`; selection = accent fill
  - `scanOsc7(chunk: string): string | null`
  - `createXterm(el: HTMLElement, theme: ThemeName): { terminal, fit, serialize, dispose }`
  - Tab order: `[...pinned][...unpinned]`. New tabs append unpinned. Default name `PowerShell` until cwd known, then last path segment (`C:\` stays `C:\`).

Add deps with pnpm (stable): `pnpm --filter @gencore/terminal add @xterm/xterm @xterm/addon-fit @xterm/addon-serialize @xterm/addon-webgl`

- [ ] **Step 1: Write failing hook / osc7 / theme tests**

`terminal.hook.test.ts` (pure functions exported from the hook file as `sortTabs`, `autoTitle`, `nextActiveId`):

```ts
it("sorts pinned tabs before unpinned and keeps relative order", () => {
  const tabs = [
    { id: "u1", pinned: false },
    { id: "p1", pinned: true },
    { id: "u2", pinned: false },
    { id: "p2", pinned: true },
  ];
  expect(sortTabs(tabs).map((t) => t.id)).toEqual(["p1", "p2", "u1", "u2"]);
});

it("autoTitle uses PowerShell then the last path segment", () => {
  expect(autoTitle(null, null)).toBe("PowerShell");
  expect(autoTitle(null, "C:\\Users\\DUSTI\\GenCore")).toBe("GenCore");
  expect(autoTitle("Build", "C:\\Users\\DUSTI\\GenCore")).toBe("Build");
  expect(autoTitle(null, "C:\\")).toBe("C:\\");
});
```

`terminal.osc7.test.ts`: parse `file://host/C:/Users/x` and `file:///C:/Users/x` into `C:\Users\x`; ignore garbage.

`terminal.theme.test.ts`: Polar Night background is `#2E3440`; Snow Storm `#ECEFF4`; no hex outside nord0–nord15 (import `tokens.nord` and assert every theme color is in that set).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/terminal.hook.test.ts tests/unit/terminal.osc7.test.ts tests/unit/terminal.theme.test.ts`

Expected: FAIL (modules missing).

- [ ] **Step 3: Implement UI**

Tab strip (28px, `bg-card`, `border-b border-border`): pills `h-[22px] rounded-[6px]`; active `bg-accent text-accent-foreground`; inactive `text-muted-foreground hover:bg-accent hover:text-accent-foreground`; Lucide `Pin` (filled) only when pinned; close on hover + always on active; `+` on the right (`Button` `ghost` `icon-xs`).

Keyboard on the tablist: Ctrl+T / Ctrl+W / Ctrl+Tab / Ctrl+Shift+Tab / Ctrl+1..9 (9 = last). Middle-click close. Double-click → `Input` rename; empty commit restores auto title.

Context menu on a tab: Rename, Pin/Unpin, Close, Close Others (every other tab, pinned included), Close Unpinned.

xterm: font family `"Terminess Nerd Font Mono", monospace`, 13px, 12px padding, frost bar cursor blink. Try WebglAddon; on throw, canvas. `FitAddon` on container `ResizeObserver`. `onData` → `writePty`. Incoming data: `atob`/`Uint8Array` decode from base64 → `terminal.write`; also `scanOsc7` on the utf8 lossy string for cwd.

`App`: `contentProps={{ centered: false, padded: false }}`, children = `<TerminalView />`, `contentContextMenu={<TerminalContextMenu />}` (Copy / Paste / Select All via xterm API; **no Cut**). Statusbar: cwd muted start; `pwsh` or `powershell` · `cols×rows` end. Import `@xterm/xterm/css/xterm.css` from `terminal.xterm.ts` or `main.tsx`.

First mount: one tab, `openPty` at home (omit cwd), theme from `useTheme()`.

Exited: `status: "exited"`, keep buffer; Enter / Restart calls `openPty` with last cwd (no seam yet — Task 6).

Copy: Ctrl+Shift+C; paste Ctrl+Shift+V; Ctrl+C goes to PTY.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/terminal.hook.test.ts tests/unit/terminal.osc7.test.ts tests/unit/terminal.theme.test.ts`

Expected: PASS. `pnpm --filter @gencore/terminal typecheck`.

Manual: `pnpm --filter @gencore/terminal tauri:dev` — a live shell in the right pane, tabs, resize.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/terminal apps/terminal/src/modules/context-menu/context-menu.terminal.tsx apps/terminal/src/modules/app/app.component.tsx apps/terminal/tests/unit/terminal.hook.test.ts apps/terminal/tests/unit/terminal.osc7.test.ts apps/terminal/tests/unit/terminal.theme.test.ts apps/terminal/package.json pnpm-lock.yaml
git commit -m "feat(terminal): host xterm.js sessions in the content pane"
```

---

### Task 6: Pin, persist, restore, session seam

**Files:**
- Modify: `terminal.hook.ts`, `terminal.component.tsx`, `terminal.xterm.ts`
- Modify: `apps/terminal/tests/unit/terminal.hook.test.ts`

**Interfaces:**
- Consumes: `loadPinnedTabs`, `savePinnedTabs`, SerializeAddon
- Produces: `PinnedTabsFile { version: 1; activeId: string | null; tabs: PinnedTabRecord[] }`
- `PinnedTabRecord { id: string; name: string | null; cwd: string | null; scrollback: string; cols: number; rows: number }`
- Caps: 16 pinned; serialize ≤ 256 KiB per tab (drop oldest serialized output if needed); xterm `scrollback: 4096`
- Debounce save 2000ms after data/pin/rename; flush immediately on pin, unpin, close, and `beforeunload` / unmount

- [ ] **Step 1: Write failing persist tests**

```ts
it("toPinnedFile includes only pinned tabs and caps at 16", () => { /* ... */ });
it("fromPinnedFile ignores version !== 1 and returns null", () => { /* ... */ });
it("seamLine is muted dashes up to 80", () => {
  expect(seamLine(120).length).toBe(80);
  expect(seamLine(40).length).toBe(40);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/terminal.hook.test.ts`

Expected: FAIL on new cases.

- [ ] **Step 3: Implement restore**

On launch: `loadPinnedTabs()`, `JSON.parse`, if `version !== 1` treat as empty (do not overwrite until a successful save; if parse throws, next successful save writes a new file — optionally rename to `pinned-tabs.json.bak` once in the save path when parse failed). Restore each record: create xterm → `serialize.deserialize` / `terminal.write(scrollback)` → write `seamLine(cols)` in muted (`\x1b[38;2;76;86;106m` nord3) → `openPty({ cols, rows, cwd, theme })`. If cwd open fails with `InvalidCwd`, retry omitting cwd. Focus `activeId` if present.

If `tabs` is empty, one home tab (Task 5 behavior).

Unpin: drop from file on next save; keep live PTY. Close: `closePty` + drop record.

- [ ] **Step 4: Run tests + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/terminal apps/terminal/tests/unit/terminal.hook.test.ts
git commit -m "feat(terminal): persist pinned tabs with scrollback restore"
```

---

### Task 7: Oh My Posh capsule prompt

**Files:**
- Create: `scripts/fetch-oh-my-posh.ps1`
- Create: `apps/terminal/src-tauri/resources/oh-my-posh/gencore-polar-night.omp.json`
- Create: `apps/terminal/src-tauri/resources/oh-my-posh/gencore-snow-storm.omp.json`
- Create: `apps/terminal/src-tauri/resources/oh-my-posh/gencore-prompt.ps1`
- Modify: `.gitignore`
- Modify: `apps/terminal/src-tauri/tauri.conf.json`
- Modify: `scripts/package-win64.ps1`
- Modify: `crates/gencore-plugin-pty` spawn env (PATH prefix + `POSH_THEME` + `-File` prompt script when resources exist)
- Modify: `terminal.component.tsx` / hook to pass `theme` into `openPty` and rewrite `$env:POSH_THEME` on OS theme change

**Interfaces:**
- Consumes: `app.path().resource_dir()` on the Rust side (Task 3 spawn). Theme JSON names: `gencore-polar-night.omp.json`, `gencore-snow-storm.omp.json`
- Produces: capsule 2-line prompt. Transient on. Line 1: user `\uf007`, folder `\uf07b`, git `\ue725` (aurora-14/13/11). Line 2: `❯` frost-8, aurora-11 on error. Diamonds `` / ``.

- [ ] **Step 1: Write a failing resource test**

Create `apps/terminal/tests/unit/oh-my-posh-theme.test.ts` that reads the two JSON files from `src-tauri/resources/oh-my-posh/` and asserts:

- `transient_prompt` exists
- a `diamond` / round style segment exists (`leading_diamond` or `"style": "diamond"`)
- Polar Night user fill `#88C0D0`; Snow Storm user fill `#5E81AC`
- git success uses `#A3BE8C`, dirty `#EBCB8B`, conflict `#BF616A`
- no hex outside nord0–nord15

- [ ] **Step 2: Run to verify fail**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/oh-my-posh-theme.test.ts`

Expected: FAIL (files missing).

- [ ] **Step 3: Add themes, prompt script, fetch script, spawn wiring**

`scripts/fetch-oh-my-posh.ps1`: download latest **stable** `posh-windows-amd64.exe` (or the documented Windows amd64 asset) from Oh My Posh GitHub releases into `apps/terminal/src-tauri/resources/oh-my-posh/oh-my-posh.exe`. Idempotent if the file exists unless `-Force`.

`.gitignore` entry: `apps/terminal/src-tauri/resources/oh-my-posh/oh-my-posh.exe`

`tauri.conf.json` `bundle.resources`: `["resources/oh-my-posh/**"]`.

`package-win64.ps1`: before the terminal `tauri build`, invoke `scripts/fetch-oh-my-posh.ps1`.

`gencore-prompt.ps1` (committed):

```powershell
$ErrorActionPreference = 'SilentlyContinue'
if (-not $env:POSH_THEME) { return }
if (Get-Command oh-my-posh -ErrorAction SilentlyContinue) {
  oh-my-posh init pwsh --config $env:POSH_THEME | Invoke-Expression
}
function Global:Prompt {
  $cwd = (Get-Location).Path
  $uri = 'file:///' + ($cwd -replace '\\','/')
  Write-Host -NoNewline ("`e]7;{0}`a" -f $uri)
  if (Get-Command Set-PoshPromptItem -ErrorAction SilentlyContinue) { }
  if (Test-Path Function:Set-PoshPrompt) { }
  # Oh My Posh replaces Prompt; if init succeeded, do not override.
  if (Get-Command Get-PoshContext -ErrorAction SilentlyContinue) {
    return (oh-my-posh print prompt --config $env:POSH_THEME)
  }
  return '❯ '
}
```

If OMP `init` already replaces `Prompt`, **do not** clobber it. Preferred shape: run `oh-my-posh init pwsh --config $env:POSH_THEME | Invoke-Expression`, then wrap the existing `Prompt` to prefix OSC 7:

```powershell
oh-my-posh init pwsh --config $env:POSH_THEME | Invoke-Expression
$gencoreInner = $function:Prompt
function Global:Prompt {
  $cwd = (Get-Location).Path
  [Console]::Write("`e]7;file:///$($cwd.Replace('\','/'))`a")
  & $gencoreInner
}
```

Use that wrapper. If `oh-my-posh` is missing, `Prompt { '❯ ' }` only.

Themes: Oh My Posh v3 JSON, two blocks (line 1 segments diamond style with 8px gap if the schema supports `gap`; otherwise adjacent capsules), newline before line 2 text segment `<%#88C0D0%>❯</>` (Snow Storm line 2 `#5E81AC`). Git segment `type: git`, templates for branch; `style: diamond`.

Rust spawn (when `resource_dir/oh-my-posh/oh-my-posh.exe` exists): prepend that directory to `PATH`, set `POSH_THEME` to the matching JSON **absolute** path, `CommandBuilder` `-NoLogo -NoProfile -ExecutionPolicy Bypass -File <gencore-prompt.ps1>`. If exe or ps1 missing, spawn as Task 3 (plain `-NoLogo`).

On OS theme change: `writePty` the string `$env:POSH_THEME = '<json-path>';` plus newline. Also `terminal.options.theme = nordXtermTheme(next)`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/oh-my-posh-theme.test.ts`

Expected: PASS. Manual: Polar Night capsules, switch Windows to light → Snow Storm prompt + xterm palette, git segment in a repo.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-oh-my-posh.ps1 scripts/package-win64.ps1 apps/terminal/src-tauri/resources/oh-my-posh apps/terminal/src-tauri/tauri.conf.json .gitignore crates/gencore-plugin-pty apps/terminal/src/modules/terminal apps/terminal/tests/unit/oh-my-posh-theme.test.ts
git commit -m "feat(terminal): bundle Oh My Posh capsule prompt with Nord themes"
```

Do not add `oh-my-posh.exe`.

---

## Self-review (spec coverage)

| Spec requirement | Task |
|---|---|
| xterm.js + portable-pty | 3, 5 |
| Tabs create/close/rename/pin, pin-left + glyph | 5 |
| Persist name + cwd + scrollback + seam | 6 |
| pwsh then powershell, no bundled pwsh | 3 |
| Oh My Posh capsules, live theme, bundled exe | 7 |
| Isolation + capabilities + ipc wrappers | 4 |
| Terminess Nerd Font Mono | 1 |
| Statusbar cwd / size | 5 |
| Copy/paste vs SIGINT | 5 |
| Exited + restart | 5 |
| Core pinned JSON, 8 MiB, Explorer ungated | 2, 4 |
| No splits, no URL opener, no Explorer PTY | Global constraints |

No TBD in task steps. `OpenArgs.theme` is the allowlisted way to pick Polar Night vs Snow Storm without passing filesystem paths (spec: Rust sets `POSH_THEME`).
