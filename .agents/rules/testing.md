---
trigger: glob
globs:
  - "**/tests/**"
description: "Test placement and runners for JS and Rust"
---

<!-- Generated from .cursor/rules/testing.mdc by `pnpm sync:agents`. Do not edit. -->


# Testing

- JS/TS: Vitest only. Tests live in `packages/ui-kit/tests/**` and `apps/*/tests/**`,
  mirroring the `src/modules/{module}` path they cover. No colocated `*.test.tsx`.
- Rust: `cargo test`. Integration tests live in `crates/*/tests/**` and
  `apps/*/src-tauri/tests/**`.
- Run scoped tests, not the whole workspace, when working on one package/crate:
  - `pnpm --filter @gencore/<pkg> test`
  - `cargo test -p <crate-name>`
- New modules/commands ship with at least one test in the correct `tests/` directory
  before being considered done.
- Do not delete or skip existing tests to make a run pass; fix the underlying code.
