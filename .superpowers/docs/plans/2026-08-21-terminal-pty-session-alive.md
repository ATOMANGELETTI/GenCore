# Terminal PTY Session Alive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep each Terminal tab’s PowerShell session interactive (Oh My Posh `-NoExit`) and deliver ConPTY’s startup `ESC [6n` plus xterm’s CPR even when those bytes arrive before the tab owns `sessionId`.

**Architecture:** `gencore-pty` builds spawn argv through `shell_launch`. The Terminal provider attaches PTY listeners before the first `openPty`, parks inbound chunks by Rust session UUID until a tab claims that id, and queues outbound xterm input until `open` returns. xterm remains the only DSR responder.

**Tech Stack:** React 19.2, Vitest, Tauri 2, `portable-pty`, `@xterm/xterm` 6.0.0 (existing freezePrototype patch — do not edit).

**Spec:** `.superpowers/docs/specs/2026-08-21-terminal-pty-session-alive-design.md`

## Global Constraints

- Latest **stable** only. No beta/rc/canary.
- Plugin package name **must equal** plugin id: `gencore-pty`.
- `{module}.{role}.{ext}`. Tests only under that unit’s `tests/` directory.
- UI talks to Rust only through `apps/terminal/src/modules/ipc/`.
- No new IPC commands, Isolation grants, or Explorer PTY.
- Do not edit `patches/@xterm__xterm@6.0.0.patch` or `freezePrototype`.
- Do not answer `ESC [6n` in Rust or in the JS data handler (xterm only).
- Do not bump major versions. No JS changeset (`@gencore/terminal` is private; `gencore-pty` has none).
- Conventional commits. No Cursor/AI attribution trailers.
- Work in place on the current branch. Do not create a worktree unless asked.
- Superpowers files stay under `.superpowers/docs/`. Do not write `docs/superpowers/`.
- Stage **only** the files listed in the task. Never `git add -A`.
- Commit steps run only when the user asked to commit. If they have not, skip Commit and leave the tree dirty.

---

## File map

**gencore-pty**

- Modify: `crates/gencore-plugin-pty/src/modules/session/session_shell.rs` — `ShellLaunch`, `shell_launch`, `strip_verbatim_prefix`; `oh_my_posh_dir` requires `is_real_executable` on `oh-my-posh.exe`
- Modify: `crates/gencore-plugin-pty/src/modules/session/session_map.rs` — spawn via `shell_launch`
- Modify: `crates/gencore-plugin-pty/src/modules/session/mod.rs` — re-export new types
- Modify: `crates/gencore-plugin-pty/src/lib.rs` — re-export new types
- Test: `crates/gencore-plugin-pty/tests/session_commands.rs`

**Terminal**

- Modify: `apps/terminal/src/modules/terminal/terminal.hook.ts` — listen first; orphan inbound map; pending outbound map
- Modify: `apps/terminal/src/modules/terminal/terminal.component.tsx` — `onData` before `registerWriter`
- Test: `apps/terminal/tests/unit/terminal.provider.test.tsx`

**Do not touch**

- `patches/@xterm__xterm@6.0.0.patch`
- `apps/terminal/src-tauri/resources/oh-my-posh/gencore-prompt.ps1` (script stays Prompt-only; `-NoExit` keeps the host)
- Telemetry / statusbar files

---

### Task 1: `shell_launch` and a real Oh My Posh exe

**Files:**
- Modify: `crates/gencore-plugin-pty/src/modules/session/session_shell.rs`
- Modify: `crates/gencore-plugin-pty/src/modules/session/mod.rs`
- Modify: `crates/gencore-plugin-pty/src/lib.rs`
- Test: `crates/gencore-plugin-pty/tests/session_commands.rs`

**Interfaces:**
- Consumes: existing `OhMyPoshSpawn`, `resolve_shell`, `prepend_path`, `is_real_executable`
- Produces:
  - `pub struct ShellLaunch { pub program: PathBuf, pub args: Vec<OsString>, pub path: Option<OsString>, pub posh_theme: Option<PathBuf> }`
  - `pub fn shell_launch(omp: Option<&OhMyPoshSpawn>) -> ShellLaunch`
  - `pub fn strip_verbatim_prefix(path: &Path) -> PathBuf`

