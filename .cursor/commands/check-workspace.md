Run a full workspace health check and summarize failures.

1. `pnpm install --frozen-lockfile` (or `pnpm install` if the lockfile isn't meant to be
   strict right now) to confirm dependency resolution is clean.
2. `pnpm -r typecheck` and `pnpm -r lint` across all JS/TS packages and apps.
3. `pnpm -r test` for Vitest suites.
4. `cargo check --workspace` and `cargo test --workspace` for all crates and app
   `src-tauri` backends.
5. `cargo clippy --workspace --all-targets` for lint warnings.

Report results grouped by package/crate: pass/fail, and for failures, the shortest
repro command (`pnpm --filter <pkg> <script>` or `cargo check -p <crate>`) so the
failure can be isolated without re-running the whole workspace. If a failure looks
graph-wide (affects multiple unrelated packages/crates), suggest the
`monorepo-debugger` agent.
