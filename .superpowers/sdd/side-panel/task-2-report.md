# Task 2 Report: Terminal side-panel module

## What you implemented

Terminal-only `SidePanel` module. Not wired into `App` (Task 3). Explorer and ui-kit were not touched.

- Types: `SidePanelTabId = "files" | "assistant" | "settings"`
- Root: `<aside data-slot="side-panel">` with `flex h-full w-60 shrink-0 flex-col border-r border-border bg-card`
- Content region above (`min-h-0 flex-1 overflow-auto`): three `role="tabpanel"` nodes with stable ids `side-panel-files` / `side-panel-assistant` / `side-panel-settings`. Unselected panels use the `hidden` attribute
- Tab bar below (`flex h-8 shrink-0 border-t border-border`): `role="tablist"` `aria-label="Side panel"`
- Tabs in order, ui-kit `Button` `variant="ghost"` `size="icon"`, each `flex-1`:

| id | Lucide icon | aria-label + tooltip | Placeholder |
|---|---|---|---|
| files | `Folder` | Files | Tab 1 |
| assistant | `Bot` | Assistant | Tab 2 |
| settings | `Settings` | Settings | Tab 3 |

Default selected: `files` / Tab 1.

Triggers: `role="tab"` `aria-selected` `aria-controls` matching the panel id. Icon-only: `aria-label` plus `TooltipProvider` / `Tooltip` / `TooltipTrigger` / `TooltipContent`. Decorative icons `aria-hidden="true"`.

Visual (Nord tokens only): inactive `text-muted-foreground` with hover `bg-accent` `text-accent-foreground`; active `bg-accent` `text-primary` plus a 2px `bg-primary` top-edge indicator (`before:h-0.5`). Icons inherit `currentColor`. Placeholder copy `text-sm text-muted-foreground`, centered.

Added `lucide-react@1.31.0` to `@gencore/terminal` via `pnpm add lucide-react@1.31.0 --filter @gencore/terminal`.

Modern-web-guidance search `accessible tablist icon buttons` → retrieved `accessibility` and `html`. Applied: native `<button>` via ui-kit `Button` (not a fake control); `hidden` for unselected panels; decorative SVGs `aria-hidden`; no `title` tooltips. Because `role="tab"` must behave like a tab, also added horizontal arrow / Home / End keyboard movement with roving `tabIndex`. Did not adopt Popover API, `inert`, or anchor-positioned sliding underlines — those do not fit this stack or the specified static 2px indicator.

## What you tested and test results

New tests in `apps/terminal/tests/unit/side-panel.test.tsx` (`@testing-library/react` + `@testing-library/user-event`):

1. Default: visible `Tab 1`; `Tab 2` and `Tab 3` not visible
2. Click tab `Assistant` → visible `Tab 2`; `Tab 1` and `Tab 3` not visible
3. Click tab `Settings` → visible `Tab 3`
4. Tablist named `Side panel`; tabs named `Files`, `Assistant`, `Settings` via `getByRole("tab", { name })`
5. Root is complementary `<aside>` with `data-slot="side-panel"`

Did not assert tooltip open state.

Verification (after GREEN):

- **test:** `pnpm --filter @gencore/terminal test` — 4 files, 10 tests passed (vitest 4.1.10)
- **typecheck:** `pnpm --filter @gencore/terminal typecheck` — `tsc -p tsconfig.json --noEmit` succeeded
- **lint:** `pnpm --filter @gencore/terminal lint` — `biome check .` — 22 files, no fixes applied

Note: `pnpm --filter @gencore/terminal test typecheck lint` passes `typecheck`/`lint` as vitest filters and finds no files. Ran the three package scripts separately.

## TDD Evidence

### RED

Wrote tests and added `lucide-react` first. No `SidePanel` source yet.

Command:

```sh
pnpm --filter @gencore/terminal test
```

Relevant failing output:

```
FAIL  tests/unit/side-panel.test.tsx [ tests/unit/side-panel.test.tsx ]
Error: Failed to resolve import "../../src/modules/side-panel/side-panel.component" from "tests/unit/side-panel.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: C:/Storage/Development/Workspace/Cursor/GenCore/apps/terminal/tests/unit/side-panel.test.tsx:4:26
  4  |  import { SidePanel } from "../../src/modules/side-panel/side-panel.component";
     |                             ^
 Test Files  1 failed | 3 passed (4)
      Tests  5 passed (5)
```

Why this failure was expected: the module did not exist. Existing App/IPC tests (5) still passed. The new suite failed to load because the feature was missing, not because of a typo in the test file.

### GREEN