- [ ] **Step 1: Write the failing tests**

In `crates/gencore-plugin-pty/tests/session_commands.rs`, add `shell_launch` and `strip_verbatim_prefix` to the `use gencore_pty::{...}` import. Change the two resolver tests that write an empty `oh-my-posh.exe` so they write `b"MZ"` instead (those tests must keep passing after the 0-byte rule). Add:

```rust
#[test]
fn resolve_oh_my_posh_none_when_exe_is_zero_bytes() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-omp-zero-{}", std::process::id()));
    let omp = dir.join("oh-my-posh");
    std::fs::create_dir_all(&omp).unwrap();
    std::fs::write(omp.join("oh-my-posh.exe"), []).unwrap();
    std::fs::write(omp.join("gencore-prompt.ps1"), "#").unwrap();
    std::fs::write(omp.join("gencore-polar-night.omp.json"), "{}").unwrap();
    assert!(resolve_oh_my_posh(Some(&dir), None).is_none());
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn strip_verbatim_prefix_removes_windows_extended_path() {
    let verbatim = PathBuf::from(r"\\?\C:\theme.json");
    let stripped = strip_verbatim_prefix(&verbatim);
    assert_eq!(stripped, PathBuf::from(r"C:\theme.json"));
    assert_eq!(
        strip_verbatim_prefix(&PathBuf::from(r"C:\theme.json")),
        PathBuf::from(r"C:\theme.json")
    );
}

#[test]
fn shell_launch_plain_is_nologo_only() {
    let launch = shell_launch(None);
    let args: Vec<String> = launch.args.iter().map(|a| a.to_string_lossy().into_owned()).collect();
    assert_eq!(args, vec!["-NoLogo"]);
    assert!(launch.path.is_none());
    assert!(launch.posh_theme.is_none());
}

#[test]
fn shell_launch_omp_includes_noexit_and_file() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-launch-{}", std::process::id()));
    let omp_dir = dir.join("oh-my-posh");
    std::fs::create_dir_all(&omp_dir).unwrap();
    std::fs::write(omp_dir.join("oh-my-posh.exe"), b"MZ").unwrap();
    std::fs::write(omp_dir.join("gencore-prompt.ps1"), "#").unwrap();
    std::fs::write(omp_dir.join("gencore-polar-night.omp.json"), "{}").unwrap();
    let omp = resolve_oh_my_posh(Some(&dir), None).expect("omp");
    let launch = shell_launch(Some(&omp));
    let args: Vec<String> = launch.args.iter().map(|a| a.to_string_lossy().into_owned()).collect();
    assert!(args.contains(&"-NoLogo".into()));
    assert!(args.contains(&"-NoProfile".into()));
    assert!(args.contains(&"-NoExit".into()));
    assert!(args.contains(&"-File".into()));
    assert!(!args.iter().any(|a| a.starts_with(r"\\?\")));
    let theme = launch.posh_theme.expect("theme");
    assert!(!theme.to_string_lossy().starts_with(r"\\?\"));
    assert!(launch.path.is_some());
    let _ = std::fs::remove_dir_all(&dir);
}
```

Also change `std::fs::write(omp.join("oh-my-posh.exe"), [])` / `std::fs::write(nested.join("oh-my-posh.exe"), [])` in `resolve_oh_my_posh_uses_absolute_theme_json` and `resolve_oh_my_posh_accepts_resources_subdirectory` to `b"MZ"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test -p gencore-pty --test session_commands shell_launch_omp_includes_noexit_and_file strip_verbatim_prefix_removes_windows_extended_path resolve_oh_my_posh_none_when_exe_is_zero_bytes`

Expected: FAIL compile (`shell_launch` / `strip_verbatim_prefix` not found) or FAIL assert (`resolve_oh_my_posh` still accepts a 0-byte exe).

- [ ] **Step 3: Write minimal implementation**

In `session_shell.rs`, add:

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShellLaunch {
    pub program: PathBuf,
    pub args: Vec<OsString>,
    pub path: Option<OsString>,
    pub posh_theme: Option<PathBuf>,
}

