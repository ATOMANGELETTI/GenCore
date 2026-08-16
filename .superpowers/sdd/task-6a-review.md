# Wave 6a Review — `.cursor/**`

Read-only review against `task-6a-brief.md`, plus controller fixes applied after.

## Spec compliance

Required rules, skills, agents, commands, hooks, environment.json + Dockerfile,
worktrees, and ignore files are present. `continual-learning.json` preserved.
No `AGENTS.md`, `.github`, or MCP config created. Hook commands use
`node .cursor/hooks/*.mjs`.

## Critical

1. **`beforeShellExecution` was fail-closed.** `hooks.json` set `failClosed: true`
   and the script denied on any catch. That can block every agent shell if Node
   errors or stdin is unexpected — Wave 6b reported this mid-task. **Fixed:**
   fail-open; catch returns `{ permission: "allow" }`. Force-push to main/master
   is still denied.

## Important

2. **`security.mdc` used fake capability ids** (`plugin:core:*`). Tauri 2 uses
   `core:window:allow-close` / `gencore-core:allow-get-app-info`. **Fixed.**
3. **Always-apply rules had empty `globs:`** (null YAML). **Fixed** — key removed.
4. **`.cursorignore` blocked the committed root `.npmrc`.** **Fixed** — only
   `*.credentials.json` remains for credential dumps.

## Notes

- `afterFileEdit` hints go to stderr (no documented chat output field).
- `stop` uses `followup_message`, which can auto-continue a turn after edits.
- `environment.json` matches the published schema (no extra keys).

## Verdict

Approved after controller fixes.
