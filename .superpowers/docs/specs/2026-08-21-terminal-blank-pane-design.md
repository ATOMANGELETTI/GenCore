# Terminal blank pane: evidence-first fix and visual proof

Date: 2026-08-21
Status: approved
Packages: `@gencore/terminal`, crate `gencore-pty`

Related: [2026-08-21-terminal-pty-session-alive-design.md](./2026-08-21-terminal-pty-session-alive-design.md) (listen-first, orphan DSR, `-NoExit`) and [2026-08-20-terminal-window-design.md](./2026-08-20-terminal-window-design.md) (xterm + ConPTY + Oh My Posh spawn). Does not change [2026-08-21-terminal-telemetry-statusbar-design.md](./2026-08-21-terminal-telemetry-statusbar-design.md).

This spec does **not** undo the session-alive work. It forbids a third speculative patch. Name the failing layer on the real WebView, fix only that layer, and prove the window with Playwright over WebView2 CDP.

## Problem

Two implementation passes (`terminal-window`, `pty-session-alive`) reported green unit tests. Controller notes recorded that `tauri:dev` was never visually checked. The running app still shows a dead PowerShell pane: chrome, Files tree, and telemetry work; the xterm surface is a flat Polar Night rectangle with no cursor, no prompt, and no useful typing.

The user reproduced this with PowerShell 7 installed and with 7 absent (5.1). The shared path is broken. This is not “wrong `pwsh` vs `powershell.exe`.”

A healthy xterm draws a blinking cursor with zero PTY bytes. A missing cursor is therefore not explained by ConPTY `ESC [6n` alone. Session-alive may still be necessary; it is not sufficient, and it was never proven on the window.

Bundled `oh-my-posh.exe` is gitignored and is not on disk. Spawn already uses the `-NoLogo` fallback. A healthy session must show a default PowerShell prompt before Oh My Posh can be blamed.

This is not the `freezePrototype` import-time crash (`KeyCodeUtils.toString`). That blanks the entire WebView. Chrome visible means the patched `@xterm/xterm@6.0.0` loaded. Do not change `patches/@xterm__xterm@6.0.0.patch` or disable `freezePrototype`.

jsdom and Playwright against `http://localhost:5173` cannot prove PTY: that page has no Tauri IPC.

## Goals

Slice 1 and slice 2 are sequential. Slice 2 does not start until the slice 1 visual gate is green.

### Slice 1

- A new tab shows a blinking cursor and a default interactive PowerShell prompt (5.1 or 7, whichever `resolve_shell` picks).
- Typing works. `echo gencore-pty-alive` then Enter echoes that marker in the same session.
- Subscribe and open failures are visible (Exited + reason). They must not leave a `live` blank tab.
- Playwright attached to the **real WebView2** proves the above. Unit tests do not count as done.

### Slice 2

- When a non-zero `oh-my-posh.exe` and `gencore-prompt.ps1` resolve, the 2-line Nord Oh My Posh prompt appears and the session stays interactive.
- Missing or zero-byte exe keeps the slice 1 default prompt. Never a blank pane.

## Non-goals

- Explorer PTY.
- New IPC commands, Isolation grants, or `core:default`.
- Answering `ESC [6n` in Rust or in the JS data handler (xterm remains the only DSR responder).
- Changing `freezePrototype` or the xterm `toString` patch.
- Telemetry, side-panel, or Files-tab work.
- Rewriting `gencore-prompt.ps1` beyond what spawn argv already requires.
- Committing `oh-my-posh.exe` unless the user later asks.
- Using `http://localhost:5173` as a stand-in for the visual gate.

## Approach

Evidence-first, one layer, then a surgical fix. Oh My Posh is a second slice.

```text
attach Playwright → WebView2 CDP (tauri:dev debug port)
    → classify layer (surface / session / transport / handshake / shell)
    → write the layer into the implementation plan
    → fix only that layer
    → visible subscribe/open errors (always)
    → CDP visual gate: canvas, cursor/glyphs, echo marker
    → (slice 2) fetch real oh-my-posh.exe
    → CDP visual gate: 2-line prompt + echo still works
```