pub fn strip_verbatim_prefix(path: &Path) -> PathBuf {
    let text = path.to_string_lossy();
    match text.strip_prefix(r"\\?\") {
        Some(rest) => PathBuf::from(rest),
        None => path.to_path_buf(),
    }
}

pub fn shell_launch(omp: Option<&OhMyPoshSpawn>) -> ShellLaunch {
    let program = resolve_shell();
    match omp {
        None => ShellLaunch {
            program,
            args: vec![OsString::from("-NoLogo")],
            path: None,
            posh_theme: None,
        },
        Some(omp) => ShellLaunch {
            program,
            args: vec![
                OsString::from("-NoLogo"),
                OsString::from("-NoProfile"),
                OsString::from("-NoExit"),
                OsString::from("-ExecutionPolicy"),
                OsString::from("Bypass"),
                OsString::from("-File"),
                strip_verbatim_prefix(&omp.prompt_script).into_os_string(),
            ],
            path: Some(prepend_path(&omp.dir)),
            posh_theme: Some(strip_verbatim_prefix(&omp.theme)),
        },
    }
}
```

In `oh_my_posh_dir`, replace `exe.is_file() && ps1.is_file()` with `is_real_executable(&exe) && ps1.is_file()`.

Re-export from `session/mod.rs` and `lib.rs`:

```rust
pub use session_shell::{
    OhMyPoshSpawn, ShellLaunch, is_real_executable, resolve_oh_my_posh, resolve_shell,
    shell_launch, strip_verbatim_prefix,
};
```

(`lib.rs` already re-exports from `modules::session`; add the new names to that list.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p gencore-pty --test session_commands`

Expected: PASS (including the updated resolver tests).

- [ ] **Step 5: Commit**

```bash
git add crates/gencore-plugin-pty/src/modules/session/session_shell.rs crates/gencore-plugin-pty/src/modules/session/mod.rs crates/gencore-plugin-pty/src/lib.rs crates/gencore-plugin-pty/tests/session_commands.rs
git commit -m "fix(pty): require a real Oh My Posh exe and build -NoExit launch args"
```

---

### Task 2: Spawn through `shell_launch` and stay alive

**Files:**
- Modify: `crates/gencore-plugin-pty/src/modules/session/session_map.rs`
- Test: `crates/gencore-plugin-pty/tests/session_commands.rs`

**Interfaces:**
- Consumes: `shell_launch(Option<&OhMyPoshSpawn>) -> ShellLaunch` from Task 1
- Produces: `spawn_session` uses `ShellLaunch.program` / `args` / `path` / `posh_theme`. No DSR handling in the reader.

- [ ] **Step 1: Write the failing integration test**

Append to `session_commands.rs` (Windows only, same DSR helper as `exited_shell_is_reaped_from_the_session_map`):

```rust
#[cfg(windows)]
#[test]
fn omp_file_spawn_stays_alive_and_echoes() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-omp-live-{}", std::process::id()));
    let omp = dir.join("oh-my-posh");
    std::fs::create_dir_all(&omp).unwrap();
    std::fs::write(omp.join("oh-my-posh.exe"), b"MZ").unwrap();
    std::fs::write(omp.join("gencore-prompt.ps1"), "# noop\r\n").unwrap();
    std::fs::write(omp.join("gencore-polar-night.omp.json"), "{}").unwrap();

    let map = Arc::new(Mutex::new(SessionMap::new()));
    let (data_tx, data_rx) = mpsc::channel();
    let (exit_tx, exit_rx) = mpsc::channel();
    let session_id = spawn_session(
        &map,
        OpenArgs {
            cols: 80,
            rows: 24,
            cwd: None,
            theme: None,
        },
        Some(dir.clone()),
        move |payload| {
            let _ = data_tx.send(payload);
        },
        move |payload| {
            let _ = exit_tx.send(payload);
        },
    )
    .expect("spawn_session");
    let _guard = KillOnDrop {
        map: Arc::clone(&map),
        session_id: session_id.clone(),
    };

    let deadline = Instant::now() + Duration::from_secs(15);
    let mut text = String::new();
    let mut wrote_echo = false;
    while Instant::now() < deadline {
        if exit_rx.try_recv().is_ok() {
            panic!("shell exited; -NoExit missing. output so far: {text:?}");
        }
        while let Ok(payload) = data_rx.try_recv() {
            let raw = STANDARD.decode(&payload.data).unwrap_or_default();
            text.push_str(&String::from_utf8_lossy(&raw));
        }
        if text.contains(CURSOR_POSITION_REQUEST) {
            text = text.replace(CURSOR_POSITION_REQUEST, "");
            let _ = write_session(&map, &session_id, "\u{1b}[1;1R");
        }
        if !wrote_echo && Instant::now() > deadline - Duration::from_secs(12) {
            let _ = write_session(&map, &session_id, "echo gencore-alive\r");
            wrote_echo = true;
        }
        if text.contains("gencore-alive") {
            assert!(
                map.lock().expect("map").contains_key(&session_id),
                "session must remain in the map after echo"
            );
            let _ = std::fs::remove_dir_all(&dir);
            return;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    let _ = std::fs::remove_dir_all(&dir);
    panic!("no echo within 15s; output so far: {text:?}");
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cargo test -p gencore-pty --test session_commands omp_file_spawn_stays_alive_and_echoes -- --nocapture`

