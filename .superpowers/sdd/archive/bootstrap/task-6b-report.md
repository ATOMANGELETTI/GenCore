# Task 6b / Wave 6 — `.github/**` report

## Files added (25)

```
.github/workflows/ci.yml
.github/workflows/release.yml
.github/workflows/codeql.yml
.github/workflows/labeler.yml
.github/workflows/reusable-js.yml
.github/workflows/reusable-rust.yml
.github/actions/setup-node-pnpm/action.yml
.github/actions/setup-rust/action.yml
.github/ISSUE_TEMPLATE/bug.yml
.github/ISSUE_TEMPLATE/feature.yml
.github/ISSUE_TEMPLATE/config.yml
.github/DISCUSSION_TEMPLATE/q-a.yml
.github/PULL_REQUEST_TEMPLATE.md
.github/CODEOWNERS
.github/dependabot.yml
.github/labeler.yml
.github/copilot-instructions.md
.github/instructions/ui-kit.instructions.md
.github/instructions/tauri.instructions.md
.github/prompts/review-ui.prompt.md
.github/prompts/review-rust.prompt.md
.github/CONTRIBUTING.md
.github/CODE_OF_CONDUCT.md
.github/SECURITY.md
.github/SUPPORT.md
```

No files outside `.github/**` were created or edited. No git commit was made.

## Action versions chosen (verified live, 2026-08)

- `actions/checkout@v7`
- `actions/setup-node@v7` (node-version `22`, per `engines.node >=22.13.0`)
- pnpm: **Corepack** (`corepack enable` + `corepack prepare --activate`), not
  `pnpm/action-setup` — upstream now recommends `pnpm/setup` (not
  `pnpm/action-setup`) for pnpm v11+, and this repo pins `pnpm@11.22.0` via
  `packageManager`. Corepack + `cache: pnpm` on `setup-node` avoids adding a
  less-established third-party action for this.
- `actions-rust-lang/setup-rust-toolchain@v1` — reads `rust-toolchain.toml`
  automatically (stable + rustfmt + clippy already declared there) and
  bundles `Swatinem/rust-cache`, so no separate cache action is needed.
- `github/codeql-action/{init,analyze}@v4`, `build-mode: none` for both
  `javascript-typescript` and `rust` (GA no-build DB creation for both).
- `actions/labeler@v7` with the v5+ nested `changed-files` /
  `any-glob-to-any-file` config schema (verified against current README;
  schema unchanged since v5, only Node runtime bumped in v6/v7).
- `changesets/action@v1` — **deviation from brief's `@v2` suggestion**: `v2`
  is currently only published as `v2.0.0-next.*` prereleases; `v1.9.0` (June
  2026) is the actual latest stable. Used `@v1` accordingly; no `publish`
  input is set, so only the Version PR is created/updated and no
  `NPM_TOKEN` is ever required (all packages are `private`).

## Concerns

- `changesets/action@v2` is not GA yet — flag for follow-up once it ships.
- `CODEOWNERS`, `copilot-instructions.md`, and issue templates reference
  `OWNER/GenCore` / `@MAINTAINER` placeholders since no real GitHub
  org/handles exist yet; must be filled in once the repo/org is created.
- Shell tool access was blocked mid-task by a local hook failure
  (`before-shell-execution.mjs`), so YAML was verified by careful manual
  re-read rather than an automated parser; recommend a `yamllint`/schema
  check in CI or locally before merging.
- `reusable-rust.yml` defaults to `ubuntu-latest` only; `ci.yml` does not add
  `windows-latest`, per the brief's "skip macOS, add Windows only if cheap"
  guidance — left as ubuntu-only for now, easy to extend via the `os` input.
