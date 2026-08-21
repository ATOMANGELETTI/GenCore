---
name: "tauri-capability"
description: "Edits a Tauri app's capability files without granting unused plugin commands, keeping the Isolation hook allowlist in sync. Use when the user asks to grant, revoke, or review IPC permissions for an app."
---

<!-- Generated from .cursor/skills/tauri-capability/SKILL.md by `pnpm sync:agents`. Do not edit. -->


# Tauri capability

Use this when changing what IPC commands an app's window is allowed to call.

## Steps

1. Open `apps/{app}/src-tauri/capabilities/main.json`. Confirm `"windows"` is exactly
   `["main"]` — never widen to other windows without explicit instruction.
2. Add/remove permission identifiers one at a time, in the form
   `plugin:{plugin-id}:allow-{command}` (or `core:{module}:allow-{command}` for
   built-ins). Never add a wildcard like `core:default` or `{plugin}:default`.
3. Only grant a command if the frontend already calls it through a typed `ipc.*.ts`
   wrapper. If the command isn't called yet, leave it out — see `security` and
   `tauri-rust` rules on stub commands.
4. Update the app's Isolation hook (`isolation/src/index.ts` or equivalent) allowlist so
   it matches exactly — every capability you grant must also pass the Isolation filter,
   and vice versa. A mismatch either silently drops a call or leaves a granted-but-
   unfiltered command.
5. Run `cargo check -p gencore-{app}` — Tauri validates capability syntax and referenced
   plugin/command names at build time and will error on typos or unknown identifiers.
6. Manually re-read the diff and confirm no `gencore-pty` / `gencore-fs` command was
   granted without a corresponding UI call site.

## Constraints

Least privilege always. When in doubt, don't grant it — ask the user which exact
command the UI needs.