Expected: FAIL (`shell exited; -NoExit missing` or no echo) because `spawn_session` still uses `-File` without `-NoExit`.

- [ ] **Step 3: Write minimal implementation**

In `session_map.rs`, replace the `resolve_shell` / `prepend_path` imports with `shell_launch` (keep `resolve_oh_my_posh`). Replace the `CommandBuilder` block with:

```rust
    let omp = resolve_oh_my_posh(resource_dir.as_deref(), args.theme.as_deref());
    let launch = shell_launch(omp.as_ref());
    let mut cmd = CommandBuilder::new(&launch.program);
    for arg in &launch.args {
        cmd.arg(arg);
    }
    if let Some(path) = &launch.path {
        cmd.env("PATH", path);
    }
    if let Some(theme) = &launch.posh_theme {
        cmd.env("POSH_THEME", theme);
    }
```

Do not add DSR replies in `read_output`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p gencore-pty --test session_commands`

Expected: PASS, including `omp_file_spawn_stays_alive_and_echoes` and `open_echo_and_close`.

- [ ] **Step 5: Commit**

```bash
git add crates/gencore-plugin-pty/src/modules/session/session_map.rs crates/gencore-plugin-pty/tests/session_commands.rs
git commit -m "fix(pty): keep Oh My Posh -File sessions interactive"
```

---

### Task 3: Listen before the first `openPty`

**Files:**
- Modify: `apps/terminal/src/modules/terminal/terminal.hook.ts`
- Test: `apps/terminal/tests/unit/terminal.provider.test.tsx`

**Interfaces:**
- Consumes: `subscribePtyData`, `subscribePtyExit`, `openPty` as today
- Produces: boot sequence `await listen data+exit` then `restorePinned` / `spawnSession`. Existing handler bodies stay the same in this task.

- [ ] **Step 1: Write the failing test**

In `terminal.provider.test.tsx`, add a `holdDataListen` flag and capture the data listener the same way exit is captured. Default remains “resolve immediately” so existing tests keep working:

```tsx
import type { PtyDataPayload, PtyExitPayload } from "../../src/modules/ipc/ipc.types";

let dataHandler: ((payload: PtyDataPayload) => void) | null = null;
let exitHandler: ((payload: PtyExitPayload) => void) | null = null;
let holdDataListen = false;
let releaseDataListen: (() => void) | null = null;

