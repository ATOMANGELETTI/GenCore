# Task 2: Terminal side-panel module

## Goal

Create the Terminal-only left side panel module with three bottom icon tabs and placeholder content. Do **not** wire it into `App` yet (Task 3). Do not touch Explorer or ui-kit AppShell.

## TDD (required)

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

1. Add `lucide-react@1.31.0` with `pnpm add` (needed for tests that render icons; lockfile via pnpm only)
2. Write failing tests in `apps/terminal/tests/unit/side-panel.test.tsx`
3. Run `pnpm --filter @gencore/terminal test` and confirm they fail because `SidePanel` is missing
4. Implement types + component
5. Re-run tests until they pass
6. Run `pnpm --filter @gencore/terminal test typecheck lint`

At implementation start, search modern-web-guidance for tablist / icon-button accessibility (`npx.cmd -y modern-web-guidance@latest search "accessible tablist icon buttons"` then retrieve relevant ids). Apply only guidance that fits this stack (React 19, existing Button + Tooltip, no new deps besides lucide-react).

## Files (only these)

- Create: `apps/terminal/src/modules/side-panel/side-panel.types.ts`
- Create: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- Create: `apps/terminal/tests/unit/side-panel.test.tsx`
- Modify: `apps/terminal/package.json` and the lockfile **only** via `pnpm add lucide-react@1.31.0 --filter @gencore/terminal` (match ui-kit's lucide-react 1.31.0)

Do not modify `apps/terminal/src/modules/app/app.component.tsx` or its tests.
Do not modify Explorer.
Do not modify ui-kit.

## Types (`side-panel.types.ts`)

```ts
export type SidePanelTabId = "files" | "assistant" | "settings";
```

## Component (`side-panel.component.tsx`)

Export `function SidePanel()`.

Root: `<aside data-slot="side-panel">` with classes:
`flex h-full w-60 shrink-0 flex-col border-r border-border bg-card`

Layout:
- Content region above (`min-h-0 flex-1 overflow-auto`): the selected tabpanel
- Tab bar below (`flex h-8 shrink-0 border-t border-border`): three equal-width tabs

Tabs (in this order):

| id | Lucide icon | aria-label + tooltip | Visible placeholder in tabpanel |
|---|---|---|---|
| files | `Folder` | Files | Tab 1 |
| assistant | `Bot` | Assistant | Tab 2 |
| settings | `Settings` | Settings | Tab 3 |

Default selected: `files` / Tab 1.

Accessibility (verbatim):
- Tab bar container: `role="tablist"` `aria-label="Side panel"`
- Each trigger: `role="tab"` `aria-selected` `aria-controls` matching the tabpanel `id`
- Each panel: `role="tabpanel"` with a stable `id` (e.g. `side-panel-files`)
- Only the selected panel is visible; others use the `hidden` attribute
- Icon-only triggers: `aria-label` plus ui-kit `Tooltip` / `TooltipTrigger` / `TooltipContent` / wrap the panel (or tablist) in `TooltipProvider`

Use ui-kit `Button` with `variant="ghost"` `size="icon"` for triggers. Each tab is `flex-1` so the three share the bar equally.

Visual (Nord semantic tokens only — no new hex, no shadows, no gradients):
- Inactive: `text-muted-foreground`; hover `bg-accent` `text-accent-foreground`
- Active: `bg-accent` `text-primary` plus a 2px `bg-primary` indicator on the **top** edge of the tab
- Icons inherit `currentColor` (do not set a hardcoded fill)
- Placeholder copy centered in the content region, `text-sm text-muted-foreground`: exactly `Tab 1`, `Tab 2`, `Tab 3`

No resize, no collapse, no real file tree / bot / settings UI.

## Tests (`apps/terminal/tests/unit/side-panel.test.tsx`)

Use `@testing-library/react` + `@testing-library/user-event`.

Required cases:
1. Default: visible text `Tab 1`; `Tab 2` and `Tab 3` are not visible (hidden panels)
2. Click the tab labeled `Assistant` → visible `Tab 2`; `Tab 1` and `Tab 3` not visible
3. Click the tab labeled `Settings` → visible `Tab 3`
4. Tablist exists with name `Side panel`; three tabs named `Files`, `Assistant`, `Settings`
5. Root is an `aside` / complementary with `data-slot="side-panel"`

Use `getByRole("tab", { name: "Files" })` etc. Do not assert tooltip open state unless cheap.

## Constraints

- Official Nord tokens only
- No `@tauri-apps/*` and no `window.__TAURI__`
- No raw `<button>` if `Button` covers it
- System fonts only
- Do not commit
- Do not add a Tabs primitive to ui-kit

## Work from

`c:\Storage\Development\Workspace\Cursor\GenCore`
