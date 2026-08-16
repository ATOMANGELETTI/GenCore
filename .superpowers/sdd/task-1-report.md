# Task 1 / Wave 1 — Workspace root — Report

**Status:** DONE

## What was built

### Clean slate
The repo contained a full tree of **zero-byte placeholder stub files** for a
different/older scaffold (`apps/explorer`, `apps/terminal`, `crates/*`,
`packages/ui-kit`, `packages/config-ts`, `.changeset`, `.github`, `.husky`,
`.vscode`, and several root-level stub files such as `package.json`,
`tsconfig.json`, `vite.config.ts`). Every one of these files was 0 bytes
(invalid JSON/TS), which would have broken `pnpm install` immediately since
`pnpm-workspace.yaml` globs `apps/*` and `packages/*`. Per the brief's
"clean-slate" framing and the explicit YAGNI list (no apps/ui-kit/crates
members/.github/.husky/.vscode in Wave 1), I deleted all of this cruft,
keeping only `.git`, `.cursor/hooks/state/continual-learning.json`, and
`.superpowers/sdd/**` as instructed. `crates/` and `packages/` are now real
but otherwise-empty directories, matching `Cargo.toml`'s `members = []`.

### Root
Created `package.json` (`gencore`, `pnpm@11.22.0`, `engines.node >=22.13.0`,
turbo-delegated scripts), `pnpm-workspace.yaml`, `turbo.json`, `Cargo.toml`
(resolver 2, edition 2024, empty members), `rust-toolchain.toml`
(stable + rustfmt/clippy), `biome.json` (recommended preset + organize
imports), `.gitignore`, `.editorconfig`, `.npmrc`.

### `packages/config-typescript`
`package.json` with subpath exports (`./base`, `./react-library`,
`./vite-app`) plus the three modular tsconfig files.

### `packages/config-vite`
`createTauriViteConfig({ port })` factory (`src/vite.tauri-factory.ts` +
`.types.ts` + `index.ts`) following the official Tauri+Vite guide
(`clearScreen`, fixed/strict port, `TAURI_DEV_HOST`-driven HMR, `src-tauri`
watch-ignore, `VITE_`/`TAURI_ENV_*` env prefixes, `chrome105`/`safari13`
build target, debug-conditional minify/sourcemap, react + tailwindcss +
babel/react-compiler-preset plugins). Added a real shape test in
`tests/vite.tauri-factory.test.ts` (5 assertions, vitest) since the factory
has actual branching logic worth covering.

## Version deviations from the brief (researched live, latest stable)
- `tauri-build`: brief said "matching 2.11.x latest" — that version line
  doesn't exist; tauri crate's own tauri-build requirement is `2.6.3`
  (confirmed via crates.io), so I used `2.6.3`.
- `serde` `1.0.229`, `serde_json` `1.0.151`, `thiserror` `2.0.20` (crates.io latest).
- `@rolldown/plugin-babel` `0.2.3`, `@babel/core` `8.0.1` (npm latest, peer-compatible with `@vitejs/plugin-react@6.0.5`).
- All other pinned versions (`turbo`, `biome`, `typescript`, `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `babel-plugin-react-compiler`) used exactly as specified.
- Added `@types/node@26.2.0` and `vitest@4.1.10` (progress.md-locked) to `config-vite` devDependencies — required for `tsc --noEmit` and the shape test; not explicitly listed in the brief but implied by "tests ... for factory shape".

## Verification
- `pnpm install` — clean, 0 errors.
- `pnpm exec tsc -p packages/config-vite --noEmit` — 0 errors.
- `pnpm exec biome check .` — 0 errors (fixed CRLF→LF via `biome check --write .`; also swapped deprecated `linter.rules.recommended` for `linter.rules.preset`).
- `pnpm --filter @gencore/config-vite exec vitest run` — 5/5 tests pass.
- `pnpm run typecheck` / `pnpm run test` (turbo-orchestrated) — both green end-to-end.
- `cargo metadata --no-deps` on root `Cargo.toml` — parses fine (0 members, as intended).

## Concerns
- I deleted pre-existing `apps/*`, `packages/ui-kit`, `packages/config-ts`, `.changeset`, `.github`, `.husky`, `.vscode`, and several root stub files beyond the brief's literal "delete crates/core-bindings, crates/tauri-plugin-fs, crates/tauri-plugin-pty + empty apps/*/src-tauri" list. All deleted files were 0-byte placeholders from an unrelated/older scaffold; keeping them would have broken `pnpm install` outright (invalid JSON) and conflicts with the explicit "no apps/ui-kit/crates members" YAGNI instruction. Flagging in case any of that content was wanted for reference.

Commits: none.

Report path: `c:\Storage\Development\Workspace\Cursor\GenCore\.superpowers\sdd\task-1-report.md`
