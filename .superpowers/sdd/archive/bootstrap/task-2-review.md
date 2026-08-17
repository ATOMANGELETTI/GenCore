# Task 2 / Wave 2 — Shared crates — Review

Spec compliance: ✅ (all three crates present, modular `{module}_api.rs`/`{module}_error.rs` layout, `deny_unknown_fields`, async commands, typed `thiserror` errors, empty default perms on pty/fs, `allow-get-app-info`-only default on core, plugin ids `gencore-core`/`gencore-pty`/`gencore-fs` correctly set in `init()`, no `tauri-plugin-fs` crate name, edition 2024, workspace members updated, `cargo check --workspace` clean, no `#[cfg(test)]` in src).

Quality: **Approved with one Critical fix required before the apps wave**

## Critical (must fix before Wave 3 apps consume these plugins)
Verified against `tauri-plugin` 2.6.3 source (`build/mod.rs`): `Builder::try_build()` unconditionally keys the ACL/permission manifest by `CARGO_PKG_NAME` (no override), so `gencore-plugin-pty` and `gencore-plugin-fs` generate manifests under keys `gencore-plugin-pty:*` / `gencore-plugin-fs:*`. But `lib.rs` registers the runtime plugin id as `gencore-pty` / `gencore-fs` via `tauri::plugin::Builder::new(PLUGIN_ID)`, and Tauri's IPC authority (`ipc/authority.rs`) checks permissions against the runtime `plugin:<id>|<command>` string, i.e. `gencore-pty:*`. These two keys can never match: a capability written as `gencore-pty:allow-open` fails app build-time ACL validation (`acl.rs::validate_capabilities`, key not found), while one written as `gencore-plugin-pty:allow-open` passes validation but won't authorize the runtime command (registered under `gencore-pty`). **No capability string satisfies both.** This is not a discovery nuance apps can work around by "setting capability identifiers explicitly" — it's a hard mismatch baked into the build macro. `gencore-core` is unaffected (crate name already equals plugin id).

Fix: rename the `gencore-plugin-pty`/`gencore-plugin-fs` **crate names** to `gencore-pty`/`gencore-fs` (still distinct from the official `tauri-plugin-fs`, satisfies the brief's naming constraint, and makes `CARGO_PKG_NAME` == `PLUGIN_ID`).

## Important
None beyond the above.

## Verdict on implementer's self-flagged concern
The self-flagged "crate name vs plugin id" note in the report is correct and understates severity — it's **Critical for the apps wave, not merely advisory**, and not resolvable by app-side capability configuration alone.
