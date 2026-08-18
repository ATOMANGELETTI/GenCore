# Side-panel chrome density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Files toolbar actions and the Files / Assistant / Settings tabs smaller so they match Terminal’s compact chrome.

**Architecture:** Add a reusable `icon-xs` size to the ui-kit `Button` (20×20, 12px default SVG). Terminal’s file-tree toolbar uses that size. The side-panel tab strip becomes 24px tall with explicit 12px Lucide glyphs. No IPC, density tokens, or Explorer changes.

**Tech Stack:** React 19.2, Tailwind 4, CVA, Vitest, `@gencore/ui-kit`, `@gencore/terminal`.

## Global Constraints

- Latest **stable** only. No beta/rc/canary.
- Official Nord hex only. Flat chrome: 1px separators, no drop shadows/gradients/skeuomorphism.
- `{module}.{role}.{ext}`. Tests only under that unit’s `tests/` directory.
- Do not edit `apps/explorer`.
- Do not change titlebar height, statusbar height, tree row height, or the FILES label.
- FILES header row stays `h-7` (28px). Bottom tabs become `h-6` (24px). Action buttons become 20×20. Glyphs 12px.
- Keep tooltips, `aria-label`s, the 2px selected-tab indicator, ghost styling, and keyboard tablist behavior.
- Patch changeset for `@gencore/ui-kit` only. Terminal is private — no app changeset.
- Stage **only** the files listed in the task. Never `git add -A`.
- Conventional commits. No Cursor/AI attribution trailers (`Co-authored-by: Cursor`, `Made-with: Cursor`, or similar).
- Work in place on the current branch. Do not create a worktree or switch branches unless asked.
- Do not bump major versions.

---

## File map

**ui-kit**

- Modify: `packages/ui-kit/src/primitives/button/button.variants.ts`
- Modify: `packages/ui-kit/tests/primitives/button.test.tsx`
- Create: `.changeset/button-icon-xs.md`

**terminal**

- Modify: `apps/terminal/src/modules/file-tree/file-tree.component.tsx`
- Modify: `apps/terminal/tests/unit/file-tree.test.tsx`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- Modify: `apps/terminal/tests/unit/side-panel.test.tsx`

---

### Task 1: Button `icon-xs`

**Files:**
- Modify: `packages/ui-kit/tests/primitives/button.test.tsx`
- Modify: `packages/ui-kit/src/primitives/button/button.variants.ts`
- Create: `.changeset/button-icon-xs.md`

**Interfaces:**
- Consumes: existing `buttonVariants` `size` union (`sm` | `default` | `lg` | `icon` | `icon-sm`)
- Produces: `size: "icon-xs"` → classes `size-5 p-0 [&_svg:not([class*='size-'])]:size-3`. `ButtonSize` stays inferred from `VariantProps<typeof buttonVariants>`; do not hand-edit `button.types.ts`.

- [ ] **Step 1: Write the failing test**

In `packages/ui-kit/tests/primitives/button.test.tsx`, add this test next to the existing `icon-sm` case:

```tsx
  it("applies the icon-xs size classes", () => {
    render(<Button size="icon-xs">Go</Button>);

    expect(screen.getByRole("button")).toHaveClass("size-5");
  });
```

Leave the `icon-sm` test (`size-7`) unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/ui-kit test -- tests/primitives/button.test.tsx`

Expected: FAIL — `icon-xs` is not a valid CVA size (type error and/or missing `size-5` class).

- [ ] **Step 3: Add `icon-xs` to CVA**

In `packages/ui-kit/src/primitives/button/button.variants.ts`, extend `size` (keep every existing size):

```ts
      size: {
        sm: "h-7 px-2.5 text-xs",
        default: "h-8 px-3 text-sm",
        lg: "h-9 px-4 text-sm",
        icon: "size-8 p-0",
        "icon-sm": "size-7 p-0",
        "icon-xs": "size-5 p-0 [&_svg:not([class*='size-'])]:size-3",
      },
```

Do not change the base `[&_svg:not([class*='size-'])]:size-4` rule. `icon-xs` adds the 12px override for child SVGs that do not already have a `size-*` class.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/ui-kit test -- tests/primitives/button.test.tsx`

Expected: PASS (including default, destructive/`sm`, `icon-sm`, and `icon-xs`).

- [ ] **Step 5: Add the changeset**

Create `.changeset/button-icon-xs.md`:

```md
---
"@gencore/ui-kit": patch
---

feat: add icon-xs Button size for compact chrome
```