Probe, named-layer fix, Playwright wiring, and reviews run on **Sonnet 5**. Do not start any task on Opus 5. Do not use Opus for a second try at the same prompt, for plan writing, or for mechanical test/script work.

Elevate to Opus 5 only when **all** of these are true:

1. Sonnet 5 already ran the probe or the named-layer fix and produced written evidence (layer, CDP facts, what it changed).
2. It still cannot name a single layer, or the CDP gate is still red after that named-layer fix.
3. The next step is a **different** approach (not the same patch again).

If Opus is used, one focused dispatch only. If that also fails, stop and ask the user — do not loop Opus.

## Units

### 1. Diagnosis protocol

- **When:** First implementation task, before any product fix.
- **How:** `tauri:dev` sets `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223` (script / env only). Not present in `package:win64`. Playwright connects over CDP to `http://127.0.0.1:9223`, not to Vite 5173.
- **Order:** stop at the first failing layer.

| Layer | Question | If no |
| --- | --- | --- |
| Surface | `.xterm` in the pane? Canvas width and height > 0? | Layout / CSS / fit / renderer. A missing cursor almost always dies here. |
| Session | `plugin:gencore-pty\|open` returned a UUID? Tab still `live`? | Isolation open args, capability, or spawn. |
| Transport | `listen` for `gencore-pty://data` succeeded? Chunks arriving? | Isolation `listen` reconstruct, emit from the reader thread, or the silent `catch` that hydrates after subscribe throws. |
| Handshake | Bytes are only `ESC [6n`? | CPR never written back. Only then reuse session-alive orphan/pending logic. |
| Shell | After handshake, still no prompt text? | Argv / 5.1 vs 7 / profile. Oh My Posh is slice 2, not this layer’s default explanation. |

- **Output:** one named layer plus the evidence, written into the implementation plan. No cross-layer speculative patch.

### 2. Dev-only test seams

- **Files:** `apps/terminal/src/modules/terminal/terminal.component.tsx`, `apps/terminal` `tauri:dev` script / env only.
- **Does:** Host pane sets `data-status`, `data-cols`, `data-rows`, `data-has-output` (`true` after printable PTY bytes). `data-session-id` is the UUID while live and omitted when null. In `tauri:dev` only, the host node may hold an xterm handle so CDP can read the buffer.
- **Does not:** Add IPC, `window.__TAURI__`, production PTY byte logs, or a debug port on the portable ZIP.

### 3. Slice 1 fix

- **Files:** only those the named layer requires. Likely `terminal.component.tsx` / `terminal.xterm.ts` (surface), `terminal.hook.ts` (session / transport / handshake), Isolation hook (transport, only if CDP shows a drop), or `gencore-pty` session modules (session / shell).
- **Fix rule:** change only the named layer, plus the mandatory silent-`catch` removal below. No drive-by rewrite of hook, Isolation, or spawn.
- **Always (in addition to the named layer):** if `subscribePtyData` or `subscribePtyExit` throws, do **not** call `restorePinned` / `spawnSession` in the `catch`. Show Exited + reason. `open` / Isolation reject / spawn fail already map to Exited; the typed reason must reach the UI.
- **Per-layer patches (use only if that layer failed):**
  - **Surface:** Host node has height before `fit()`; refit on the host `ResizeObserver`, not only the viewport. Do not apply `invisible` to the active pane. DOM or WebGL renderer only if a canvas exists and never paints. Existing test that forbids WebGL stays unless the probe proves canvas cannot paint.
  - **Session:** Keep Isolation `theme` / `cwd` / `cols` / `rows` unless the probe shows a reject.
  - **Transport:** Fix Isolation `listen` reconstruct only if CDP shows the hook dropping it.
  - **Handshake:** Keep xterm as the only DSR responder. Touch orphan / pending queues only if `ESC [6n` arrives and no CPR goes out.
