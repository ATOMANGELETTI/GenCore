---
trigger: always_on
description: "Superpowers artifact paths — keep all plugin output under .superpowers/"
---

<!-- Generated from .cursor/rules/superpowers.mdc by `pnpm sync:agents`. Do not edit. -->


# Superpowers artifacts

The Superpowers plugin defaults to `docs/superpowers/`. This repo overrides those
paths. User instructions take precedence over Superpowers skill defaults.

All Superpowers files live under `.superpowers/`:

- Specs: `.superpowers/docs/specs/YYYY-MM-DD-<topic>-design.md`
- Plans: `.superpowers/docs/plans/YYYY-MM-DD-<feature-name>.md`
- Reviews: `.superpowers/docs/reviews/`
- Visual companion: `.superpowers/brainstorm/` (plugin default)
- SDD scratch: `.superpowers/sdd/` (plugin default)

Never write to `docs/superpowers/`, `docs/plans/`, or `docs/specs/`.

Do **not** gitignore the entire `.superpowers/` folder. The visual-companion skill
suggests that; ignore it here so tracked docs survive. Gitignore only:

- `.superpowers/brainstorm/`
- `.superpowers/sdd/`

Keep `.superpowers/docs/` tracked.
