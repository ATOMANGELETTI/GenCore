---
description: Add a Changesets entry for the @gencore/* package(s) affected by the current changes
---

Add a Changesets entry for the `@gencore/*` package(s) affected by the current changes.

1. Look at the pending diff (or ask the user which package(s) changed) and pick a
   semver bump — `patch` for fixes/internal changes, `minor` for backwards-compatible
   features, `major` for breaking API changes.
2. Write a new file in `.changeset/` with the standard frontmatter
   (`"@gencore/<pkg>": <bump>`) and a conventional-commit-style summary line
   (`feat:`, `fix:`, `chore:`, etc.) describing the change from a consumer's
   perspective.
3. Never add a changeset entry for `apps/terminal` or `apps/explorer` — they are
   private and unpublished, unless the user explicitly says otherwise.
4. Do not run `pnpm changeset version` as part of this command — that's a separate
   release step.
