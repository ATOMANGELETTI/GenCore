# Windows x64 portable release

Spec: `.superpowers/docs/specs/2026-08-25-windows-x64-portable-release-design.md`
Plan: `.superpowers/docs/plans/2026-08-25-windows-x64-portable-release.md`

- [ ] Task 1: Failing package-win64 contract tests (Grok) — node:test contract for release/ archive/ gitignore
- [ ] Task 2: Retarget packager and gitignore (Grok) — script writes release/, archives previous ZIPs, fetches micro
- [ ] Task 3: Docs and agent sync (Grok) — README/AGENTS/rules/skill say release/; pnpm sync:agents
- [ ] Task 4: Package Terminal and Explorer (Grok) — pnpm package:win64 produces both ZIPs
