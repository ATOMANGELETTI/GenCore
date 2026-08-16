# Fix: unselected tabpanels stay painted (`hidden` + `flex`)

## Critical (must fix)

In `apps/terminal/src/modules/side-panel/side-panel.component.tsx`, each `role="tabpanel"` uses `hidden={selected !== tab.id}` **and** `className="flex h-full items-center justify-center"`.

Tailwind 4 `.flex { display: flex }` overrides the UA `[hidden] { display: none }`. Unselected panels can remain painted. Tests import no kit CSS, so `toBeVisible()` stays green.

**Fix (pick one, prefer the inner wrapper):**
- Wrap the flex centering in an inner div; keep `hidden` on the tabpanel with **no** display utility on that same node
- Or `cn("h-full", selected === tab.id ? "flex items-center justify-center" : "hidden")` so only one display value wins

**Tests:** In `apps/terminal/tests/unit/side-panel.test.tsx`, assert unselected panels have the `hidden` attribute (and selected does not). Keep existing visibility assertions. For the Settings click case, also assert Tab 1 and Tab 2 are not visible / have `hidden`.

## Important — do NOT change

AppShell no longer forwards `version` to Statusbar. That is **pre-existing companion WIP** (`.changeset/hide-statusbar-version.md`, Statusbar files, Explorer test). Do not restore `version={version}`. Do not edit Statusbar, Explorer, or AppShell for this.

## Also do not

- Commit
- Touch ui-kit except if you somehow must (you must not)
- Add collapse/resize or real tab content

## Verify

Run separately:
- `pnpm --filter @gencore/terminal test`
- `pnpm --filter @gencore/terminal typecheck`
- `pnpm --filter @gencore/terminal lint`

TDD: add/adjust the failing attribute assertion first if you can show RED, then fix.

## Work from

`c:\Storage\Development\Workspace\Cursor\GenCore`
