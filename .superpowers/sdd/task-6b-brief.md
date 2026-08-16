# Task 6b / Wave 6 — `.github/**` only

Work from: `c:\Storage\Development\Workspace\Cursor\GenCore`

You own **only** `.github/**`.

## Do not create or edit

- `AGENTS.md`, `README.md`, `LICENSE` (controller)
- `.cursor/**`, `.cursorignore`, `.cursorindexingignore`
- apps, packages, crates, `.husky`, `.vscode`, `.changeset` (except you may *read* them)
- `FUNDING.yml` (explicitly skipped)
- In-repo MCP configs

## Create this tree

```
.github/
  workflows/
    ci.yml
    release.yml
    codeql.yml
    labeler.yml
    reusable-js.yml
    reusable-rust.yml
  actions/setup-node-pnpm/action.yml
  actions/setup-rust/action.yml
  ISSUE_TEMPLATE/bug.yml
  ISSUE_TEMPLATE/feature.yml
  ISSUE_TEMPLATE/config.yml
  DISCUSSION_TEMPLATE/q-a.yml
  PULL_REQUEST_TEMPLATE.md
  CODEOWNERS
  dependabot.yml
  labeler.yml
  copilot-instructions.md
  instructions/ui-kit.instructions.md
  instructions/tauri.instructions.md
  prompts/review-ui.prompt.md
  prompts/review-rust.prompt.md
  CONTRIBUTING.md
  CODE_OF_CONDUCT.md
  SECURITY.md
  SUPPORT.md
```

## Action versions (resolve latest stables at write time; do not use stale 2024 pins)

Known current majors as of 2026-08:

- `actions/checkout@v7` (do **not** use `pull_request_target` to run untrusted code)
- `actions/setup-node` — latest stable major
- `pnpm/action-setup` — latest stable major (or enable pnpm via `corepack` + `packageManager: pnpm@11.22.0`)
- `github/codeql-action/*@v4`
- `changesets/action@v2` (or current latest major)
- `actions/labeler` — latest stable major
- Rust toolchain: `dtolnay/rust-toolchain` or `actions-rust-lang/setup-rust-toolchain` latest stable; honor repo `rust-toolchain.toml` (stable + rustfmt + clippy)

Pin to major tags (`@v7`, `@v4`) so Dependabot can bump. Use `permissions:` least privilege on every workflow.

## Composite actions

**`.github/actions/setup-node-pnpm`**
- Node `22` (engines `>=22.13`)
- pnpm from `packageManager` field / `pnpm/action-setup`
- `pnpm install --frozen-lockfile`
- cache pnpm store

**`.github/actions/setup-rust`**
- Install toolchain from `rust-toolchain.toml`
- Components rustfmt, clippy
- Cache `target` if cheap (Swatinem/rust-cache latest stable) — optional but preferred

## Workflows

**`reusable-js.yml`** (`workflow_call`): checkout → setup-node-pnpm → inputs for `lint` / `typecheck` / `test` (`pnpm turbo run …`). Ubuntu only.

**`reusable-rust.yml`** (`workflow_call`): checkout → setup-rust → `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`. Default OS ubuntu; optional matrix input.

**`ci.yml`**: on push/PR to `main`. Call both reusables. JS on `ubuntu-latest`. Rust on `ubuntu-latest` (add `windows-latest` only if it stays cheap — skip macOS). Do not run `tauri build` in CI (needs WebView + `pnpm approve-builds` for esbuild; out of scope).

**`release.yml`**: on push to `main`. Changesets action: create/update Version PR. All packages are `private` — **do not require `NPM_TOKEN`**. If publish script is needed, make it a no-op or `changeset tag` only. `concurrency` per ref. permissions: `contents: write`, `pull-requests: write`.

**`codeql.yml`**: scheduled weekly + push/PR to main. Matrix languages: `javascript-typescript` and `rust`. `build-mode: none` for JS; Rust use the current CodeQL rust guidance (autobuild or none if supported). permissions: `security-events: write`, `contents: read`. `fail-fast: false`.

**`labeler.yml` workflow**: `pull_request_target` is dangerous with checkout of the PR — prefer `pull_request` + `actions/labeler` reading `.github/labeler.yml` from the default branch config already in the repo. If you must use `pull_request_target`, **do not checkout PR code**.

## Labeler config

`.github/labeler.yml` labels:

- `app-terminal` — `apps/terminal/**`
- `app-explorer` — `apps/explorer/**`
- `pkg-ui-kit` — `packages/ui-kit/**`
- `crate-core` — `crates/gencore-core/**`
- `crate-pty` — `crates/gencore-plugin-pty/**`
- `crate-fs` — `crates/gencore-plugin-fs/**`
- `ci` — `.github/**`

Use the current actions/labeler v5 config syntax (changed from v4). Verify against the action README.

## Community + Copilot

- Issue forms: bug + feature (required fields). `config.yml`: blank issues off; link Discussions.
- `DISCUSSION_TEMPLATE/q-a.yml` — Q&A category template.
- `PULL_REQUEST_TEMPLATE.md` — summary + test plan checklist (lint/typecheck/tests, security: no new `dangerous*`, no extra capabilities).
- `CODEOWNERS`: **do not invent org teams or fake @users**. Comment-only ownership map the maintainer can fill in. Example:

  ```
  # Replace the handles below after the GitHub repo exists.
  # * @MAINTAINER
  # /packages/ui-kit/ @MAINTAINER
  # /crates/ @MAINTAINER
  # /.github/ @MAINTAINER
  ```

- `dependabot.yml`: weekly `npm`, `cargo`, `github-actions`. Group rust crate bumps if supported. Directory `/`.
- `copilot-instructions.md`: monorepo map, modular naming, Nord/ui-kit, Tauri security, tests in `tests/`, latest stables, no shadow MCP.
- Path instructions: ui-kit (Nord, radix-ui unified, no Tauri imports); tauri (CSP, Isolation, plugin id == package name, least privilege).
- Prompts: review-ui / review-rust checklists.
- `CONTRIBUTING.md`: pnpm 11, Node 22, `pnpm install`, `pnpm turbo run lint test typecheck`, `cargo test --workspace`, conventional commits, changesets.
- `CODE_OF_CONDUCT.md`: Contributor Covenant 2.1 (or current).
- `SECURITY.md`: private disclosure; no public exploit PoCs; Tauri capability/CSP regressions are security issues.
- `SUPPORT.md`: issues vs discussions.

## Repo facts the files must get right

- Apps: `@gencore/terminal` port 5173, `@gencore/explorer` port 5174
- Plugin ids: `gencore-core`, `gencore-pty`, `gencore-fs` (folder names `gencore-plugin-pty` / `gencore-plugin-fs`)
- Package manager: `pnpm@11.22.0`
- Cargo workspace members include both `apps/*/src-tauri` and `crates/*`
- Do not tell contributors to grant pty/fs stub permissions
- Do not recommend `window.__TAURI__`

## Constraints

- Valid YAML. Least-privilege `permissions`. No secrets in files.
- No git commit.
- Write report to `.superpowers/sdd/task-6b-report.md` (allowed).

## Report

`.superpowers/sdd/task-6b-report.md` — files added, action versions chosen, concerns.
