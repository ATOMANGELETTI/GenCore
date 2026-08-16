# Contributing to GenCore

Thanks for your interest in contributing! This is a pnpm + Turborepo
monorepo pairing two Tauri 2 desktop apps with a shared design system and
Rust plugin crates.

## Prerequisites

- Node.js `>=22.13.0`
- pnpm `11` (pinned via the `packageManager` field — enable it with
  `corepack enable`, then Corepack will activate the pinned version
  automatically)
- Rust `stable` with the `rustfmt` and `clippy` components (see
  `rust-toolchain.toml`)

## Getting started

```sh
corepack enable
pnpm install
```

## Everyday commands

| Task                    | Command                                |
| ------------------------ | --------------------------------------- |
| Run all apps in dev mode | `pnpm dev`                              |
| Lint (JS/TS)             | `pnpm turbo run lint`                   |
| Typecheck                | `pnpm turbo run typecheck`              |
| Test (JS/TS)             | `pnpm turbo run test`                   |
| Everything at once       | `pnpm turbo run lint test typecheck`    |
| Rust tests               | `cargo test --workspace`                |
| Rust lint                | `cargo clippy --workspace --all-targets -- -D warnings` |
| Rust format check        | `cargo fmt --all -- --check`            |

Please run the relevant checks above before opening a pull request — CI runs
the same commands and will block merges on failures.

## Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/)
(enforced by commitlint via a Husky `commit-msg` hook), e.g.:

```
feat(ui-kit): add Tooltip primitive
fix(terminal): correct window resize IPC payload
```

## Changesets

If your change affects the published behavior of any package under `apps/*`
or `packages/*`, add a changeset:

```sh
pnpm changeset
```

Follow the prompts to describe the change and select the affected packages.
The changeset will be picked up by the release workflow to update versions
and changelogs.

## Pull requests

- Fill out the PR template, including the test plan and security checklist.
- Keep PRs focused; prefer several small PRs over one large one.
- Path-specific guidance for `packages/ui-kit` and Tauri/Rust code lives in
  `.github/instructions/`.
