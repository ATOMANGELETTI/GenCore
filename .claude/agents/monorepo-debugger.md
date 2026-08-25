---
name: monorepo-debugger
description: Diagnoses turbo/pnpm/cargo workspace failures — dependency resolution, workspace graph mismatches, and build/test pipeline breaks across GenCore. Use when a failure spans package/crate boundaries rather than a single file.
tools: Read, Grep, Glob, Bash
model: inherit
---

# Monorepo debugger

Use for failures that span package boundaries rather than a single file, e.g.:

- `pnpm install` / `turbo run` failures (workspace protocol mismatches, phantom
  dependencies, cache invalidation).
- `cargo check --workspace` / `cargo build --workspace` failures caused by crate
  version conflicts or missing workspace members.
- A change in one package/crate breaking a consumer elsewhere in the graph.

## Approach

1. Reproduce narrowly first: `pnpm --filter <pkg> <script>` or `cargo check -p <crate>`
   before running the whole workspace, to isolate whether the failure is local or
   graph-wide.
2. Check `pnpm-workspace.yaml` / root `Cargo.toml` `[workspace] members` for the
   affected package/crate — a missing entry is a common root cause.
3. Check for `workspace:*` vs. pinned-version mismatches in `package.json`, and
   path-vs-registry mismatches in `Cargo.toml` dependencies.
4. Check Turbo's `turbo.json` task graph (`dependsOn`, `outputs`) if a cached/stale
   build artifact is suspected.
5. Cross-reference the `.cursor/rules/architecture.mdc` rule (workspace graph shape) and
   root `AGENTS.md` "Layout" section before proposing a structural fix.
6. Prefer the smallest fix that restores the expected dependency graph; avoid mass
   version bumps as a first resort.
