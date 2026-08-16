---
mode: ask
description: Review a Rust / Tauri change for GenCore conventions.
---

Review the current diff (or the file(s) I mention) against these checks and
report findings as a short checklist, calling out any failing item with the
file and line:

1. **CSP / Isolation** — no `tauri.conf.json` change weakens the Content
   Security Policy or disables the Isolation Pattern without justification.
2. **Plugin id == package name** — any Tauri plugin's registered id matches
   its Cargo package name (folder name may legitimately differ, e.g.
   `crates/gencore-plugin-pty` → package/plugin id `gencore-pty`).
3. **Least privilege** — new commands only request the capabilities they
   need in `capabilities/*.json`; no wildcard or broad grants.
4. **Stub plugins** — `gencore-plugin-pty` / `gencore-plugin-fs` remain stubs
   unless the task explicitly calls for real PTY/filesystem I/O; flag any
   unrequested I/O implementation as security-sensitive.
5. **Workspace hygiene** — new crates use `edition.workspace = true` and pull
   shared deps (`tauri`, `serde`, `thiserror`, etc.) from
   `[workspace.dependencies]` instead of re-pinning versions.
6. **Lints** — code passes `cargo fmt --all -- --check` and
   `cargo clippy --workspace --all-targets -- -D warnings` with no new
   `#[allow(...)]` left unexplained.
7. **Tests** — new behavior has integration tests under the crate's `tests/`
   directory.

Finish with a one-line verdict: `Approve`, `Approve with nits`, or
`Changes requested`.