Do not run `pnpm changeset version`.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-kit/tests/primitives/button.test.tsx packages/ui-kit/src/primitives/button/button.variants.ts .changeset/button-icon-xs.md
git commit -m "feat(ui-kit): add icon-xs Button size"
```

---

### Task 2: Files toolbar actions

**Files:**
- Modify: `apps/terminal/tests/unit/file-tree.test.tsx`
- Modify: `apps/terminal/src/modules/file-tree/file-tree.component.tsx`

**Interfaces:**
- Consumes: `Button` `size="icon-xs"` from Task 1
- Produces: New File, New Folder, Refresh, Collapse All are 20×20; FILES row remains `h-7`; Lucide children still have no `size-*` class (Refresh may keep `animate-spin` only)

- [ ] **Step 1: Extend the failing assertion**

In `apps/terminal/tests/unit/file-tree.test.tsx`, inside `it("renders FILES and four labeled buttons"...)`, after the four `getByRole` assertions, add:

```tsx
    for (const name of ["New File", "New Folder", "Refresh", "Collapse All"] as const) {
      expect(screen.getByRole("button", { name })).toHaveClass("size-5");
    }
```

Keep the existing `toolbar()` `h-7` assertion. Do not change the FILES label classes.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/file-tree.test.tsx`

Expected: FAIL — those buttons still have `size-7` from `icon-sm`, not `size-5`.

- [ ] **Step 3: Switch the four actions to `icon-xs`**

In `apps/terminal/src/modules/file-tree/file-tree.component.tsx`, change each of the four toolbar `Button`s from `size="icon-sm"` to `size="icon-xs"`. Do not add `size-*` to the Lucide children. Leave Refresh as:

```tsx
                  <RefreshCw
                    aria-hidden="true"
                    className={cn(tree.refreshing && "animate-spin motion-reduce:animate-none")}
                  />
```

Do not change the wrapping `h-7` toolbar `div`, tooltips, or `aria-label`s.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/file-tree.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/tests/unit/file-tree.test.tsx apps/terminal/src/modules/file-tree/file-tree.component.tsx
git commit -m "feat(terminal): shrink Files toolbar action buttons"
```

---

### Task 3: Side-panel tab strip

**Files:**
- Modify: `apps/terminal/tests/unit/side-panel.test.tsx`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`

**Interfaces:**
- Consumes: existing `Button` `variant="ghost"` (not `icon-xs` — tabs stay stretched)
- Produces: tablist `h-6`; each tab Lucide icon `className="size-3"`; selected 2px top `primary` bar unchanged

- [ ] **Step 1: Write the failing assertions**

In `apps/terminal/tests/unit/side-panel.test.tsx`, extend `it("exposes a Side panel tablist with Files, Assistant, and Settings tabs"...)` to:

```tsx
  it("exposes a Side panel tablist with Files, Assistant, and Settings tabs", async () => {
    await renderSidePanel();

    const tablist = screen.getByRole("tablist", { name: "Side panel" });
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveClass("h-6");
    expect(screen.getByRole("tab", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Assistant" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settings" })).toBeInTheDocument();

    for (const name of ["Files", "Assistant", "Settings"] as const) {
      const icon = screen.getByRole("tab", { name }).querySelector("svg");
      expect(icon).toHaveClass("size-3");
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/side-panel.test.tsx`

Expected: FAIL — tablist is still `h-8`; SVGs do not have `size-3`.

- [ ] **Step 3: Shrink the strip and glyphs**

In `apps/terminal/src/modules/side-panel/side-panel.component.tsx`:

1. Change the tablist class from `flex h-8 shrink-0 border-t border-border` to `flex h-6 shrink-0 border-t border-border`.
2. Change the Lucide render from `<Icon aria-hidden="true" />` to `<Icon aria-hidden="true" className="size-3" />`.

Do not change `size="icon"`, `h-full w-auto flex-1 rounded-none`, the selected `before:h-0.5 before:bg-primary` indicator, tooltips, or keyboard handling.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/side-panel.test.tsx tests/unit/file-tree.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/tests/unit/side-panel.test.tsx apps/terminal/src/modules/side-panel/side-panel.component.tsx
git commit -m "feat(terminal): shrink side-panel tab strip"
```

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
| --- | --- |
| `icon-xs` = `size-5 p-0` + 12px default SVG selector | Task 1 |
| Patch changeset for `@gencore/ui-kit` | Task 1 |
| FILES row stays `h-7` | Task 2 (existing assertion kept) |
| Four actions 20×20, no Lucide `size-*` | Task 2 |
| Tab strip `h-6` | Task 3 |
| Tab glyphs `size-3`; tabs not `icon-xs` | Task 3 |
| Selected 2px bar, tooltips, keyboard | Task 3 (do not touch) |
| No Explorer / titlebar / statusbar / tree row | Global constraints |

**Placeholder scan:** none.

**Type consistency:** `icon-xs` is the CVA size name in Task 1, Task 2 `size="icon-xs"`, and the changeset. Tab buttons stay `size="icon"` with `h-full`.
