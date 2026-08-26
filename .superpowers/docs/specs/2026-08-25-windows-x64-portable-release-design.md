# Windows x64 portable release layout

Date: 2026-08-25
Status: approved
Packages: root `scripts/package-win64.ps1`; apps `@gencore/terminal`, `@gencore/explorer` (private; built, not published)

Related: existing `pnpm package:win64` pipeline. Does not change Isolation, CSP, or `bundle.active`.

## Problem

`pnpm package:win64` already compiles Windows x64 portable ZIPs with `tauri build --no-bundle --target x86_64-pc-windows-msvc`, but it writes to gitignored `artifacts/`, **deletes** a same-named ZIP instead of keeping it, and omits Terminal’s `micro` sidecar. The user added `release/` (with `release/archive/`) as the packaging destination.

## Goals

- Ship **only** Windows x64 portable ZIPs. No NSIS/MSI, no 32-bit, no other OS.
- Current ZIPs live at `release/{slug}-{version}-windows-x64.zip`.
- Before writing a new ZIP, move any existing current ZIP to `release/archive/`. If that archive filename already exists, dest is `{basename}-yyyyMMdd-HHmm.zip`; if that exists too, `{basename}-yyyyMMdd-HHmmss.zip`.
- Gitignore `release/**/*.zip` and `release/.staging/`. Track `release/.gitkeep` and `release/archive/.gitkeep`. Keep ignoring `artifacts/`. Never commit ZIPs.
- Terminal ZIP contains `gencore-terminal.exe` plus `resources/oh-my-posh/**` and `resources/micro/**` (run `fetch-oh-my-posh.ps1` and `fetch-micro.ps1`; fail if a sidecar exe is missing or zero-byte). Explorer ZIP contains `gencore-explorer.exe` only.
- After the script and docs land, run `pnpm package:win64` so both apps are actually packaged on this machine.
- `bundle.active` stays `false`. Packaging must not set the WebView2 debug port. No GitHub Releases upload. CI still does not run `tauri build`.

## Non-goals

- GitHub Releases, NSIS/MSI, macOS/Linux, 32-bit, WebView2 bundling
- Committing binaries, CI packaging, changing `tauri:dev` / `tauri:build`
- Enabling Tauri bundle targets

## Layout

```text
release/
  .gitkeep
  gencore-terminal-{version}-windows-x64.zip
  gencore-explorer-{version}-windows-x64.zip
  archive/
    .gitkeep
    <previous zips; timestamp suffix on name collision>
  .staging/   # throwaway, gitignored
```

Slug is `productName` from each app’s `tauri.conf.json`, with non-alphanumerics replaced by `-`, trimmed, lowercased. Inner zip folder name is `{ProductName}-{version}-windows-x64`.

## Command and data flow

Unchanged entrypoint: `pnpm package:win64` → `scripts/package-win64.ps1`. Requires 64-bit Windows. Target `x86_64-pc-windows-msvc`. Staging is `release/.staging`, not `artifacts/`.

```text
for each app:
  if current ZIP exists in release/ → move to release/archive/ (timestamp on collision)
  if terminal → fetch oh-my-posh + micro
  tauri build --no-bundle --target x86_64-pc-windows-msvc
  assert exe (and terminal sidecars) exist and are non-zero
  stage folder → Compress-Archive → release/{slug}-{version}-windows-x64.zip
remove release/.staging
```

WebView2 remains a machine prerequisite (not bundled).

## Error handling

- Throw if not Windows or not 64-bit.
- Throw if `productName` or `version` is missing from `tauri.conf.json`.
- Throw if `tauri build` exits non-zero.
- Throw if the built exe, `oh-my-posh.exe`, or `micro.exe` is missing or zero-byte.

## Testing

- `scripts/tests/package-win64.test.mjs` (`pnpm test:scripts`) asserts script text: `release/` destination (not `artifacts/`), archive dir + `yyyyMMdd-HHmm` / `yyyyMMdd-HHmmss`, `--no-bundle` + `x86_64-pc-windows-msvc`, both fetch scripts, no `9223` / `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, gitignore lines for `release/**/*.zip` and `release/.staging/`.
- Keep `apps/terminal/tests/unit/tauri.dev-port.test.ts`.
- Do not run `tauri build` in unit tests. Task 4 runs `pnpm package:win64` as the real package gate.

## Docs

Point packaging output at `release/` in README, AGENTS.md, architecture rule, Terminal/Explorer AGENTS.md, and the add-app skill; then `pnpm sync:agents`.
