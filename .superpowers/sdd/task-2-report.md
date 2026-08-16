# Task 2 Report: Dead glyph tokens and patch changeset

## What I implemented

Removed unused traffic-light glyph color tokens from `@gencore/ui-kit` and added a patch changeset. Titlebar files were not edited.

- Deleted `--traffic-glyph: var(--nord-polar-0);` from `theme.polar-night.css` and `theme.snow-storm.css`.
- Deleted only `--color-traffic-glyph: var(--traffic-glyph);` from `globals.css`. Left `--font-sans`, `--font-mono`, and every other globals line unchanged.
- Left fill tokens `--traffic-close` / `--traffic-minimize` / `--traffic-maximize` / `--traffic-inactive` (and their `--color-traffic-*` mappings) in place.
- Added `packages/ui-kit/tests/styles/traffic-tokens.test.ts` asserting `traffic-glyph` is absent from those three stylesheets.
- Added `.changeset/traffic-light-hover.md` (`"@gencore/ui-kit": patch`) with the specified feat summary.

## What I tested and test results

Focused (RED, before token deletion):

```
pnpm --filter @gencore/ui-kit test -- tests/styles/traffic-tokens.test.ts
```

- **FAIL** — 1 file, 1 test. Exit 1. Assertion: `globals.css` still matched `/traffic-glyph/`.

Focused (GREEN, after token deletion):

```
pnpm --filter @gencore/ui-kit test -- tests/styles/traffic-tokens.test.ts
```

- **PASS** — 1 file, 1 test. Duration ~1.03s. Exit 0.

Full package (before commit, required by the brief):

```
pnpm --filter @gencore/ui-kit test
```

- **9 files, 37 tests passed.** Duration ~2.27s. Exit 0.

Focused again after the pre-commit Biome reformat:

```
pnpm --filter @gencore/ui-kit test -- tests/styles/traffic-tokens.test.ts
```

- **PASS** — 1 file, 1 test. Duration ~1.08s. Exit 0.

A later full-suite re-run after commit failed because an unrelated untracked file appeared: `packages/ui-kit/tests/primitives/menu/menu.variants.test.ts` (cannot resolve `../../../src/primitives/menu/menu.variants`). That file is not part of this task and was not staged. Task 2’s own test and the pre-commit full suite were green.

## TDD Evidence

### RED

Command:

```
pnpm --filter @gencore/ui-kit test -- tests/styles/traffic-tokens.test.ts
```

Result: **FAIL** — `1 failed (1)`

Relevant output before implementation:

```
FAIL  tests/styles/traffic-tokens.test.ts > traffic light tokens > does not keep a glyph color after icons were removed
AssertionError: globals.css: expected '/*\n * GenCore ui-kit — single entry …' not to match /traffic-glyph/
...
  --color-traffic-glyph: var(--traffic-glyph);
...
 ❯ tests/styles/traffic-tokens.test.ts:17:29
      expect(css, name).not.toMatch(/traffic-glyph/);
```

Why this failure was expected: the test was written first while `--color-traffic-glyph` / `--traffic-glyph` were still present in `globals.css`, `theme.polar-night.css`, and `theme.snow-storm.css`. Vitest failed on the first stylesheet in the loop (`globals.css`). That is the missing-cleanup failure, not a typo or import error.

### GREEN

Command:

```
pnpm --filter @gencore/ui-kit test -- tests/styles/traffic-tokens.test.ts
```

Relevant passing output after deleting the three token lines:

```
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  17:27:21
   Duration  1.03s
```

Then:

```
pnpm --filter @gencore/ui-kit test
```

```
 Test Files  9 passed (9)
      Tests  37 passed (37)
   Start at  17:27:34
   Duration  2.27s
```

## Files changed

Committed in `9aae58f` (only these five):

- Create: `packages/ui-kit/tests/styles/traffic-tokens.test.ts`
- Modify: `packages/ui-kit/src/styles/theme.polar-night.css`
- Modify: `packages/ui-kit/src/styles/theme.snow-storm.css`
- Modify: `packages/ui-kit/src/styles/globals.css`
- Create: `.changeset/traffic-light-hover.md`

Not staged: hook state, SDD briefs, Terminess LICENSE deletion, `docs/`, and later untracked `packages/ui-kit/tests/primitives/menu/`.

## Self-review findings

- Completeness: brief steps 1–5 done; no titlebar edits; fill tokens retained; globals change is a single-line deletion.
- Discipline: no extra refactors, no new tokens, no `git add -A`, stayed on `main`, no amend, no worktree.
- Testing: red-then-green observed; failure reason matched leftover tokens; pre-commit full ui-kit suite was pristine (9/37).
- Pre-commit hook ran `biome check --write` and collapsed the stylesheet-name array onto one line. Semantics match the brief; not byte-identical to the snippet.
- Commit subject matches the brief: `chore(ui-kit): drop unused traffic-glyph token`.

## Issues or concerns

- Dirty tree is still dirty with unrelated WIP. After this commit, an untracked menu variants test appeared and makes a subsequent `pnpm --filter @gencore/ui-kit test` fail. That is concurrent work, not a Task 2 regression. The required pre-commit full suite was green.
