# Terminal error output uses official Nord ANSI colors

Date: 2026-08-22
Status: approved
Packages: `@gencore/terminal`

Related: [2026-08-21-terminal-pty-session-alive-design.md](./2026-08-21-terminal-pty-session-alive-design.md) (interactive `-NoExit` spawn) and [2026-08-21-terminal-blank-pane-design.md](./2026-08-21-terminal-blank-pane-design.md) (WebView2 CDP visual gate). Does not change [2026-08-21-terminal-telemetry-statusbar-design.md](./2026-08-21-terminal-telemetry-statusbar-design.md) or [2026-08-20-nord-theme-roles-design.md](./2026-08-20-nord-theme-roles-design.md) (CSS semantic roles stay as they are; this spec remaps xterm ANSI only).

## Problem

The pane is a live ConPTY session. The 2-line Oh My Posh prompt, transient `❯`, typed echo, and successful command output all work. Failed commands (`asdfasdf`, unquoted `cd C:\Program Files\`) look like they produced nothing.

PowerShell 7 writes those failures with **SGR 31** (ANSI red, often bold). `terminal.theme.ts` builds the xterm 16-color map with `Object.values(nord)`, and `terminal.theme.test.ts` locks “ANSI 0–15 = nord0–nord15 in order.” That sets `theme.red` to **polar-1 `#3B4252`** on background **polar-0 `#2E3440`**. Contrast is about 1.15:1 — the error record is in the buffer and effectively invisible. PSReadLine can still color the typed token with 24-bit or bright sequences, which is why `asdfasdf` looks highlighted and the following message does not.

A second, smaller footgun: `gencore-prompt.ps1` starts with `$ErrorActionPreference = 'SilentlyContinue'`. Spawn is `pwsh -NoProfile -NoExit -File`. Script-scope usually should not leak, but if it does (or Oh My Posh init assigns it more widely), the same screenshot happens with no bytes at all.

The existing visual echo test can pass by matching the typed `echo gencore-pty-alive` line. It does not prove command output.

This is not the `freezePrototype` import-time crash. Chrome visible means the patched `@xterm/xterm@6.0.0` loaded. Do not change `patches/@xterm__xterm@6.0.0.patch` or disable `freezePrototype`.

jsdom and Playwright against `http://localhost:5173` cannot prove PTY: that page has no Tauri IPC.

## Goals

- Failed PowerShell commands paint readable Aurora red on the Polar Night (and Snow Storm) pane.
- xterm ANSI 0–15 follow official Nord terminal ports (named tokens), not palette-declaration order.
- The interactive prompt script does not leave a session-wide `SilentlyContinue`.
- A WebView2 CDP visual gate proves an unknown command writes an error phrase that is not part of the typed line.
- Isolation, capabilities, spawn argv, and the four PTY commands stay as they are.

## Non-goals

- Explorer PTY, new IPC, Isolation grants, or `core:default`.
- Changing `freezePrototype` or `patches/@xterm__xterm@6.0.0.patch`.
- Adding `windowsPty` / ConPTY wrap unless a WebView2 buffer read shows the error phrase appearing and then disappearing.
- Windows Terminal feature parity (profiles, pager, progress chrome).
- Rewriting Oh My Posh themes or dropping transient `❯`.
- Changing CSS semantic tokens in `@gencore/ui-kit`.
- Using `http://localhost:5173` as a stand-in for the visual gate.

## Approach

The bytes already reach xterm. Remap ANSI red to aurora so SGR 31 is readable. Restore PowerShell’s default error preference in the prompt script so a leaked `SilentlyContinue` cannot swallow the record. Prove output with a phrase the typed command cannot match.

```text
PowerShell SGR 31
    → xterm theme.red / theme.brightRed = aurora-11 #BF616A
    → readable on polar-0 / snow-6
gencore-prompt.ps1
    → Get-Command -ErrorAction SilentlyContinue only
    → last $ErrorActionPreference assignment is Continue
WebView2 CDP
    → type gencore-pty-nosuch
    → buffer contains “not recognized” or “CommandNotFound”
```

## Units

### 1. Official Nord ANSI map

- **File:** `apps/terminal/src/modules/terminal/terminal.theme.ts`
- **Does:** Stop using `Object.values(nord)` as ANSI 0–15. Map named Nord tokens (official hex only):
  - normal: black `polar-1`, red `aurora-11`, green `aurora-14`, yellow `aurora-13`, blue `frost-9`, magenta `aurora-15`, cyan `frost-8`, white `snow-5`
  - bright: black `polar-3`, red `aurora-11`, green `aurora-14`, yellow `aurora-13`, blue `frost-9`, magenta `aurora-15`, cyan `frost-7`, white `snow-6`
- **Keeps:** Today’s pane `background` / `foreground` / cursor / selection.
- **Does not:** Invent non-Nord hex, change Isolation, or add `windowsPty`.

### 2. Prompt script preference

- **File:** `apps/terminal/src-tauri/resources/oh-my-posh/gencore-prompt.ps1`
- **Does:** Do not leave a session-wide `SilentlyContinue`. Keep `-ErrorAction SilentlyContinue` only on `Get-Command oh-my-posh`. If init still needs a quiet block, set the preference inside `try`/`finally` and restore `Continue` (PowerShell default) before the script ends.
- **Keeps:** `Global:Prompt` / OSC 7 wrapper as they are. Frost `❯` fallback when Oh My Posh is missing.
- **Does not:** Change spawn argv, theme JSON, or Isolation.

### 3. Visual gate that cannot match the typed line

- **File:** `apps/terminal/tests/visual/terminal.pane.spec.ts`
- **Does:** Same WebView2 CDP path as today (`127.0.0.1:9223`, not Vite 5173). Type a unique unknown command (`gencore-pty-nosuch`), press Enter, assert the buffer contains a phrase that is not in the typed line (`not recognized` / `CommandNotFound`).
- **Keeps:** The existing echo and Oh My Posh tests.
- **Does not:** Treat jsdom or `http://localhost:5173` as proof.

## Error handling

- Spawn / invalid cwd / session-not-found stay on the existing typed errors and UI (`exited` + Restart).
- Isolation write size cap unchanged (`MAX_PTY_WRITE_CHARS`).
- If Oh My Posh is missing, frost `❯` fallback and default PowerShell error coloring still apply (fallback spawn never runs this ps1).
- No production PTY byte dumps, no `window.__TAURI__`.
- If a WebView2 buffer read shows the error phrase appearing and then disappearing, stop and consider ConPTY wrap. Do not add `windowsPty` without that proof.

## Testing

- **Theme (`apps/terminal/tests/unit/terminal.theme.test.ts`):** Replace the “in order” assertion. Lock `red` and `brightRed` to `#BF616A`. Assert those reds are not the Polar Night or Snow Storm pane background. Keep the official-hex-only check.
- **Prompt (`apps/terminal/tests/unit/gencore-prompt.test.ts`):** Read the committed `gencore-prompt.ps1`. Fail if the file’s last `$ErrorActionPreference` assignment is `SilentlyContinue`.
- **Visual (`apps/terminal/tests/visual/terminal.pane.spec.ts`):** Playwright attaches to WebView2 CDP. Done means this gate is green on a live `tauri:dev` WebView and the unique-command error phrase is in the buffer.

## Release

- `@gencore/terminal` is private; no JS changeset.
- Do not bump major versions.
- No commit until the user asks.

## Decisions

| Topic | Decision |
| --- | --- |
| Scope | Terminal xterm ANSI + prompt-script hygiene + CDP output gate |
| ANSI map | Official Nord terminal ports, named tokens, not `Object.values(nord)` |
| SGR 31 | `red` and `brightRed` = aurora-11 `#BF616A` |
| Prompt preference | Last assignment is `Continue`; `SilentlyContinue` only as `-ErrorAction` on `Get-Command` |
| Visual proof | Phrase not in the typed line; WebView2 CDP only |
| ConPTY wrap | Not in this pass |
| xterm patch | Unchanged |
| Isolation / capabilities | Unchanged |
