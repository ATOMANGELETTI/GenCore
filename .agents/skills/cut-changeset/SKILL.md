---
name: "cut-changeset"
description: "Adds a Changesets entry for one or more @gencore/* packages with a conventional-commit-style summary. Use when the user asks to prepare a release, bump a package version, or record a changelog entry."
---

<!-- Generated from .cursor/skills/cut-changeset/SKILL.md by `pnpm sync:agents`. Do not edit. -->


# Cut changeset

Use this when a `@gencore/*` package needs a version bump recorded.

## Steps

1. Identify which `@gencore/*` package(s) changed and the correct semver bump
   (`patch`/`minor`/`major`) per Changesets conventions (breaking API = major, new
   backwards-compatible feature = minor, fix/internal = patch).
2. Run `pnpm changeset` (interactive) or hand-write a file in `.changeset/` following
   the existing frontmatter format:

   ```
   ---
   "@gencore/ui-kit": patch
   ---

   fix: correct Nord token name for tooltip background
   ```

3. Write the summary as a conventional-commit-style one-liner (`feat:`, `fix:`,
   `chore:`, etc.) describing the change from a consumer's perspective, not
   implementation detail.
4. Apps (`apps/terminal`, `apps/explorer`) are private and never get their own
   changeset entry unless the task explicitly says they're being published.
5. Do not run `pnpm changeset version` yourself unless asked — that step is part of the
   release flow, not day-to-day development.

## Constraints

One changeset file per logical change; don't bundle unrelated package bumps together.
