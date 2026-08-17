# Task 6a / Wave 6 — `.cursor/**` only

Work from: `c:\Storage\Development\Workspace\Cursor\GenCore`

You own **only** these paths:

- `.cursor/**` (except you MUST preserve `.cursor/hooks/state/continual-learning.json` byte-for-byte)
- `.cursorignore` (repo root)
- `.cursorindexingignore` (repo root)

## Do not create or edit

- `AGENTS.md` anywhere (controller writes these after both Wave 6 agents return)
- `README.md`, `LICENSE`
- `.github/**`
- apps, packages, crates, `.husky`, `.vscode`, `.changeset`, root `package.json`
- `.cursor/mcp.json`, `.mcp.json`, or any MCP server config (Runlayer shadow-MCP policy — Team MCP is dashboard-only)
- `~/.cursor/**`

## Product facts (Aug 2026 — do not invent fields)

### Rules — `.cursor/rules/*.mdc`

YAML frontmatter only: `description`, `globs` (comma-separated string), `alwaysApply`.
`.md` in this folder is ignored. Keep each rule **under 50 lines**. One concern per file.

Required files:

| File | Apply |
| --- | --- |
| `architecture.mdc` | alwaysApply |
| `modular-naming.mdc` | alwaysApply |
| `versions.mdc` | alwaysApply |
| `security.mdc` | alwaysApply |
| `react-ui-kit.mdc` | globs: `packages/ui-kit/**`, `apps/**/*.tsx` |
| `tauri-rust.mdc` | globs: `**/src-tauri/**`, `crates/**` |
| `testing.mdc` | globs: `**/tests/**` |
| `release.mdc` | description only (agent-selected; no alwaysApply, no globs) |

**architecture:** workspace graph — apps `terminal`/`explorer`; packages `@gencore/ui-kit`, `@gencore/config-typescript`, `@gencore/config-vite`; crates `gencore-core`, folder `crates/gencore-plugin-pty` **package+plugin id `gencore-pty`**, folder `crates/gencore-plugin-fs` **package+plugin id `gencore-fs`**. Never name a crate `tauri-plugin-fs` / `tauri-plugin-pty`. Shared JS via `workspace:*`; shared crates via root Cargo workspace.

**modular-naming:** folder-per-module + `{module}.{role}.{ext}`. Rust: `src/modules/{module}/{module}_api.rs`. Tests only under that unit’s `tests/`. No colocated `*.test.tsx`.

**versions:** latest stable only. No beta/rc/canary. Locked stack (do not invent newer pins in the rule; say “re-resolve stables, do not downgrade”): React 19.2 / Vite 8 / Tauri 2 / Tailwind 4 / Biome / pnpm 11 / Node >=22.13.

**security (alwaysApply):** CSP object form; Isolation IPC; `withGlobalTauri: false`; never `window.__TAURI__`; `freezePrototype: true`; `assetProtocol.enable: false`; least-privilege capabilities on `windows: ["main"]` only; do not grant `gencore-pty` / `gencore-fs` stub commands until UI invokes them; no `dangerous*` flags; no secrets in repo; no shadow MCP.

**react-ui-kit:** official Nord hex only; flat macOS chrome; CVA; `import { … } from "radix-ui"` (unified package); no raw HTML controls when a primitive exists; system fonts only (CSP).

**tauri-rust:** async commands; serde deny unknown fields; typed errors; plugin id MUST equal `CARGO_PKG_NAME`; capabilities least privilege.

**testing:** Vitest in `packages/ui-kit/tests` and `apps/*/tests`; cargo test in `crates/*/tests` and `apps/*/src-tauri/tests`.

**release:** Changesets; conventional commits; apps stay private.

### Skills — `.cursor/skills/<name>/SKILL.md`

`name` must match folder. Required frontmatter: `name`, `description` (third person, WHAT + WHEN). Optional `paths`. Keep SKILL.md under 500 lines.

Create:

- `add-ui-primitive` — add a shadcn/Radix primitive to `@gencore/ui-kit` (Nord tokens, CVA, tests under `tests/`, modular naming)
- `add-crate-module` — add a module to a crate (`{module}_api.rs` / `{module}_error.rs`, async stub or real command, ACL via build.rs COMMANDS, tests in `tests/`)
- `add-app` — new Tauri 2 + Vite app from the terminal/explorer template (Isolation, CSP, typed IPC, ui-kit AppShell, Cargo workspace member)
- `tauri-capability` — edit capabilities without granting unused plugin commands; Isolation hook allowlist must match
- `cut-changeset` — add a changeset for `@gencore/*` with conventional summary

### Agents — `.cursor/agents/<name>.md`

Frontmatter: `name`, `description`, `model: inherit`. Optional `readonly: true` for reviewers.

