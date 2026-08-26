# Whole-branch review: Windows x64 portable release

**Branch:** `feat/windows-x64-portable-release`  
**Range:** `826e62336d50cb82e9c9fc028b8057714ce873e3` .. `e4c266e1cf47ac6481a5d97910921750df98d961`  
**Commits:** `2785f9f` test contract → `170ce89` packager+gitignore → `9bd7733` docs+sync:agents → `e4c266e` tasks checklist  
**Diff:** 12 files, +113 / −33 (no ZIPs, no CI, no `tauri.conf.json`)  
**Tests at HEAD (controller):** `pnpm test:scripts` 34/34. Not re-run.

Reviewed against `.superpowers/docs/specs/2026-08-25-windows-x64-portable-release-design.md` and `.superpowers/docs/plans/2026-08-25-windows-x64-portable-release.md`. Local packaging (Task 4) is gitignored and outside this git range; inner ZIP layout and gitignore behavior are taken from the Task 4 review/report, which independently listed both archives.

### Strengths

- **Plan execution is faithful.** The four commits map 1:1 to Tasks 1–4. `scripts/package-win64.ps1` matches the plan’s prescribed script (helpers, fetch order, `--no-bundle`, `x86_64-pc-windows-msvc`, ZIP name `$Slug-$Version-windows-x64.zip`). `.gitignore` adds `release/**/*.zip` and `release/.staging/` immediately after retained `artifacts/`. Contract tests match the mandated `node:test` file. Docs retarget every in-scope path (`README.md`, root `AGENTS.md`, architecture rule, both app `AGENTS.md`, `.cursor/skills/add-app/SKILL.md`) and `.agents/` copies were generated via `pnpm sync:agents`, not hand-edited.
- **Distribution constraints hold.** Windows x64 portable ZIP only. `bundle.active` remains `false` in both `apps/*/src-tauri/tauri.conf.json`. No installer targets, no 32-bit, no other OS, no GitHub Releases upload. CI was not touched; `.github/workflows/ci.yml` still documents that `tauri build` does not run in CI. `.github/workflows/release.yml` remains Changesets-only.
- **Release ZIPs are not debug builds.** `scripts/package-win64.ps1` contains neither `9223` nor `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`. `apps/terminal/tests/unit/tauri.dev-port.test.ts` still reads this script and forbids those tokens. Port 9223 stays on the `tauri:dev` wrapper only.
- **Archive-on-replace instead of delete.** `Move-ZipToArchive` (`scripts/package-win64.ps1:34-55`) moves a same-named current ZIP to `release/archive/`, then `yyyyMMdd-HHmm`, then `yyyyMMdd-HHmmss`, via two distinct `Get-Date -Format` literals (`:47` and `:50`). The old `Remove-Item -LiteralPath $ZipPath -Force` path is gone.
- **Fail-closed sidecars.** Terminal runs `fetch-oh-my-posh.ps1` and `fetch-micro.ps1`, then `Assert-NonEmptyFile` on both exes before copy. Explorer stays exe-only. Task 4’s live pack produced `release/gencore-terminal-0.1.0-windows-x64.zip` (30,411,419 bytes) with `gencore-terminal.exe` plus `resources/oh-my-posh/**` and `resources/micro/**`, and `release/gencore-explorer-0.1.0-windows-x64.zip` (11,040,408 bytes) with a single exe under `GenCore Explorer-0.1.0-windows-x64/`.
- **Git never sees the binaries.** `git check-ignore` hits `.gitignore:15:release/**/*.zip`. The git range has no `*.zip`. Staging is removed. `release/.gitkeep` and `release/archive/.gitkeep` remain the tracked layout.
- **Safer than the spec’s data-flow order.** Spec lists “archive current ZIP → fetch → build → zip.” The script builds and asserts first, then archives, then `Compress-Archive` (`:119-121`). A failed `tauri build` leaves the previous current ZIP in place. That is a justified improvement, not a functional miss.
- **Scope discipline.** No drive-by CSP/Isolation/capability edits, no `{module}.{role}.{ext}` churn, no AI attribution in commit subjects, no `git add -A` of hook JSON or stray `(1).rs` copies.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

1. **Plan-mandated: `/yyyyMMdd-HHmm/` is a prefix of `yyyyMMdd-HHmmss`** in `scripts/tests/package-win64.test.mjs`. Production script still has both distinct `Get-Date -Format` literals. Do not fix before merge.
2. **Claude Code add-app skill** (`.claude/skills/add-app/SKILL.md`) still omits `Output lands in release/`. Out of Task 3 file list.
3. **Archive collision stamps** were not exercised on the first pack.
4. Bare `/micro/` and `/oh-my-posh/` contract matches are redundant (plan-mandated).
5. Two-level stamp then `Move-Item` can still throw if all three archive names exist (prescribed two-tier spec).

### Assessment

**Ready to merge?** Yes

**Reasoning:** The branch delivers the spec: `pnpm package:win64` writes gitignored Windows x64 ZIPs to `release/`, archives previous same-named ZIPs, fetches Terminal sidecars, keeps `bundle.active` false, and never wires port 9223 into the packager. Remaining items are plan-inherited test softness, an out-of-scope Claude skill mirror, and an unexercised first-pack archive path — none of them are production defects in the landed code.
