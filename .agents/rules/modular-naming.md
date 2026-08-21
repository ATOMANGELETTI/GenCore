---
trigger: always_on
description: "Folder-per-module naming convention for JS/TS and Rust code"
---

<!-- Generated from .cursor/rules/modular-naming.mdc by `pnpm sync:agents`. Do not edit. -->


# Modular naming

Every module gets its own folder, one concern per file, named
`{module}.{role}.{ext}`.

## TypeScript / React

- `src/modules/{module}/{module}.component.tsx`
- `src/modules/{module}/{module}.hook.ts`
- `src/modules/{module}/{module}.ipc.ts`
- `src/modules/{module}/{module}.types.ts`
- No colocated `*.test.tsx` / `*.test.ts` next to source. Tests live only under that
  package/app's `tests/` directory, mirroring the module path.

## Rust

- `src/modules/{module}/{module}_api.rs` — command handlers.
- `src/modules/{module}/{module}_error.rs` — typed errors for that module.
- Tests live only under that crate's `tests/` directory (integration tests), not inline
  `#[cfg(test)]` sprawl across unrelated files.

## General

- Do not introduce a new top-level naming scheme without updating this rule.
- Barrel files (`index.ts`) may re-export a module's public surface but must not contain
  logic.
