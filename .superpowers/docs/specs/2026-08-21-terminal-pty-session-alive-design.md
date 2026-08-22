# Terminal PTY session stays alive and answers ConPTY

Date: 2026-08-21
Status: approved
Packages: `@gencore/terminal`, crate `gencore-pty`

Related: [2026-08-20-terminal-window-design.md](./2026-08-20-terminal-window-design.md) (Oh My Posh spawn). Does not change [2026-08-21-terminal-telemetry-statusbar-design.md](./2026-08-21-terminal-telemetry-statusbar-design.md).

## Problem

The Terminal chrome works (tabs, Files pane, `pwsh · cols×rows`). The xterm surface is blank: no 2-line Oh My Posh prompt, no cursor echo, typing does nothing useful. Pinning is unrelated.

Two independent bugs:

1. When bundled `oh-my-posh.exe` exists, `spawn_session` runs `pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File gencore-prompt.ps1` **without `-NoExit`**. That script only defines `Prompt` and ends. PowerShell then exits. `Prompt` never runs in an interactive host, so the capsule prompt never appears.
2. ConPTY emits Device Status Report `ESC [6n` as soon as the child starts. The shell does not reach a prompt until the terminal replies `ESC [row;col R`. The UI drops that handshake:
   - `gencore-pty://data` is matched with `tab.sessionId === payload.session_id`. `sessionId` is assigned only after `openPty` returns, so the first chunks (including `6n`) are discarded. The per-tab write queue never sees them.
   - xterm’s CPR reply goes through `onTerminalInput`, which returns when `sessionId` is still null.
   - `restorePinned` / `spawnSession` race `subscribePtyData` / `subscribePtyExit`. Events emitted before `listen` completes are lost. A missed exit leaves a “live” tab over a reaped session.

`pwsh · 95×29` only proves FitAddon measured the host. Empty statusbar cwd means OSC 7 never arrived.

This is not the `freezePrototype` import-time crash (`KeyCodeUtils.toString`). That blanks the **entire** WebView. Chrome visible means `@xterm/xterm@6.0.0` already loaded the patched bundle. Do not change `patches/@xterm__xterm@6.0.0.patch`.

## Goals

- A new or restored tab keeps an interactive PowerShell after the prompt script runs.
- The 2-line Nord Oh My Posh prompt appears when `oh-my-posh.exe` and `gencore-prompt.ps1` resolve; otherwise keep today’s `pwsh -NoLogo` fallback.
- ConPTY `ESC [6n` reaches xterm and the CPR is written to the same session, even if those bytes arrive before the tab owns `sessionId`.
- Keystrokes typed before `openPty` resolves are not dropped.
- Event listeners are attached before the first `openPty`.
- Typed errors, Isolation, capabilities, and the four PTY commands stay as they are.

## Non-goals

- Telemetry statusbar, side-panel toggle, or dropping `pwsh · cols×rows`.
- Changing the xterm freezePrototype patch or disabling `freezePrototype`.
- Rust auto-answering DSR (would double-reply if xterm also answers).
- Explorer PTY, new IPC commands, or new Isolation grants.
- Rewriting `gencore-prompt.ps1` beyond what spawn argv already requires.

## Approach

Keep xterm as the only DSR responder. Make spawn actually interactive. Make the frontend hold early I/O until the tab and the PTY UUID are joined.

```text
listen data+exit
    → hydrate / spawn
    → ConPTY ESC[6n
    → park by session_id if no tab owns it
    → updateTab(sessionId)
    → flush to xterm
    → onData CPR
    → queue if sessionId still null, else writePty
    → Prompt runs (shell still alive because -NoExit)
```

## Units

### 1. `gencore-pty` shell launch

- **Files:** `crates/gencore-plugin-pty/src/modules/session/session_shell.rs`, `session_map.rs`
- **Does:** `shell_launch` returns program, args, and optional env (`PATH`, `POSH_THEME`).
- **OMP resolved:** `-NoLogo -NoProfile -NoExit -ExecutionPolicy Bypass -File <gencore-prompt.ps1>`. Prepend the OMP dir to `PATH`. Set `POSH_THEME` to the theme JSON.
- **OMP missing:** `pwsh`/`powershell` `-NoLogo` only (today’s fallback).
- **Paths:** Strip a Windows `\\?\` prefix from `-File` and `POSH_THEME` before they reach PowerShell. `is_real_executable` skips 0-byte `pwsh` App Execution Alias stubs and 0-byte `oh-my-posh.exe` (missing fetch / LFS pointer). A zero-byte OMP exe does not resolve; spawn uses the `-NoLogo` fallback.
- **Does not:** Add commands, change event names, or answer `ESC [6n` in the reader.

### 2. Terminal session-ready I/O

- **Files:** `apps/terminal/src/modules/terminal/terminal.hook.ts`, `terminal.component.tsx`
- **Listen first:** Await `subscribePtyData` and `subscribePtyExit` before `restorePinned` or any `openPty`.
- **Orphan data:** Park `gencore-pty://data` whose `session_id` no tab owns, keyed by that UUID. When `updateTab` assigns the id, flush into the existing writer / `queuesRef` path.
- **Outbound queue:** Buffer `onTerminalInput` while `sessionId` is null; flush through `writeSession` + `chunkPtyWrite` when `open` returns.
- **Host order:** In `TerminalHostPane`, subscribe `terminal.onData` before `registerWriter` so a flushed `6n` can emit a CPR.
- **Does not:** Answer DSR in the JS data handler (that would double-reply once xterm parses `6n`).

## Error handling

- Spawn / invalid cwd / session-not-found stay on the existing typed errors and UI (`exited` + Restart).
- Isolation write size cap unchanged (`MAX_PTY_WRITE_CHARS`).
- Orphan buffers are dropped when the matching session is closed or the tab is removed, so a replaced spawn cannot replay another session’s bytes.

## Testing

- **Rust (`crates/gencore-plugin-pty/tests/session_commands.rs`):** `shell_launch` includes `-NoExit` only when OMP resolved. Integration: temp resource dir with a noop `gencore-prompt.ps1`, dummy `oh-my-posh.exe`, and theme JSON; spawn; answer DSR; write an `echo` marker; assert the marker returns and the session is still in the map.
- **Terminal (`apps/terminal/tests/unit/terminal.provider.test.tsx`):** Unmatched data payload is delivered to the writer only after `sessionId` is assigned. `onTerminalInput` before `openPty` resolves is written afterward. `openPty` is not called until `subscribePtyData` resolves.

## Release

- `@gencore/terminal` is private; `gencore-pty` has no JS changeset.
- Do not bump major versions.

## Decisions

| Topic | Decision |
| --- | --- |
| Scope | Terminal PTY lifecycle only |
| OMP argv | Add `-NoExit`; keep `-File gencore-prompt.ps1` |
| DSR responder | xterm only, after orphan flush |
| Early inbound data | Park by Rust `session_id`, then flush |
| Early outbound data | Queue until `sessionId` exists |
| Listen vs spawn | Listen both events, then hydrate |
| Verbatim paths | Strip `\\?\` before PowerShell |
| xterm patch | Unchanged |