Implemented `side-panel.types.ts` and `side-panel.component.tsx`, then re-ran tests.

Command:

```sh
pnpm --filter @gencore/terminal test
```

Relevant passing output:

```
 Test Files  4 passed (4)
      Tests  10 passed (10)
```

After a typecheck fix in the tests (`getByText` in this Testing Library version does not accept `{ hidden: true }`; switched to `toBeVisible` / `not.toBeVisible` on the same text nodes) and a Biome import-order fix, test / typecheck / lint all succeeded again.

## Files changed

- Create: `apps/terminal/src/modules/side-panel/side-panel.types.ts`
- Create: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- Create: `apps/terminal/tests/unit/side-panel.test.tsx`
- Modify: `apps/terminal/package.json` — `lucide-react: 1.31.0`
- Modify: `pnpm-lock.yaml` — terminal importer only (`specifier: 1.31.0`)

Did not edit `apps/terminal/src/modules/app/app.component.tsx` or its tests. Did not edit Explorer. Did not edit ui-kit. No changeset (private app module, not a published package behavior change). No commit.

## Self-review findings

- Completeness: types, layout, tab order, labels, placeholders, ARIA, Button + Tooltip, Nord classes, and the five required tests match the brief.
- Quality: follows terminal module naming; consumes ui-kit primitives; no Tauri imports; no raw `<button>`.
- YAGNI: no resize, collapse, file tree, assistant, or settings UI. Not passed into `App`.
- TDD: failing import observed first; GREEN after implementation.
- Tests assert visible copy, tab names, and the complementary root — not tooltip state or implementation spies.
- Extra vs listed tests: arrow/Home/End + roving tabindex, from mandated `accessibility` guidance for `role="tab"`. `aria-labelledby` on panels is standard APG and unused by tests.

## Issues or concerns

None that block Task 3. Observations:

- Equal-width `flex-1` is on each `Button`. This assumes Radix `Tooltip` root does not insert a wrapper node (typical). If the bar does not split evenly when wired in Task 3, wrap each trigger in a `flex-1` slot.
- Keyboard behavior is untested; the brief's required cases are click/visibility/roles only.

## Fix: `hidden` + `flex` on tabpanels (final-review Critical)

### What changed

Unselected `role="tabpanel"` nodes used `hidden={selected !== tab.id}` and `className="flex h-full items-center justify-center"` on the same element. Tailwind `.flex { display: flex }` overrides the UA `[hidden] { display: none }`, so unselected panels can stay painted. Tests do not load kit CSS, so `toBeVisible()` stayed green.

Preferred fix from the brief: keep `hidden` on the tabpanel with **no** display utility on that node; wrap flex centering in an inner div.

- Tabpanel: `className="h-full"` + `hidden={selected !== tab.id}`
- Inner wrapper: `className="flex h-full items-center justify-center"`

Did **not** restore AppShell `version` → Statusbar. Did not edit Statusbar, Explorer, or AppShell.

### Tests

In `apps/terminal/tests/unit/side-panel.test.tsx`:

- Kept existing `toBeVisible` / `not.toBeVisible` assertions
- Assert unselected panels have the `hidden` attribute; selected does not
- Assert tabpanels do not have class `flex` (regression for the display conflict)
- Settings click now also asserts Tab 1 and Tab 2 are not visible / have `hidden`

Hidden tabpanels have an empty accessible name in jsdom, so panels are queried by id (`side-panel-files` / `assistant` / `settings`), not `getByRole({ name })`.

### TDD

**RED** — attribute + `not.toHaveClass("flex")` added first, component still had `flex` on the tabpanel.

```
FAIL  tests/unit/side-panel.test.tsx
Error: expect(element).not.toHaveClass("flex")
Expected the element not to have class:
  flex
Received:
  flex h-full items-center justify-center
 Test Files  1 failed | 3 passed (4)
      Tests  3 failed | 8 passed (11)
```

**GREEN** — inner wrapper; tabpanel has `h-full` only.

```
 Test Files  4 passed (4)
      Tests  11 passed (11)
```

### Verification (fresh, separate commands)

- **test:** `pnpm --filter @gencore/terminal test` — 4 files, 11 tests passed (vitest 4.1.10)
- **typecheck:** `pnpm --filter @gencore/terminal typecheck` — `tsc -p tsconfig.json --noEmit` succeeded
- **lint:** `pnpm --filter @gencore/terminal lint` — `biome check .` — 22 files, no fixes applied

### Files changed (this fix)

- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- Modify: `apps/terminal/tests/unit/side-panel.test.tsx`

No commit.
