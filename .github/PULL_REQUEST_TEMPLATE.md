## Summary

<!-- What does this PR change, and why? -->

## Test plan

- [ ] `pnpm turbo run lint`
- [ ] `pnpm turbo run typecheck`
- [ ] `pnpm turbo run test`
- [ ] `cargo test --workspace` (if Rust code changed)
- [ ] Manually verified affected app(s) (`apps/terminal` and/or `apps/explorer`)

## Security checklist

- [ ] No new Tauri commands are marked `dangerous*` without explicit justification below
- [ ] No new Tauri capabilities/permissions were granted beyond what this change requires
- [ ] `crates/gencore-plugin-pty` and `crates/gencore-plugin-fs` remain stubs unless this PR intentionally implements real I/O (call that out explicitly)
- [ ] No secrets, tokens, or credentials are included in this diff

<!-- If any box above is unchecked, explain why. -->
