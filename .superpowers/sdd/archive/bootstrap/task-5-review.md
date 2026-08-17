# Wave 5 Review — Changesets, Husky, VS Code

Read-only review against `task-5-brief.md`. No source mutated.

## Spec compliance

- `@changesets/cli` installed; root `changeset` script is the real CLI (Wave 1 echo stub gone).
- `.changeset/config.json`: `linked: [["@gencore/*"]]`, `baseBranch: "main"`, changelog set, `ignore: []`, `access: "restricted"` (apps/packages already `private`).
- Husky v9 via current `prepare: husky` API. Hooks are plain POSIX one-liners (Windows-safe via Git for Windows `sh.exe`).
- `commitlint.config.ts` extends conventional. lint-staged: Biome on JS/TS/JSON, `cargo fmt --` on `*.rs`.
- pre-push runs `pnpm turbo run lint test typecheck` as specified.
- `.vscode/` has settings, extensions, launch (LLDB for both apps + cargo tests), tasks (turbo/tauri/cargo + debug prepare compounds).

## Critical

None.

## Important

None.

## Notes (not blocking)

- Root tooling deps use caret ranges (`^3.0.0`, `^21.2.2`, `^9.1.7`, `^17.3.0`) rather than exact pins used for the app stack. Acceptable for CLI tooling; Dependabot (Wave 6) can tighten later.
- `commitlint.config.ts` imports `@commitlint/types`, which is transitive via `@commitlint/cli` (present in the lockfile). Not a runtime risk.
- `.changeset/config.json` includes Changesets 3 `format: "auto"` (valid for the installed CLI).
- LLDB launch configs are not runtime-verified (no Rust debug session). Binary names match `gencore-terminal` / `gencore-explorer`.
- Repo-wide `biome check .` still fails on Tauri-generated schema JSON under `src-tauri/gen` and crate `permissions/schemas` — pre-existing, out of scope.

## Verdict

Approved. Dispatch Wave 6.