vi.mock("../../src/modules/ipc/ipc.pty", () => ({
  openPty: (...args: unknown[]) => openPty(...(args as [])),
  writePty: (...args: unknown[]) => writePty(...(args as [])),
  resizePty: (...args: unknown[]) => resizePty(...(args as [])),
  closePty: (...args: unknown[]) => closePty(...(args as [])),
  subscribePtyData: (handler: (payload: PtyDataPayload) => void) => {
    dataHandler = handler;
    if (holdDataListen) {
      return new Promise<() => void>((resolve) => {
        releaseDataListen = () => resolve(() => undefined);
      });
    }
    return Promise.resolve(() => undefined);
  },
  subscribePtyExit: (handler: (payload: PtyExitPayload) => void) => {
    exitHandler = handler;
    return Promise.resolve(() => undefined);
  },
}));
```

In `beforeEach`, set `holdDataListen = false`, `dataHandler = null`, `releaseDataListen = null`.

Add this exact test. `restorePinned` is what creates the first tab and calls `openPty`, so there are zero tabs until listen resolves — do not assert `tabs.length` first.

```tsx
  it("does not open a pty until data listen resolves", async () => {
    holdDataListen = true;
    renderProvider();

    await Promise.resolve();
    await Promise.resolve();
    expect(openPty).not.toHaveBeenCalled();

    releaseDataListen?.();

    await waitFor(() => {
      expect(openPty).toHaveBeenCalled();
    });
  });
```

Today `restorePinned` runs in parallel with listen, so `openPty` is already called while `holdDataListen` is still pending and the assertion fails.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/terminal.provider.test.tsx`

Expected: FAIL `does not open a pty until data listen resolves` (`openPty` already called).

- [ ] **Step 3: Write minimal implementation**

In `TerminalProvider`’s mount `useEffect` in `terminal.hook.ts`, do not call `void restorePinned()` beside the listens. Await both listens, then hydrate:

```ts
    void (async () => {
      try {
        const stopData = await subscribePtyData((payload) => {
          // existing data-handler body unchanged in this task
        });
        const stopExit = await subscribePtyExit((payload) => {
          // existing exit-handler body unchanged in this task
        });
        if (cancelled) {
          stopData();
          stopExit();
          return;
        }
        unlistenData = stopData;
        unlistenExit = stopExit;
        await restorePinned();
      } catch {
        if (!cancelled) {
          await restorePinned();
        }
      }
    })();
```

Keep the `pagehide` / `visibilitychange` listeners and the cleanup that calls `unlistenData` / `unlistenExit` / `flushSave` / `killSession`.

Do **not** skip `restorePinned` if listen throws — a tab must still appear (catch path). Listen failure is already silent today.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/terminal.provider.test.tsx`

Expected: PASS, including existing lifecycle tests and the new listen-order test.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/terminal/terminal.hook.ts apps/terminal/tests/unit/terminal.provider.test.tsx
git commit -m "fix(terminal): attach PTY listeners before the first open"
```

---

### Task 4: Park inbound orphans and queue outbound input

**Files:**
- Modify: `apps/terminal/src/modules/terminal/terminal.hook.ts`
- Modify: `apps/terminal/src/modules/terminal/terminal.component.tsx`
- Test: `apps/terminal/tests/unit/terminal.provider.test.tsx`

**Interfaces:**
- Consumes: Task 3 listen-first boot; `registerWriter(tabId, write)`; `onTerminalInput(tabId, data)`
- Produces:
  - Inbound: `Map<sessionId, Uint8Array[]>` orphans flushed when `updateTab` sets `sessionId`
  - Outbound: `Map<tabId, string[]>` pending input flushed through `writeSession` + `chunkPtyWrite` when `open` returns
  - `dropTabRuntime` / spawn-fail / close deletes both maps for that tab/session
  - `TerminalHostPane` calls `onData` before `registerWriter`

- [ ] **Step 1: Write the failing tests**

Add to the same describe (uses `dataHandler` and a delayed `openPty` from Task 3):

