# Task 3: Wire SidePanel into Terminal App

## Goal

Pass the Task 2 `SidePanel` into `AppShell`'s `sidebar` slot from the Terminal `App`. Keep the existing template heading/version in the main content area. Do not touch Explorer or ui-kit.

## TDD (required)

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

1. Add the new failing assertion(s) to `apps/terminal/tests/unit/app.component.test.tsx`
2. Run `pnpm --filter @gencore/terminal test` and confirm the new test fails because `App` does not render the side panel yet
3. Wire `sidebar={<SidePanel />}` in `app.component.tsx`
4. Re-run tests until they pass
5. Run `pnpm --filter @gencore/terminal test` and `pnpm --filter @gencore/terminal typecheck` and `pnpm --filter @gencore/terminal lint` as **separate** scripts (do not chain them onto `test` — vitest will treat extra args as file filters)

## Files (only these)

- Modify: `apps/terminal/src/modules/app/app.component.tsx`
- Modify: `apps/terminal/tests/unit/app.component.test.tsx`

Do not modify SidePanel source, ui-kit, Explorer, or package.json.

## App wiring

In `apps/terminal/src/modules/app/app.component.tsx`:

- Import `SidePanel` from `../side-panel/side-panel.component`
- Pass `sidebar={<SidePanel />}` to `AppShell`
- Keep `contentProps={{ centered: true }}`
- Keep density `compact`, title `APP_TITLE`, version from `getAppInfo`, window callbacks, and the existing centered heading + version copy in children

Existing IPC mocks in the test file stay as they are.

## Tests to add

Keep all existing App tests passing (title, version in titlebar not statusbar, no `window.__TAURI__`).

Add:
1. After render, `getByRole("complementary")` has `data-slot="side-panel"`
2. Default placeholder `Tab 1` is visible
3. The template heading `APP_TITLE` is still present (side panel did not replace the workbench)

Optional but useful: tablist named `Side panel` is in the document.

## Constraints

- Do not commit
- Do not invent colors or restyle chrome
- Do not add collapse/resize
- Do not change Explorer

## Interfaces from earlier tasks

- `AppShell` accepts `sidebar?: React.ReactNode` (Task 1)
- `export function SidePanel()` from `apps/terminal/src/modules/side-panel/side-panel.component.tsx` (Task 2)

## Work from

`c:\Storage\Development\Workspace\Cursor\GenCore`
