# Task 5 / Wave 5 — Changesets, Husky, VS Code

Work from: `c:\Storage\Development\Workspace\Cursor\GenCore`

Do not rewrite apps, crates, or ui-kit source. You may add root scripts and deps.

## Changesets

- Install latest stable `@changesets/cli`
- `.changeset/config.json`: linked `@gencore/*`, changelog, `baseBranch: main`, ignore nothing required; apps stay private
- Root script `changeset` should run the real CLI (replace the Wave 1 echo stub)
- Add an empty-ready `.changeset/README.md` if the CLI does

## Husky (Windows-safe)

- Latest stable `husky`, `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional`
- `commitlint.config.ts` at repo root (conventional commits)
- `.husky/pre-commit` → lint-staged
- `.husky/commit-msg` → commitlint
- `.husky/pre-push` → `pnpm turbo run lint test typecheck` (or a slightly cheaper subset if full turbo is too slow — prefer the plan)
- `lint-staged` in root package.json: Biome on staged JS/TS/JSON; `cargo fmt` on staged `*.rs`
- Use husky's current init API (not deprecated husky-init). Scripts must work on Windows (no bash-only).

## `.vscode/`

Full workspace config:
- `settings.json`: format on save, Biome default formatter for JS/TS/JSON/CSS, rust-analyzer `linkedProjects: ["Cargo.toml"]`, exclude `target`/`node_modules`/`dist`/`.turbo`
- `extensions.json` recommendations: rust-analyzer, Tauri, Biome, Even Better TOML, Tailwind CSS, Vitest, CodeLLDB
- `launch.json`: debug configs for terminal and explorer (Tauri/LLDB if possible; otherwise documented cargo/tauri tasks)
- `tasks.json`: turbo dev, `tauri:dev` per app, cargo test, turbo test

## Constraints

- Latest stables. No git commit.
- Do not create `.cursor` or `.github` (Wave 6).
- Do not add README/AGENTS.md yet (controller/wave 6).
- After install, `pnpm exec commitlint --version` and biome still pass.

## Report

`.superpowers/sdd/task-5-report.md`