```tsx
  it("delivers data parked by session id after open assigns it", async () => {
    let resolveOpen: ((value: { session_id: string }) => void) | undefined;
    openPty.mockImplementation(
      () =>
        new Promise<{ session_id: string }>((resolve) => {
          resolveOpen = resolve;
        }),
    );
    renderProvider();
    await waitFor(() => {
      expect(session?.tabs[0]?.id).toBeTruthy();
    });
    const tabId = session?.tabs[0]?.id ?? "";
    const writer = vi.fn();
    session?.registerWriter(tabId, writer);

    const dsr = btoa("\u001b[6n");
    dataHandler?.({ session_id: "session-1", data: dsr });
    expect(writer).not.toHaveBeenCalled();

    resolveOpen?.({ session_id: "session-1" });

    await waitFor(() => {
      expect(writer).toHaveBeenCalled();
    });
    const written = writer.mock.calls[0]?.[0] as Uint8Array;
    expect(new TextDecoder().decode(written)).toContain("\u001b[6n");
  });

  it("writes onTerminalInput after open resolves", async () => {
    let resolveOpen: ((value: { session_id: string }) => void) | undefined;
    openPty.mockImplementation(
      () =>
        new Promise<{ session_id: string }>((resolve) => {
          resolveOpen = resolve;
        }),
    );
    renderProvider();
    await waitFor(() => {
      expect(session?.tabs[0]?.id).toBeTruthy();
    });
    const tabId = session?.tabs[0]?.id ?? "";
    session?.onTerminalInput(tabId, "\u001b[1;1R");
    expect(writePty).not.toHaveBeenCalled();

    resolveOpen?.({ session_id: "session-1" });

    await waitFor(() => {
      expect(writePty).toHaveBeenCalledWith("session-1", "\u001b[1;1R");
    });
  });

  it("drops orphan data when the tab is closed before open assigns the id", async () => {
    let resolveOpen: ((value: { session_id: string }) => void) | undefined;
    openPty.mockImplementation(
      () =>
        new Promise<{ session_id: string }>((resolve) => {
          resolveOpen = resolve;
        }),
    );
    renderProvider();
    await waitFor(() => {
      expect(session?.tabs[0]?.id).toBeTruthy();
    });
    const firstId = session?.tabs[0]?.id ?? "";
    dataHandler?.({ session_id: "session-1", data: btoa("stale") });
    session?.closeTab(firstId);

    openPty.mockImplementation(() => Promise.resolve({ session_id: "session-2" }));
    resolveOpen?.({ session_id: "session-1" });

    await waitFor(() => {
      expect(session?.tabs[0]?.sessionId).toBe("session-2");
    });
    const writer = vi.fn();
    session?.registerWriter(session?.tabs[0]?.id ?? "", writer);
    expect(writer).not.toHaveBeenCalled();
  });
```

`closeTab` on the last tab creates a fresh tab and calls `spawnSession` again — the third test must not leak `session-1` bytes into the new tab’s writer.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/terminal.provider.test.tsx`

Expected: FAIL — parked `6n` never reaches the writer; CPR is dropped; (orphan leak may also fail).

- [ ] **Step 3: Write minimal implementation**

In `terminal.hook.ts`:

```ts
  const orphansRef = React.useRef(new Map<string, Uint8Array[]>());
  const pendingInputRef = React.useRef(new Map<string, string[]>());

  const deliverBytes = React.useCallback((tabId: string, bytes: Uint8Array) => {
    const write = writersRef.current.get(tabId);
    if (write) {
      write(bytes);
      return;
    }
    const queue = queuesRef.current.get(tabId) ?? [];
    queue.push(bytes);
    queuesRef.current.set(tabId, queue);
  }, []);

  const flushOrphans = React.useCallback(
    (sessionId: string, tabId: string) => {
      const parked = orphansRef.current.get(sessionId);
      if (!parked) {
        return;
      }
      orphansRef.current.delete(sessionId);
      for (const chunk of parked) {
        deliverBytes(tabId, chunk);
      }
    },
    [deliverBytes],
  );

  const flushPendingInput = React.useCallback(
    (tabId: string, sessionId: string) => {
      const pending = pendingInputRef.current.get(tabId);
      if (!pending) {
        return;
      }
      pendingInputRef.current.delete(tabId);
      for (const data of pending) {
        void writeSession(tabId, sessionId, data);
      }
    },
    [writeSession],
  );
```

In `spawnSession`, after `updateTab(tabId, { sessionId, status: "live" })`:

```ts
        updateTab(tabId, { sessionId, status: "live" });
        flushOrphans(sessionId, tabId);
        flushPendingInput(tabId, sessionId);
```

In the spawn `catch` that marks exited, `pendingInputRef.current.delete(tabId)`.

In `dropTabRuntime(id)`:

```ts
    const tab = tabsRef.current.find((item) => item.id === id);
    if (tab?.sessionId) {
      orphansRef.current.delete(tab.sessionId);
    }
    pendingInputRef.current.delete(id);
