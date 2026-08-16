# Task 3 Report: Wire SidePanel into Terminal App

## What you implemented

Terminal `App` now passes Task 2 `SidePanel` into `AppShell`'s `sidebar` slot. Explorer, ui-kit, and `SidePanel` source were not touched. No commit.

In `apps/terminal/src/modules/app/app.component.tsx`:

- Import `SidePanel` from `../side-panel/side-panel.component`
- Pass `sidebar={<SidePanel />}` to `AppShell`
- Kept `contentProps={{ centered: true }}`, density `compact`, title `APP_TITLE`, version from `getAppInfo`, window callbacks, and the centered heading + version children

Existing IPC mocks in the App test file were left as they are.

## What you tested and test results

Added one App test in `apps/terminal/tests/unit/app.component.test.tsx`:

`renders SidePanel in the sidebar without replacing the workbench heading`

Assertions (after render):

1. `getByRole("heading", { name: APP_TITLE })` is present (workbench not replaced)
2. `getByRole("complementary")` has `data-slot="side-panel"`
3. Default placeholder `Tab 1` is visible
4. Optional: `getByRole("tablist", { name: "Side panel" })` is in the document

Existing App tests kept: exact title in heading/titlebar, version in titlebar not statusbar, no `window.__TAURI__`.

Verification (separate scripts, after GREEN):

- **test:** `pnpm --filter @gencore/terminal test` — 4 files, 11 tests passed (vitest 4.1.10)
- **typecheck:** `pnpm --filter @gencore/terminal typecheck` — `tsc -p tsconfig.json --noEmit` succeeded
- **lint:** `pnpm --filter @gencore/terminal lint` — `biome check .` — 22 files, no fixes applied

Did not chain `typecheck`/`lint` onto `test`.

## TDD Evidence

### RED

Added the new App assertions first. No `sidebar` / `SidePanel` wiring yet.

Command:

```sh
pnpm --filter @gencore/terminal test
```

Relevant failing output:

```
FAIL  tests/unit/app.component.test.tsx > App > renders SidePanel in the sidebar without replacing the workbench heading
TestingLibraryElementError: Unable to find an accessible element with the role "complementary"

Here are the accessible roles:
  banner:
  button:
  main:
  heading:
    Name "Tauri Terminal Template":
  contentinfo:

 Test Files  1 failed | 3 passed (4)
      Tests  1 failed | 10 passed (11)
```

Why this failure was expected: `App` still rendered only titlebar / centered `APP_TITLE` heading / statusbar. There was no complementary rail, so `getByRole("complementary")` failed because the feature was missing, not because of a typo. The heading assertion had already passed (workbench still present). Existing App/IPC/SidePanel tests (10) still passed.

### GREEN

Wired `sidebar={<SidePanel />}` in `app.component.tsx`, then re-ran tests.

Command:

```sh
pnpm --filter @gencore/terminal test
```

Relevant passing output:

```
 Test Files  4 passed (4)
      Tests  11 passed (11)
```

## Files changed

- Modify: `apps/terminal/src/modules/app/app.component.tsx` — SidePanel import + `sidebar={<SidePanel />}`
- Modify: `apps/terminal/tests/unit/app.component.test.tsx` — one new wiring test

Did not edit SidePanel source, ui-kit, Explorer, or `package.json`. No changeset (private app wiring, not a published package behavior change). No commit.

Note: those two files already had uncommitted working-tree edits before this task (titlebar-only version copy/test). This task only added the import, `sidebar` prop, and the new SidePanel assertions.

## Self-review findings

- Completeness: import path, `sidebar={<SidePanel />}`, preserved chrome/content props, required + optional assertions, existing App tests retained.
- Quality: one-line wiring; no restyle, collapse, or resize.
- YAGNI: App only composes `SidePanel`; no SidePanel or AppShell changes.
- TDD: complementary missing observed first; GREEN after the `sidebar` prop.
- Tests assert landmarks, visible default placeholder, and heading — not implementation spies.

## Issues or concerns

None.
