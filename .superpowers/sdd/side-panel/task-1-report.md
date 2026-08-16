# Task 1 Report: AppShell sidebar slot

## What you implemented

Optional `sidebar?: React.ReactNode` on `@gencore/ui-kit` `AppShell`.

When `sidebar` is set, `AppShell` wraps the rail and `ContentArea` in:

```tsx
<div data-slot="app-shell-body" className="flex min-h-0 flex-1">
  {sidebar}
  <ContentArea {...contentProps}>{children}</ContentArea>
</div>
```

Titlebar stays above that body; Statusbar stays below. When `sidebar` is omitted, `ContentArea` remains a direct child of `[data-slot="app-shell"]` so existing density tests (`main.parentElement` is the shell) keep working.

Explorer and the Terminal side panel were not built. Titlebar/Statusbar styling was not changed. No resize/collapse.

## What you tested and test results

New tests in `packages/ui-kit/tests/composites/app-shell.test.tsx`:

1. `places sidebar and main as siblings under the body slot` — `sidebar={<aside>Rail</aside>}`: complementary + main share `[data-slot="app-shell-body"]`, rail text is "Rail", main still has children, titlebar/statusbar landmarks remain.
2. `omits the body slot when sidebar is not passed` — banner / main / contentinfo as today; no `app-shell-body`.

Verification (`pnpm --filter @gencore/ui-kit test`, then `typecheck`, then `lint`):

- **test:** 6 files, 31 tests passed (vitest 4.1.10)
- **typecheck:** `tsc -p tsconfig.json --noEmit` succeeded
- **lint:** `biome check .` — 58 files, no fixes applied

## TDD Evidence

### RED

Command:

```sh
pnpm --filter @gencore/ui-kit test
```

Relevant failing output (before any production change):

```
FAIL  tests/composites/app-shell.test.tsx > AppShell > places sidebar and main as siblings under the body slot
TestingLibraryElementError: Unable to find an accessible element with the role "complementary"
...
      data-slot="app-shell"
      sidebar="[object Object]"
...
 Test Files  1 failed | 5 passed (6)
      Tests  1 failed | 30 passed (31)
```

Why this failure was expected: `sidebar` was not a declared/destructured prop, so React spread it onto the shell as a DOM attribute (`sidebar="[object Object]"`). The `<aside>Rail</aside>` was never rendered, so `getByRole("complementary")` failed. The omit-body test already passed because that is existing behavior.

### GREEN

Command:

```sh
pnpm --filter @gencore/ui-kit test
```

Relevant passing output (after types + component):

```
 Test Files  6 passed (6)
      Tests  31 passed (31)
```

## Files changed

- `packages/ui-kit/src/composites/app-shell/app-shell.types.ts` — added `sidebar?: React.ReactNode`
- `packages/ui-kit/src/composites/app-shell/app-shell.component.tsx` — destructure `sidebar`; conditional `app-shell-body` wrapper
- `packages/ui-kit/tests/composites/app-shell.test.tsx` — two new tests (pre-existing Statusbar version assertions left as they were)
- `.changeset/app-shell-sidebar-slot.md` — minor `@gencore/ui-kit`, `feat: optional AppShell sidebar slot`

Did not edit `.changeset/hide-statusbar-version.md`, Explorer, Terminal app modules, statusbar, or titlebar files.

## Self-review findings

- Completeness: types, layout, omit path, tests, and changeset match the brief verbatim.
- Quality: follows existing AppShell slot/landmark patterns; `sidebar` is pulled out of `...props` so it cannot leak onto the DOM.
- YAGNI: no panel UI, no colors, no resize/collapse, no Explorer/Terminal wiring.
- TDD: failing test written and observed first; failure was missing feature, not a typo.
- Tests assert real landmarks and sibling DOM, not implementation spies.
- Pre-existing dirty Statusbar/titlebar-version hunks were left in place.

## Issues or concerns

None for this task. Body utility classes (`flex min-h-0 flex-1`) are implemented as specified but not asserted in tests — the brief's test list did not require that.