```

Also delete orphans for a session id when `subscribePtyExit` handles that id (before or after `killSession`).

Replace the data-handler “no tab → return” with:

```ts
      const tab = tabsRef.current.find((item) => item.sessionId === payload.session_id);
      if (!tab) {
        const parked = orphansRef.current.get(payload.session_id) ?? [];
        parked.push(bytes);
        orphansRef.current.set(payload.session_id, parked);
        return;
      }
      deliverBytes(tab.id, bytes);
```

Keep OSC 7 / pinned `scheduleSave` on the owned-tab path only.

Replace the `onTerminalInput` `if (!tab.sessionId) return` with:

```ts
      if (!tab.sessionId) {
        const pending = pendingInputRef.current.get(tabId) ?? [];
        pending.push(data);
        pendingInputRef.current.set(tabId, pending);
        return;
      }
```

Do not queue Enter on an `exited` tab — the existing restart branch stays first.

In `terminal.component.tsx` `TerminalHostPane`, subscribe `onData` **before** `registerWriter`:

```ts
    const dataSub = host.terminal.onData((data) => {
      sessionRef.current.onTerminalInput(tab.id, data);
    });
    const unreg = sessionRef.current.registerWriter(tab.id, (data) => {
      host.terminal.write(data);
    });
    const unregSerialize = sessionRef.current.registerSerializer(tab.id, () =>
      host.serialize.serialize(),
    );
    onRegisterRef.current(tab.id, host);
```

Keep `attachCustomKeyEventHandler` and the rAF fit/focus. Dispose `dataSub` / `unreg` / `unregSerialize` in the same cleanup.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/terminal.provider.test.tsx`

Expected: PASS all cases in that file.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/terminal/terminal.hook.ts apps/terminal/src/modules/terminal/terminal.component.tsx apps/terminal/tests/unit/terminal.provider.test.tsx
git commit -m "fix(terminal): join early PTY bytes and xterm input to the session"
```

---

### Task 5: Scoped verification

**Files:** none new (run only)

**Interfaces:**
- Consumes: Tasks 1–4
- Produces: confirmation that crate + provider tests pass together

- [ ] **Step 1: Run crate tests**

Run: `cargo test -p gencore-pty`

Expected: PASS.

- [ ] **Step 2: Run Terminal provider tests**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/terminal.provider.test.tsx`

Expected: PASS.

- [ ] **Step 3: Manual check (implementer machine)**

Run: `pnpm --filter @gencore/terminal tauri:dev`

If port 5173 is already in use, stop the leftover Vite/Tauri process first.

Expected in the app:

- 2-line Nord Oh My Posh prompt (when `oh-my-posh.exe` is present)
- Typing echoes
- New tab and Restart stay alive (no immediate Exited)
- Chrome still renders (freezePrototype patch untouched)

- [ ] **Step 4: Commit**

No commit unless Steps 1–3 found a follow-up fix. If they did, commit only that fix with a `fix(pty):` or `fix(terminal):` message.

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
| --- | --- |
| `-NoExit` on OMP `-File` argv | 1 (args) + 2 (spawn) |
| Fallback `pwsh -NoLogo` when OMP missing | 1 `shell_launch(None)` |
| `is_real_executable` on `oh-my-posh.exe` | 1 |
| Strip `\\?\` before PowerShell | 1 `strip_verbatim_prefix` |
| No Rust DSR auto-reply | 2 (explicit) |
| Listen before `openPty` | 3 |
| Park inbound by `session_id` | 4 |
| Queue outbound until `sessionId` | 4 |
| `onData` before `registerWriter` | 4 |
| Drop orphans on close | 4 |
| Isolation chunking unchanged | 4 uses `writeSession` / `chunkPtyWrite` |
| No xterm patch / telemetry / Explorer | File map + constraints |
| Rust live-echo integration test | 2 |
| Frontend three tests | 3 + 4 |

**Placeholder scan:** none.

**Type consistency:** `ShellLaunch` / `shell_launch` / `strip_verbatim_prefix` names match across Task 1–2. Frontend uses `orphansRef` (`sessionId` → `Uint8Array[]`) and `pendingInputRef` (`tabId` → `string[]`).
