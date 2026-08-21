---
trigger: always_on
description: "Dependency version policy — latest stable only, no pre-releases"
---

<!-- Generated from .cursor/rules/versions.mdc by `pnpm sync:agents`. Do not edit. -->


# Versions

- Always use the latest **stable** release of a dependency. Never add `beta`, `rc`,
  `canary`, `next`, or `alpha` tags.
- Locked stack as of 2026-08-15 (re-resolve to current stables when adding/upgrading;
  do not downgrade below these):
  - React 19.2 / Vite 8 / Tauri 2 / Tailwind 4 / Biome / pnpm 11 / Node >=22.13
- Before adding a new dependency, check the currently installed major/minor for related
  packages in the same workspace (e.g. `@tauri-apps/*`, `@vitejs/*`) and match that major
  line unless the task explicitly requires a bump.
- Do not hand-edit lockfiles. Use the package manager (`pnpm add`, `cargo add`) so
  versions resolve correctly.
- If a task requires a version newer than what's listed above, use it — this list is a
  floor, not a ceiling — but confirm it is a stable release first.