- **Does not:** Answer DSR in Rust or in the JS data handler.

### 4. Slice 2 Oh My Posh

- **When:** After the slice 1 CDP gate is green.
- **Does:** Run `scripts/fetch-oh-my-posh.ps1` so a real non-zero exe lands under `apps/terminal/src-tauri/resources/oh-my-posh/`. Keep the exe gitignored. Confirm `tauri.conf` resource paths resolve at `tauri:dev` and `package:win64`; fix the path only if Rust still resolves `None` after the exe exists.
- **Keep:** `-NoExit -File gencore-prompt.ps1`, `\\?\` strip, skip 0-byte exe, `POSH_THEME` + PATH prepend, Polar Night / Snow Storm JSON, theme swap. `gencore-prompt.ps1` stays Prompt-only.
- **Does not:** New IPC, Isolation, capabilities, or xterm patch edits.

## Error handling

- Subscribe throw → no spawn, Exited + reason on the pane.
- Open / Isolation reject / spawn fail → Exited + reason.
- Write / resize `SessionNotFound` → existing Exited path.
- Tab replaced or closed → drop orphans and pending input for that session/tab.
- Oh My Posh missing or 0-byte → `-NoLogo` fallback, not an error. Blank pane is not an acceptable fallback.
- Playwright cannot attach to the WebView2 debug port → fail the test. Do not fall back to `http://localhost:5173`.
- No production dumps of PTY bytes.

## Testing

| Kind | Role |
| --- | --- |
| Probe (Sonnet 5, once) | Names the layer. Written into the plan. Not a CI job. |
| Playwright + WebView2 CDP | Done bar for both slices. |
| Provider / Isolation unit | Lock the silent-`catch` fix and any Isolation `listen` change. jsdom does not prove the window. |
| `cargo test -p gencore-pty` | Keep spawn / alive / echo. Add cases only if slice 1 touches Rust. |

**Slice 1 CDP gate**

1. Connect over CDP to the `tauri:dev` WebView (not Vite 5173).
2. Assert non-zero xterm canvas; tab `live` with a session id; pane screenshot is not a flat field (cursor and/or glyphs).
3. Send `echo gencore-pty-alive` and Enter; assert the marker in the xterm buffer via the CDP handle. The screenshot corroborates; it is not enough by itself.
4. If the probe machine can hide `pwsh` without changing the user’s install, repeat once so 5.1 is not a lie. Otherwise the plan records which shell actually resolved.

**Slice 2 CDP gate**

- Same path as slice 1.
- Buffer or screenshot shows the 2-line Powerline prompt (Nerd Font glyphs), not only `PS C:\...>`.
- `echo gencore-pty-alive` still works.
- Delete or zero the exe: slice 1 default prompt still appears; pane is not blank.

## Release

- `@gencore/terminal` is private; `gencore-pty` has no JS changeset.
- Do not bump major versions.
- Dev-only WebView2 debug port must not appear in the portable ZIP.

## Decisions

| Topic | Decision |
| --- | --- |
| Strategy | Evidence-first; one named layer; no third speculative patch |
| Success split | Slice 1 default interactive prompt, then slice 2 Oh My Posh |
| Done bar | Playwright on WebView2 CDP, not jsdom, not Vite 5173 |
| DSR responder | xterm only |
| Session-alive code | Keep; reuse only if the probe names handshake |
| Silent subscribe `catch` | Remove; never hydrate/spawn after listen fails |
| xterm patch / `freezePrototype` | Unchanged |
| OMP exe | Fetch in slice 2; stay gitignored |
| Models | Sonnet 5 for probe, fix, Playwright, reviews. Opus 5 last resort only: after written Sonnet evidence, different approach, one shot, then ask the user |
| Commits | Only when the user asks |
