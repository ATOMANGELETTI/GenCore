# Task 1: AppShell sidebar slot

## Goal

Add an optional `sidebar` slot to `@gencore/ui-kit` `AppShell` so a left rail can sit between the titlebar and statusbar as a sibling of `<main>`. Explorer is unchanged. Do not build the Terminal side panel in this task.

## TDD (required)

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

1. Write the new failing test(s) in `packages/ui-kit/tests/composites/app-shell.test.tsx`
2. Run `pnpm --filter @gencore/ui-kit test` and confirm the new test fails because `sidebar` is missing (not a typo)
3. Implement the minimal types + component change
4. Re-run tests and confirm they pass
5. Add the changeset
6. Run `pnpm --filter @gencore/ui-kit test typecheck lint`

## Files (only these)

- Modify: `packages/ui-kit/src/composites/app-shell/app-shell.types.ts`
- Modify: `packages/ui-kit/src/composites/app-shell/app-shell.component.tsx`
- Modify: `packages/ui-kit/tests/composites/app-shell.test.tsx`
- Create: `.changeset/app-shell-sidebar-slot.md` (do not edit `.changeset/hide-statusbar-version.md`)

Do not touch Explorer, Terminal app modules, statusbar files, or titlebar files.

## Types

Add to `AppShellProps`:

```ts
sidebar?: React.ReactNode;
```

## Component behavior

When `sidebar` is set:

- Wrap `sidebar` + `ContentArea` in a div with `data-slot="app-shell-body"` and classes `flex min-h-0 flex-1`
- Render `sidebar` first (left), then `<ContentArea {...contentProps}>{children}</ContentArea>`
- Titlebar stays above the body; Statusbar stays below

When `sidebar` is omitted:

- Keep today's single `<ContentArea {...contentProps}>{children}</ContentArea>` as a direct child of `[data-slot="app-shell"]`
- Existing tests must keep passing, including the density test that reads `screen.getByRole("main").parentElement` (that parent must remain the app-shell when no sidebar is passed)

Do not restyle titlebar/statusbar. Do not invent colors. Do not add resize/collapse.

## Tests to add

1. When `sidebar={<aside>Rail</aside>}` is passed:
   - `getByRole("complementary")` (or the aside) and `getByRole("main")` are siblings under `[data-slot="app-shell-body"]`
   - aside/sidebar content is "Rail"
   - main still contains the children
   - titlebar and statusbar still exist
2. When `sidebar` is omitted, existing landmarks stay: banner / main / contentinfo as today; no `app-shell-body`

## Changeset

Create `.changeset/app-shell-sidebar-slot.md`:

```md
---
"@gencore/ui-kit": minor
---

feat: optional AppShell sidebar slot
```

## Constraints

- Official Nord tokens only; no new hex
- No `@tauri-apps/*` in ui-kit
- Tests only under `packages/ui-kit/tests/`
- Do not commit
- Do not revert existing uncommitted AppShell/Statusbar work (version lives in the titlebar only; Statusbar has no version prop)
- Working tree is already dirty on these chrome files — add the sidebar slot on top; do not rewrite unrelated hunks

## Work from

`c:\Storage\Development\Workspace\Cursor\GenCore`
