# Task 1 / Wave 1 — Workspace root

Work from: `c:\Storage\Development\Workspace\Cursor\GenCore`

## Goal

Create the pnpm + Turborepo + Cargo workspace skeleton and shared config packages. Do not build apps, ui-kit, crates, .github, .husky, or .vscode yet.

## Clean slate

- Replace the empty root `package.json` (it is invalid JSON today).
- Delete placeholder folders if they exist: `crates/core-bindings`, `crates/tauri-plugin-fs`, `crates/tauri-plugin-pty`, empty `apps/*/src-tauri` stubs.
- Keep `.cursor/hooks/state/continual-learning.json` and `.git`.
- Keep `.superpowers/sdd/**` (controller files).

## Create these files

### Root

- `package.json`
  - `name`: `gencore`, `private`: true, `packageManager`: `pnpm@11.22.0`
  - `engines.node`: `>=22.13.0`
  - scripts: `dev`, `build`, `lint`, `test`, `typecheck`, `format` via turbo; `changeset` placeholder ok
  - devDependencies (exact latest stables): `turbo@2.10.10`, `@biomejs/biome@2.5.8`, `typescript@7.0.2`
- `pnpm-workspace.yaml`: `apps/*`, `packages/*`
- `turbo.json` (`$schema` https://turborepo.dev/schema.json)
  - tasks: `build` (`dependsOn: ["^build"]`, outputs `dist/**`), `dev` (persistent, cache false), `lint`, `test`, `typecheck`, `format`
- `Cargo.toml` workspace only:
  - `resolver = "2"`
  - `members = []` (Wave 2 adds crates; do not list missing members)
  - `[workspace.package]` edition `2024`
  - `[workspace.dependencies]`: `tauri = "2.11.5"`, `tauri-build` matching 2.11.x latest, `serde` with derive, `serde_json`, `thiserror` latest stable
- `rust-toolchain.toml`: `channel = "stable"`, components `rustfmt`, `clippy`
- `biome.json`: recommended + organize imports; ignore `node_modules`, `dist`, `target`, `.turbo`
- `.gitignore`: `node_modules`, `dist`, `target`, `.turbo`, `.netlify`, `*.log`, `.DS_Store`
- `.editorconfig`: utf-8, lf, 2-space JS/TS/JSON, 4-space Rust
- `.npmrc`: `strict-peer-dependencies=true`, `auto-install-peers=true`

### `packages/config-typescript` (`@gencore/config-typescript`)

Modular files:

- `package.json` name `@gencore/config-typescript`, private, exports for each tsconfig
- `tsconfig.base.json` — strict, `moduleResolution: bundler`, `skipLibCheck`, `noEmit` optional
- `tsconfig.react-library.json` extends base, JSX react-jsx, DOM
- `tsconfig.vite-app.json` extends base, Vite app (`bundler`, `noEmit`, include src)

### `packages/config-vite` (`@gencore/config-vite`)

Modular files:

- `package.json` with deps: `vite@8.2.1`, `@vitejs/plugin-react@6.0.5`, `@tailwindcss/vite@4.3.3`, `babel-plugin-react-compiler@1.0.0`, `@rolldown/plugin-babel` latest stable compatible with plugin-react 6, `@babel/core` latest stable
- `src/vite.tauri-factory.ts` — factory `createTauriViteConfig({ port })`:
  - `clearScreen: false`
  - `server.port`, `strictPort: true`, host from `TAURI_DEV_HOST`, HMR as Tauri Vite guide
  - watch ignore `**/src-tauri/**`
  - `envPrefix`: `VITE_`, `TAURI_ENV_*`
  - build target `chrome105` on Windows else `safari13` (or newer if current Tauri Vite docs raised them)
  - minify unless `TAURI_ENV_DEBUG`, sourcemap if debug
  - plugins: react(), tailwindcss(), babel with `reactCompilerPreset({ compilationMode: 'infer' })` from `@vitejs/plugin-react` if that export exists; otherwise babel-plugin-react-compiler equivalent
- `src/vite.tauri-factory.types.ts`
- `src/index.ts` re-export
- `tsconfig.json` extending `@gencore/config-typescript` react-library or base

## Constraints

- Latest stables only. Versions above are locked; do not downgrade.
- Modular folder/file naming. Tests for these config packages only if there is real logic to test (`packages/config-vite/tests/` for factory shape). No dummy tests.
- Do NOT create apps, ui-kit, crates, .github, .husky, .vscode, AGENTS.md, README (later waves).
- Do NOT git commit.
- Do NOT install shadow MCP servers.
- After files exist, run `pnpm install` from repo root (corepack enable pnpm 11 if needed).
- Verify: `pnpm exec tsc -p packages/config-vite --noEmit` if applicable; `pnpm exec biome check .` should pass on the files you created.

## Report

Write full report to `.superpowers/sdd/task-1-report.md`. No commit.
