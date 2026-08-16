Scaffold a new module following the `modular-naming` rule.

Ask (if not already given): which package/app/crate, the module name, and whether it's
TypeScript or Rust.

- TypeScript: create `src/modules/{module}/` with `{module}.component.tsx` and/or
  `{module}.hook.ts` / `{module}.ipc.ts` / `{module}.types.ts` as needed. Add a matching
  test file under that package's `tests/{module}/`, not colocated.
- Rust: create `src/modules/{module}/{module}_api.rs` and `{module}_error.rs`, register
  the module in `lib.rs`, and update `build.rs`'s `COMMANDS` const if it's a plugin
  crate. Add an integration test under `crates/{crate}/tests/`.

Do not grant any new Tauri capability for the module until the UI actually calls it —
see the `security` and `tauri-rust` rules. Run the relevant typecheck/test/lint command
for the affected package or crate before finishing.
