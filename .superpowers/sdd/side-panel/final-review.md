### Strengths

- Kit vs app split matches the plan: `@gencore/ui-kit` only gained an optional `sidebar` slot and a conditional `app-shell-body` wrap; the Folder/Bot/Settings UI lives in `apps/terminal/src/modules/side-panel/`. Explorer’s app module is not wired to a rail.
- Landmark layout is correct. With a sidebar, `aside` and `main` are siblings under `data-slot="app-shell-body"` (`flex min-h-0 flex-1`); without one, `ContentArea` stays a direct child of the shell, so the existing density test (`main.parentElement` is the shell) remains valid.
- `SidePanel` is data-driven (`TABS` keeps id / icon / label / placeholder in one place). Panel ids are derived, so `aria-controls` cannot drift from `tabpanel` `id`. Default is files / Tab 1. Placeholders are exactly `Tab 1` / `Tab 2` / `Tab 3`.
- Visual language follows the plan: `w-60` / `bg-card` / `border-r border-border`, `h-8` tab bar, ghost `size="icon"` buttons with `flex-1`, inactive `text-muted-foreground`, active `bg-accent text-primary` plus a 2px top `before:h-0.5 before:bg-primary` indicator. Nord semantic tokens only; icons are `aria-hidden` and inherit `currentColor`.
- Accessible tablist surface is in place: `role="tablist"` `aria-label="Side panel"`, tabs with `aria-selected` / `aria-controls` / `aria-label`, panels with `aria-labelledby`. Arrow / Home / End plus roving `tabIndex` is a justified extra beyond the click-only brief. `Tooltip.Root` in this kit does not emit a DOM node; `TooltipTrigger asChild` keeps the tablist’s DOM children as the three buttons, so `flex-1` can split the bar.
- `lucide-react` is pinned at `1.31.0` on `@gencore/terminal`, matching ui-kit. The slot changeset is a ui-kit **minor** (`feat: optional AppShell sidebar slot`). App still passes `contentProps={{ centered: true }}` and keeps the template heading.
- Controller verification this session: `@gencore/ui-kit` 31/31, `@gencore/terminal` 11/11; typecheck and lint clean on both.

### Issues

#### Critical

1. **`hidden` plus Tailwind `flex` on the same tabpanel — unselected panels can stay painted**
   - File: `apps/terminal/src/modules/side-panel/side-panel.component.tsx:71-78`
   - What’s wrong: Each `role="tabpanel"` sets `hidden={selected !== tab.id}` and `className="flex h-full items-center justify-center"`. Tailwind 4.3.3 preflight in this repo has **no** `[hidden] { display: none !important }` (that rule existed in v3 preflight; it is absent from `tailwindcss@4.3.3/preflight.css`). Author-origin `.flex { display: flex }` overrides the UA `[hidden] { display: none }`.
   - Why it matters: The plan requires only the selected panel to be visible. With all three panels painted, each `h-full` inside `overflow-auto`, the rail grows a 3× scrollbar and Tab 2 / Tab 3 remain in the scroll flow. Terminal tests never import kit CSS (`apps/terminal/tests/setup.ts`); `toBeVisible()` / `not.toBeVisible()` read the `hidden` IDL flag, not computed `display`. Suite stays green while the product can show every placeholder.
   - How to fix: Do not put a `display` utility on the node that uses the `hidden` attribute. Either wrap the flex centering in an inner div, or `cn("h-full items-center justify-center", selected === tab.id ? "flex" : "hidden")` so `tailwind-merge` keeps a single display value. Add a test that would fail if that contract regresses (for example `toHaveAttribute("hidden")` plus a class contract, or a CSS-loaded computed-style check).

#### Important

1. **AppShell stops forwarding `version` to Statusbar — out of scope and not merge-safe alone**
   - Files: `packages/ui-kit/src/composites/app-shell/app-shell.component.tsx:53`; `packages/ui-kit/tests/composites/app-shell.test.tsx:47-50`; `apps/terminal/src/modules/app/app.component.tsx:9`; `apps/terminal/tests/unit/app.component.test.tsx:35-41`
   - What’s wrong: HEAD AppShell still does `<Statusbar … version={version} />`. HEAD Statusbar still has a `version` prop. HEAD Explorer tests still expect `contentinfo` to contain the version. This feature package removes the forward, flips ui-kit and Terminal asserts to “titlebar only”, and the sidebar changeset does not mention it. The plan said not to restyle titlebar/statusbar.
   - Why it matters: Landing only these files onto HEAD drops version from Explorer’s statusbar and fails `apps/explorer/tests/unit/app.component.test.tsx` on HEAD. The working tree already has companion Statusbar API + Explorer test + `.changeset/hide-statusbar-version.md` WIP; this package is coupled to that work without including it.
   - How to fix: Restore `version={version}` in the sidebar-only change and keep the old version asserts, **or** land the statusbar version change in the same merge (Statusbar types/component, Explorer test update, `hide-statusbar-version` changeset) and treat it as a separate changelog entry. Do not leave the AppShell half of that change inside the sidebar slot commit with no mention.

#### Minor

Already recorded (not re-litigated):

- `app-shell.component.tsx:44` uses truthy `sidebar ?` rather than `sidebar != null`.
- AppShell tests prove a shared parent, not document order or the `flex min-h-0 flex-1` classes.
- Arrow / Home / End + roving `tabIndex` have no dedicated test.
- Settings click test (`side-panel.test.tsx:26-33`) does not assert Tab 1 / Tab 2 are hidden.

New:

1. **AppShell docs still describe a three-region frame**
   - File: `packages/ui-kit/src/composites/app-shell/app-shell.component.tsx:8-12`; `app-shell.types.ts:17`
   - The header comment is still “titlebar, content, statusbar”. `sidebar` has no types JSDoc (consumers must supply their own `<aside>`, width, and overflow).
   - Fix: One-line note that `sidebar` is rendered as-is to the left of `ContentArea` when provided.

2. **Static tabpanels are not in the tab order**
   - File: `apps/terminal/src/modules/side-panel/side-panel.component.tsx:72-78`
   - APG recommends `tabIndex={0}` on a tabpanel that has no focusable descendants so Tab moves from the selected tab into the panel. Placeholders are inert text, so impact is low until a file tree lands.
   - Fix: Add `tabIndex={0}` on the visible panel (or wait until real content is focusable).

### Recommendations

- Fix the `hidden` / `flex` conflict before any real Files / Assistant / Settings content. That is the change most likely to cascade.
- Split or bundle the statusbar `version` work explicitly. Preferred order: land `hide-statusbar-version` first (or in the same PR with both changesets), then the sidebar slot.
- When committing, include the `pnpm-lock.yaml` `apps/terminal` `lucide-react@1.31.0` importer. It is updated in the working tree but omitted from `final-review.diff`.
- Optional hardening: `min-w-0` on `app-shell-body` (or ContentArea in the sidebar branch) so a future wide workbench cannot blow out the row. ContentArea already has `overflow-auto`, which zeros the automatic min size in current Chromium, so this is defensive, not a current bug.
- If keyboard roving stays, add one `userEvent.keyboard` case (ArrowRight from Files → Tab 2) and make the Settings click case assert the other panels are hidden, same as the Assistant case.

### Assessment

**Ready to merge?** With fixes

**Reasoning:** The slot, Terminal-only panel, tokens, wiring, and scoped verification match the plan. Two things block a clean land: unselected tabpanels can remain painted because `flex` fights the `hidden` attribute (tests do not catch it), and the package also changes AppShell version→Statusbar behavior, which will fail HEAD Explorer tests unless that companion change is landed or reverted.