- `ui-kit-reviewer` — readonly; Nord hex, flat chrome, no Tauri imports in ui-kit, tests in `tests/`
- `tauri-reviewer` — readonly; CSP, Isolation, capabilities, plugin id == package name, no `window.__TAURI__`
- `monorepo-debugger` — turbo/pnpm/cargo workspace failures

### Commands — `.cursor/commands/<name>.md`

Plain markdown, **no frontmatter**. Filename = slash name.

- `new-module.md`
- `new-changeset.md`
- `check-workspace.md`

### Hooks — `.cursor/hooks.json` + Node scripts

Schema: `{ "version": 1, "hooks": { "<event>": [ { "command": "..." } ] } }`.
Project `command` paths are relative to **repo root**. On Windows use interpreter-prefixed commands, **not** shebang-only `.sh`:

`node .cursor/hooks/<script>.mjs`

Scripts: read stdin JSON, write stdout JSON, exit 0. Fail-open unless the brief says otherwise (`failClosed` only on the force-push deny).

Implement these events (and only these, unless a stub is harmless):

| Event | Behavior |
| --- | --- |
| `sessionStart` | stdout a short `additional_context` repo map (apps, packages, crates, security one-liner). Preserve existing continual-learning.json — do not overwrite it. |
| `beforeShellExecution` | deny `git push --force` / `git push -f` targeting `main` or `master` (`permission: "deny"`). Fail-open for everything else. |
| `afterFileEdit` | if edited path is JS/TS/JSON/CSS, hint Biome; if `*.rs`, hint `cargo fmt`. Do not mutate files. |
| `beforeSubmitPrompt` | if prompt looks like it contains secrets (sk-, ghp_, BEGIN PRIVATE KEY, etc.), return a warning. Fail-open. |
| `stop` | remind to run the affected package’s tests (`pnpm --filter … test` or `cargo test -p …`). |

Do **not** delete or rewrite `.cursor/hooks/state/continual-learning.json`.

Look up current hook stdout fields from https://cursor.com/docs/hooks if unsure (`permission`, `additional_context`, `followup_message`). Do not invent undocumented keys.

### Cloud environment

`.cursor/environment.json` must match [environment.schema.json](https://www.cursor.com/schemas/environment.schema.json) (`unevaluatedProperties: false`).

Allowed keys only. Use:

```json
{
  "name": "gencore",
  "build": {
    "dockerfile": "Dockerfile",
    "context": ".."
  },
  "install": "corepack enable && corepack prepare pnpm@11.22.0 --activate && pnpm install && rustup component add rustfmt clippy",
  "ports": [
    { "name": "terminal", "port": 5173 },
    { "name": "explorer", "port": 5174 }
  ]
}
```

`build.dockerfile` is **relative to `.cursor/`**. Put the Dockerfile at `.cursor/Dockerfile`.

Dockerfile: Node 22 (bookworm or official node:22), Rust stable via rustup, pnpm via corepack, Tauri Linux deps (`libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf`, `build-essential`, `libssl-dev`, `pkg-config`, and current Tauri 2 Linux packages if the official guide lists extras). No secrets. No `npx -y @modelcontextprotocol/server-*`.

Omit `start` unless you have a real long-lived service (do not invent a no-op that violates the schema).

### Worktrees

`.cursor/worktrees.json` — **only** these keys:

```json
{
  "setup-worktree-windows": "setup-worktree-windows.ps1",
  "setup-worktree-unix": "setup-worktree-unix.sh"
}
```

Scripts live next to that file (`.cursor/setup-worktree-windows.ps1`, `.cursor/setup-worktree-unix.sh`). They run `pnpm install` in the worktree. Windows: `$ErrorActionPreference = 'Stop'`. Unix: `set -euo pipefail`. Do not symlink `node_modules`.

### Ignore files

`.cursorignore` — block Agent access to secrets and heavy generated trees if needed: `.env*`, plus anything that should stay hidden. Default Cursor ignores already cover `node_modules` / lockfiles; do not over-block source.

`.cursorindexingignore` — indexing-only: `target/`, `dist/`, `.turbo/`, `**/src-tauri/gen/`, crate `permissions/schemas/`, lockfile noise. Keep source and configs searchable.

## Constraints

- Latest stables / current Cursor schemas only. No invented frontmatter.
- No git commit.
- After writing, validate JSON (`environment.json`, `hooks.json`, `worktrees.json`) parses. Node hook scripts should at least `node --check`.
- Write report to `.superpowers/sdd/task-6a-report.md` (this path is allowed; it is controller ledger, not `.cursor`).

## Report

`.superpowers/sdd/task-6a-report.md` — files added, schema notes, concerns.
