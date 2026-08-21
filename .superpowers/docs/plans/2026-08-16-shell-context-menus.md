# Shell Context Menus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared Radix ContextMenu primitive to `@gencore/ui-kit`, attach optional titlebar/content slots on AppShell, suppress the native menu on the rest of the shell (including the statusbar), and compose Terminal-only menus (window controls on the titlebar; Cut/Copy/Paste/Select All on the content area).

**Architecture:** ui-kit owns the primitive and AppShell attachment points. Apps pass React nodes into `titlebarContextMenu` and `contentContextMenu`. The kit never imports `@tauri-apps/*`. Terminal owns item trees and wires existing `ipc.window` callbacks plus browser clipboard helpers. Explorer is not edited.

**Tech Stack:** React 19.2, `radix-ui` 1.6.7 (`ContextMenu`), CVA, Tailwind 4, Nord tokens, Vitest, Testing Library, Changesets.

## Global Constraints

- Official Nord hex only (`nord0`–`nord15`). Menu chrome uses existing semantic tokens: `bg-popover`, `text-popover-foreground`, `border-border`, `bg-accent`, `text-destructive`. No ad-hoc hex, no Tailwind default palette, no box-shadow, no gradient.
- Flat macOS chrome. Menu look must match DropdownMenu (same shared CVA). No enter/exit animation beyond what DropdownMenu already does (none).
- Import primitives from `radix-ui` (unified). Never `@radix-ui/react-*`. Never `@tauri-apps/*` inside `packages/ui-kit`.
- Modular files: `{module}.{role}.{ext}`. Tests only under that package/app `tests/`. No colocated `*.test.tsx`.
- No Sub/submenu in v1. No theme toggle, sidebar toggle, Inspect/Reload, PTY actions, or clipboard Tauri plugin. No new capability grants.
- Titlebar items are exactly Minimize, Maximize, Close. Close uses `variant="destructive"`. Content items are exactly Cut, Copy, Paste, Select All with shortcuts `Ctrl+X` / `Ctrl+C` / `Ctrl+V` / `Ctrl+A`.
- AppShell always `preventDefault`s `contextmenu` on `[data-slot="app-shell"]`. Statusbar also `preventDefault`s so a standalone Statusbar has no native menu. Do not wrap Statusbar or the side panel in ContextMenu.
- Slot wrap uses `menu != null` (not a truthy check). Keep `data-tauri-drag-region` on the titlebar. Do not edit `apps/explorer`.
- Do not change Terminal template copy: `Tauri Terminal Template` plus version from `get_app_info`.
- Latest stable only. Do not add dependencies. `radix-ui` already exports `ContextMenu`.
- Stage **only** the files listed in the task. Never `git add -A`. Work in place on `main` (running `tauri:dev`). Do not create a worktree or switch branches.
- Follow TDD: failing test first, watch it fail, then minimal implementation. Record RED/GREEN evidence in the report.
- Conventional commit messages. Commit only the task files.

---

## File map

- Create: `packages/ui-kit/src/primitives/menu/menu.variants.ts` — shared CVA (no Radix origin var).
- Create: `packages/ui-kit/tests/primitives/menu/menu.variants.test.ts`
- Modify: `packages/ui-kit/src/primitives/dropdown-menu/dropdown-menu.variants.ts` — re-export wrappers that add dropdown origin only on content.
- Create: `packages/ui-kit/src/primitives/context-menu/context-menu.types.ts`
- Create: `packages/ui-kit/src/primitives/context-menu/context-menu.variants.ts`
- Create: `packages/ui-kit/src/primitives/context-menu/context-menu.component.tsx`
- Create: `packages/ui-kit/src/primitives/context-menu/index.ts`
- Create: `packages/ui-kit/tests/primitives/context-menu/context-menu.test.tsx`
- Modify: `packages/ui-kit/src/index.ts` — export context-menu.
- Modify: `packages/ui-kit/src/composites/app-shell/app-shell.types.ts`
- Modify: `packages/ui-kit/src/composites/app-shell/app-shell.component.tsx`
- Modify: `packages/ui-kit/src/composites/statusbar/statusbar.component.tsx`
- Modify: `packages/ui-kit/tests/composites/app-shell.test.tsx`
- Create: `packages/ui-kit/tests/composites/statusbar.test.tsx`
- Create: `apps/terminal/src/modules/context-menu/context-menu.clipboard.ts`
- Create: `apps/terminal/src/modules/context-menu/context-menu.titlebar.tsx`
- Create: `apps/terminal/src/modules/context-menu/context-menu.content.tsx`
- Modify: `apps/terminal/src/modules/app/app.component.tsx`
- Create: `apps/terminal/tests/unit/context-menu.clipboard.test.ts`
- Create: `apps/terminal/tests/unit/context-menu.titlebar.test.tsx`
- Create: `apps/terminal/tests/unit/context-menu.content.test.tsx`
- Modify: `apps/terminal/tests/unit/app.component.test.tsx` — only if wiring breaks existing assertions; prefer keep passing unchanged.
- Create: `.changeset/shell-context-menus.md`

---

### Task 1: Shared menu variants

**Files:**
- Create: `packages/ui-kit/tests/primitives/menu/menu.variants.test.ts`
- Create: `packages/ui-kit/src/primitives/menu/menu.variants.ts`
- Modify: `packages/ui-kit/src/primitives/dropdown-menu/dropdown-menu.variants.ts`

**Interfaces:**
- Consumes: current class strings in `dropdown-menu.variants.ts` (copy them verbatim into shared variants, minus the dropdown origin class).
- Produces: `menuContentVariants`, `menuItemVariants`, `menuIndicatorItemVariants`, `menuLabelVariants`, `menuSeparatorVariants`, `menuShortcutVariants`. Dropdown wrappers keep the same export names. `dropdownMenuContentVariants()` includes `origin-(--radix-dropdown-menu-content-transform-origin)` plus every class from `menuContentVariants()`. Other dropdown wrappers call the shared `cva` with the same variant props.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-kit/tests/primitives/menu/menu.variants.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  menuContentVariants,
  menuIndicatorItemVariants,
  menuItemVariants,
  menuLabelVariants,
  menuSeparatorVariants,
  menuShortcutVariants,
} from "../../../src/primitives/menu/menu.variants";
import {
  dropdownMenuContentVariants,
  dropdownMenuItemVariants,
} from "../../../src/primitives/dropdown-menu/dropdown-menu.variants";

describe("menu.variants", () => {
  it("uses flat popover chrome with no shadow or gradient", () => {
    const content = menuContentVariants();
    expect(content).toContain("bg-popover");
    expect(content).toContain("text-popover-foreground");
    expect(content).toContain("border-border");
    expect(content).toContain("rounded-md");
    expect(content).toContain("p-1");
    expect(content).toContain("min-w-40");
    expect(content).not.toContain("shadow");
    expect(content).not.toContain("gradient");
    expect(content).not.toContain("origin-");
  });

  it("styles items with accent focus and a destructive variant", () => {
    expect(menuItemVariants()).toContain("focus:bg-accent");
    expect(menuItemVariants({ variant: "destructive" })).toContain("text-destructive");
    expect(menuItemVariants({ inset: true })).toContain("pl-8");
  });

  it("keeps indicator, label, separator, and shortcut chrome", () => {
    expect(menuIndicatorItemVariants()).toContain("pl-8");
    expect(menuLabelVariants()).toContain("text-foreground/70");
    expect(menuSeparatorVariants()).toContain("bg-border");
    expect(menuShortcutVariants()).toContain("tabular-nums");
  });

  it("lets dropdown content add only the dropdown transform origin", () => {
    const shared = menuContentVariants();
    const dropdown = dropdownMenuContentVariants();
    expect(dropdown).toContain(shared);
    expect(dropdown).toContain("origin-(--radix-dropdown-menu-content-transform-origin)");
    expect(dropdownMenuItemVariants({ variant: "destructive" })).toBe(
      menuItemVariants({ variant: "destructive" }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/ui-kit test tests/primitives/menu/menu.variants.test.ts`

Expected: FAIL/ERROR because `src/primitives/menu/menu.variants.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `packages/ui-kit/src/primitives/menu/menu.variants.ts` with the current dropdown class strings, omitting the origin class from content:

```ts
import { cva } from "class-variance-authority";

export const menuContentVariants = cva([
  "z-50 min-w-40 overflow-hidden rounded-md border border-border bg-popover p-1",
  "text-sm text-popover-foreground",
]);

export const menuItemVariants = cva(
  [
    "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 select-none",
    "outline-none transition-colors duration-75",
    "focus:bg-accent focus:text-accent-foreground",
    "data-disabled:pointer-events-none data-disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: "",
        destructive: "text-destructive focus:bg-destructive focus:text-destructive-foreground",
      },
      inset: {
        true: "pl-8",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      inset: false,
    },
  },
);

export const menuIndicatorItemVariants = cva([
  "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 select-none",
  "outline-none transition-colors duration-75",
  "focus:bg-accent focus:text-accent-foreground",
  "data-disabled:pointer-events-none data-disabled:opacity-40",
]);

export const menuLabelVariants = cva(
  "px-2 py-1.5 text-xs font-medium text-foreground/70 select-none",
  {
    variants: {
      inset: {
        true: "pl-8",
        false: "",
      },
    },
    defaultVariants: { inset: false },
  },
);

export const menuSeparatorVariants = cva("-mx-1 my-1 h-px bg-border");

export const menuShortcutVariants = cva(
  "ml-auto text-xs tracking-widest tabular-nums text-foreground/70",
);
```

Replace `packages/ui-kit/src/primitives/dropdown-menu/dropdown-menu.variants.ts` with:

```ts
import { cva } from "class-variance-authority";
import {
  menuContentVariants,
  menuIndicatorItemVariants,
  menuItemVariants,
  menuLabelVariants,
  menuSeparatorVariants,
  menuShortcutVariants,
} from "../menu/menu.variants";

export const dropdownMenuContentVariants = cva([
  menuContentVariants(),
  "origin-(--radix-dropdown-menu-content-transform-origin)",
]);

export const dropdownMenuItemVariants = menuItemVariants;
export const dropdownMenuIndicatorItemVariants = menuIndicatorItemVariants;
export const dropdownMenuLabelVariants = menuLabelVariants;
export const dropdownMenuSeparatorVariants = menuSeparatorVariants;
export const dropdownMenuShortcutVariants = menuShortcutVariants;
```

Do not change `dropdown-menu.component.tsx` or `dropdown-menu/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/ui-kit test tests/primitives/menu/menu.variants.test.ts`

Expected: PASS. Then run `pnpm --filter @gencore/ui-kit test` and confirm the existing suite still passes.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-kit/src/primitives/menu/menu.variants.ts packages/ui-kit/tests/primitives/menu/menu.variants.test.ts packages/ui-kit/src/primitives/dropdown-menu/dropdown-menu.variants.ts
git commit -m "refactor(ui-kit): extract shared menu variants for dropdown and context menus"
```

---

### Task 2: ContextMenu primitive

**Files:**
- Create: `packages/ui-kit/tests/primitives/context-menu/context-menu.test.tsx`
- Create: `packages/ui-kit/src/primitives/context-menu/context-menu.types.ts`
- Create: `packages/ui-kit/src/primitives/context-menu/context-menu.variants.ts`
- Create: `packages/ui-kit/src/primitives/context-menu/context-menu.component.tsx`
- Create: `packages/ui-kit/src/primitives/context-menu/index.ts`
- Modify: `packages/ui-kit/src/index.ts`

**Interfaces:**
- Consumes: `menu*Variants` from Task 1. `ContextMenu` from `radix-ui`.
- Produces public exports (names must match): `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuRadioItem`, `ContextMenuRadioGroup`, `ContextMenuGroup`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`, plus matching `*Props` types and `contextMenu*Variants`. No Sub components. `ContextMenuContent` is portaled, default `sideOffset={5}` (Radix context-menu default). Content class includes `origin-(--radix-context-menu-content-transform-origin)` plus `menuContentVariants()`. Item supports `variant` and `inset` like dropdown. `data-slot` values use `context-menu` / `context-menu-trigger` / `context-menu-content` / `context-menu-item` / `context-menu-checkbox-item` / `context-menu-radio-item` / `context-menu-radio-group` / `context-menu-group` / `context-menu-label` / `context-menu-separator` / `context-menu-shortcut`.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-kit/tests/primitives/context-menu/context-menu.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "../../../src/primitives/context-menu";
import { contextMenuContentVariants, contextMenuItemVariants } from "../../../src/primitives/context-menu/context-menu.variants";
import { menuContentVariants, menuItemVariants } from "../../../src/primitives/menu/menu.variants";

describe("ContextMenu", () => {
  it("opens on right-click and selects an item", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <span>Target</span>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={onSelect}>Minimize</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Target") });
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Minimize" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("applies shared chrome plus the context-menu transform origin", () => {
    expect(contextMenuContentVariants()).toContain(menuContentVariants());
    expect(contextMenuContentVariants()).toContain(
      "origin-(--radix-context-menu-content-transform-origin)",
    );
    expect(contextMenuItemVariants({ variant: "destructive" })).toBe(
      menuItemVariants({ variant: "destructive" }),
    );
  });

  it("marks a destructive item and renders a shortcut", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <span>Target</span>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem variant="destructive">
            Close
            <ContextMenuShortcut>Ctrl+W</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
        </ContextMenuContent>
      </ContextMenu>,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Target") });
    const item = await screen.findByRole("menuitem", { name: /Close/ });
    expect(item).toHaveAttribute("data-variant", "destructive");
    expect(item).toHaveClass("text-destructive");
    expect(screen.getByText("Ctrl+W")).toHaveAttribute("data-slot", "context-menu-shortcut");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/ui-kit test tests/primitives/context-menu/context-menu.test.tsx`

Expected: FAIL because the context-menu module does not exist.

- [ ] **Step 3: Write minimal implementation**

Mirror `dropdown-menu` exactly, swapping the Radix primitive and `data-slot` prefixes. Types file:

```ts
import type { VariantProps } from "class-variance-authority";
import type { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import type * as React from "react";
import type { contextMenuItemVariants } from "./context-menu.variants";

export type ContextMenuProps = React.ComponentPropsWithRef<typeof ContextMenuPrimitive.Root>;
export type ContextMenuTriggerProps = React.ComponentPropsWithRef<
  typeof ContextMenuPrimitive.Trigger
>;
export type ContextMenuGroupProps = React.ComponentPropsWithRef<typeof ContextMenuPrimitive.Group>;
export type ContextMenuRadioGroupProps = React.ComponentPropsWithRef<
  typeof ContextMenuPrimitive.RadioGroup
>;
export type ContextMenuRadioItemProps = React.ComponentPropsWithRef<
  typeof ContextMenuPrimitive.RadioItem
>;
export type ContextMenuCheckboxItemProps = React.ComponentPropsWithRef<
  typeof ContextMenuPrimitive.CheckboxItem
>;
export type ContextMenuSeparatorProps = React.ComponentPropsWithRef<
  typeof ContextMenuPrimitive.Separator
>;
export type ContextMenuContentProps = React.ComponentPropsWithRef<
  typeof ContextMenuPrimitive.Content
>;
export type ContextMenuShortcutProps = React.ComponentPropsWithRef<"span">;

export interface ContextMenuItemProps
  extends Omit<React.ComponentPropsWithRef<typeof ContextMenuPrimitive.Item>, "inset">,
    VariantProps<typeof contextMenuItemVariants> {}

export interface ContextMenuLabelProps
  extends React.ComponentPropsWithRef<typeof ContextMenuPrimitive.Label> {
  inset?: boolean;
}
```

Variants file:

```ts
import { cva } from "class-variance-authority";
import {
  menuContentVariants,
  menuIndicatorItemVariants,
  menuItemVariants,
  menuLabelVariants,
  menuSeparatorVariants,
  menuShortcutVariants,
} from "../menu/menu.variants";

export const contextMenuContentVariants = cva([
  menuContentVariants(),
  "origin-(--radix-context-menu-content-transform-origin)",
]);

export const contextMenuItemVariants = menuItemVariants;
export const contextMenuIndicatorItemVariants = menuIndicatorItemVariants;
export const contextMenuLabelVariants = menuLabelVariants;
export const contextMenuSeparatorVariants = menuSeparatorVariants;
export const contextMenuShortcutVariants = menuShortcutVariants;
```

Component file: copy `dropdown-menu.component.tsx` structure. Import `ContextMenu as ContextMenuPrimitive` from `radix-ui`. Use `CheckIcon` / `DotIcon` from `lucide-react` for checkbox/radio indicators. `ContextMenuContent` default `sideOffset = 5`. Do not add Sub.

`index.ts` re-exports components, types, and variants (same shape as `dropdown-menu/index.ts`).

Add `export * from "./primitives/context-menu";` to `packages/ui-kit/src/index.ts` next to the dropdown-menu export.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @gencore/ui-kit test tests/primitives/context-menu/context-menu.test.tsx`

Expected: PASS. Then `pnpm --filter @gencore/ui-kit test` and `pnpm --filter @gencore/ui-kit typecheck`.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-kit/src/primitives/context-menu packages/ui-kit/tests/primitives/context-menu packages/ui-kit/src/index.ts
git commit -m "feat(ui-kit): add Nord ContextMenu primitive"
```

---

### Task 3: AppShell slots and native-menu suppress

**Files:**
- Modify: `packages/ui-kit/tests/composites/app-shell.test.tsx`
- Create: `packages/ui-kit/tests/composites/statusbar.test.tsx`
- Modify: `packages/ui-kit/src/composites/app-shell/app-shell.types.ts`
- Modify: `packages/ui-kit/src/composites/app-shell/app-shell.component.tsx`
- Modify: `packages/ui-kit/src/composites/statusbar/statusbar.component.tsx`

**Interfaces:**
- Consumes: `ContextMenu`, `ContextMenuTrigger` from Task 2. Existing `Titlebar`, `ContentArea`, `Statusbar`.
- Produces: `AppShellProps.titlebarContextMenu?: React.ReactNode` and `AppShellProps.contentContextMenu?: React.ReactNode`. When a slot is `!= null`, wrap that region in `<ContextMenu><ContextMenuTrigger asChild>{region}</ContextMenuTrigger>{slot}</ContextMenu>`. Do not wrap Statusbar or `sidebar`. Shell root always prevents default `contextmenu` (compose with a caller `onContextMenu` if passed). Statusbar footer always prevents default `contextmenu` (compose with a caller handler). Existing AppShell tests must keep passing, including the sidebar body-slot cases.

- [ ] **Step 1: Write the failing tests**

Append to `packages/ui-kit/tests/composites/app-shell.test.tsx` (keep all existing cases). Import `fireEvent` from `@testing-library/react` and the context-menu pieces:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  ContextMenuContent,
  ContextMenuItem,
} from "../../src/primitives/context-menu";
```

```tsx
  it("suppresses the native context menu on the shell root", () => {
    render(<AppShell title="GenCore">Workbench</AppShell>);
    const shell = document.querySelector("[data-slot='app-shell']") as HTMLElement;
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    shell.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("opens a titlebar context menu only when the titlebar slot is set", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AppShell title="GenCore">Workbench</AppShell>);
    await user.pointer({ keys: "[MouseRight]", target: screen.getByRole("banner") });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    rerender(
      <AppShell
        title="GenCore"
        titlebarContextMenu={
          <ContextMenuContent>
            <ContextMenuItem>Minimize</ContextMenuItem>
          </ContextMenuContent>
        }
      >
        Workbench
      </AppShell>,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByRole("banner") });
    expect(await screen.findByRole("menuitem", { name: "Minimize" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveAttribute("data-tauri-drag-region");
  });

  it("opens a content context menu only when the content slot is set", async () => {
    const user = userEvent.setup();
    render(
      <AppShell
        title="GenCore"
        sidebar={<aside>Rail</aside>}
        contentContextMenu={
          <ContextMenuContent>
            <ContextMenuItem>Copy</ContextMenuItem>
          </ContextMenuContent>
        }
      >
        Workbench
      </AppShell>,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByRole("complementary") });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.pointer({ keys: "[MouseRight]", target: screen.getByRole("main") });
    expect(await screen.findByRole("menuitem", { name: "Copy" })).toBeInTheDocument();
  });
```

Create `packages/ui-kit/tests/composites/statusbar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Statusbar } from "../../src/composites/statusbar";

describe("Statusbar", () => {
  it("prevents the native context menu", () => {
    render(<Statusbar />);
    const bar = screen.getByRole("contentinfo");
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    bar.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gencore/ui-kit test tests/composites/app-shell.test.tsx tests/composites/statusbar.test.tsx`

Expected: FAIL — slots do not exist; native menu is not prevented.

- [ ] **Step 3: Write minimal implementation**

Add to `AppShellProps`:

```ts
  titlebarContextMenu?: React.ReactNode;
  contentContextMenu?: React.ReactNode;
```

In `app-shell.component.tsx`, import `ContextMenu` and `ContextMenuTrigger`. Destructure `titlebarContextMenu`, `contentContextMenu`, and `onContextMenu` from props. Helper (same file is fine; do not add a new module):

```tsx
function withContextMenu(trigger: React.ReactElement, menu: React.ReactNode) {
  if (menu == null) {
    return trigger;
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{trigger}</ContextMenuTrigger>
      {menu}
    </ContextMenu>
  );
}
```

Wrap the existing `<Titlebar ... />` and each `<ContentArea ...>` with `withContextMenu`. Do not wrap `sidebar` or `Statusbar`.

On the shell root, spread `...props` first, then set `onContextMenu` so it cannot be overwritten:

```tsx
onContextMenu={(event) => {
  event.preventDefault();
  onContextMenu?.(event);
}}
```

Statusbar: destructure `onContextMenu` from its props and compose the same preventDefault on the `<footer>`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @gencore/ui-kit test` and `pnpm --filter @gencore/ui-kit typecheck`

Expected: all existing AppShell tests plus the new ones PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-kit/src/composites/app-shell/app-shell.types.ts packages/ui-kit/src/composites/app-shell/app-shell.component.tsx packages/ui-kit/src/composites/statusbar/statusbar.component.tsx packages/ui-kit/tests/composites/app-shell.test.tsx packages/ui-kit/tests/composites/statusbar.test.tsx
git commit -m "feat(ui-kit): add AppShell context-menu slots and suppress native menus"
```

---

### Task 4: Terminal titlebar and content menus

**Files:**
- Create: `apps/terminal/tests/unit/context-menu.clipboard.test.ts`
- Create: `apps/terminal/tests/unit/context-menu.titlebar.test.tsx`
- Create: `apps/terminal/tests/unit/context-menu.content.test.tsx`
- Create: `apps/terminal/src/modules/context-menu/context-menu.clipboard.ts`
- Create: `apps/terminal/src/modules/context-menu/context-menu.titlebar.tsx`
- Create: `apps/terminal/src/modules/context-menu/context-menu.content.tsx`
- Modify: `apps/terminal/src/modules/app/app.component.tsx`

**Interfaces:**
- Consumes: `ContextMenuContent`, `ContextMenuItem`, `ContextMenuSeparator`, `ContextMenuShortcut` from `@gencore/ui-kit`. `closeWindow`, `minimizeWindow`, `toggleMaximizeWindow` from `../ipc/ipc.window`. `WindowControlHandlers` shape: `{ onClose?: () => void; onMinimize?: () => void; onToggleMaximize?: () => void }`.
- Produces:
  - `hasTextSelection(): boolean` — true when `window.getSelection()?.toString()` is non-empty.
  - `copySelection(): boolean` — `document.execCommand("copy")`.
  - `cutSelection(): boolean` — `document.execCommand("cut")`.
  - `selectAllContent(): boolean` — `document.execCommand("selectAll")`.
  - `canReadClipboard(): Promise<boolean>` — `navigator.clipboard.readText()` succeeds; false on throw or missing API.
  - `pasteText(): Promise<boolean>` — read clipboard text then `document.execCommand("insertText", false, text)`; false on failure or empty text.
  - `TitlebarContextMenu(props: WindowControlHandlers)` — items Minimize, Maximize, Close (destructive). Calls `onMinimize`, `onToggleMaximize`, `onClose` on select. Renders `ContextMenuContent` only (no Root).
  - `ContentContextMenu()` — items Cut, Copy, Paste, Select All with shortcuts `Ctrl+X`, `Ctrl+C`, `Ctrl+V`, `Ctrl+A`. Cut/Copy `disabled` when `!hasTextSelection()` at open. Paste `disabled` when `canReadClipboard()` is false (check in `useEffect` on mount). Renders `ContextMenuContent` only.
  - `App` passes `titlebarContextMenu={<TitlebarContextMenu onClose={closeWindow} onMinimize={minimizeWindow} onToggleMaximize={toggleMaximizeWindow} />}` and `contentContextMenu={<ContentContextMenu />}`.

- [ ] **Step 1: Write the failing tests**

`apps/terminal/tests/unit/context-menu.clipboard.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canReadClipboard,
  copySelection,
  cutSelection,
  hasTextSelection,
  pasteText,
  selectAllContent,
} from "../../src/modules/context-menu/context-menu.clipboard";

describe("context-menu.clipboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.getSelection()?.removeAllRanges();
  });

  it("reports an empty selection as no text selection", () => {
    expect(hasTextSelection()).toBe(false);
  });

  it("reports a non-empty selection", () => {
    const selection = window.getSelection();
    const range = document.createRange();
    const node = document.createTextNode("hello");
    document.body.appendChild(node);
    range.selectNodeContents(node);
    selection?.removeAllRanges();
    selection?.addRange(range);
    expect(hasTextSelection()).toBe(true);
    node.remove();
  });

  it("copy, cut, and selectAll call execCommand", () => {
    const exec = vi.spyOn(document, "execCommand").mockReturnValue(true);
    expect(copySelection()).toBe(true);
    expect(cutSelection()).toBe(true);
    expect(selectAllContent()).toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(exec).toHaveBeenCalledWith("cut");
    expect(exec).toHaveBeenCalledWith("selectAll");
    exec.mockRestore();
  });

  it("canReadClipboard is false when readText throws", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.reject(new Error("denied"))) },
    });
    expect(await canReadClipboard()).toBe(false);
  });

  it("pasteText inserts clipboard text and returns false when empty", async () => {
    const exec = vi.spyOn(document, "execCommand").mockReturnValue(true);
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve("abc")) },
    });
    expect(await pasteText()).toBe(true);
    expect(exec).toHaveBeenCalledWith("insertText", false, "abc");

    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve("")) },
    });
    expect(await pasteText()).toBe(false);
    exec.mockRestore();
  });
});
```

`apps/terminal/tests/unit/context-menu.titlebar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContextMenu, ContextMenuTrigger } from "@gencore/ui-kit";
import { TitlebarContextMenu } from "../../src/modules/context-menu/context-menu.titlebar";

describe("TitlebarContextMenu", () => {
  it("lists Minimize, Maximize, and destructive Close and calls the handlers", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onMinimize = vi.fn();
    const onToggleMaximize = vi.fn();

    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <span>Bar</span>
        </ContextMenuTrigger>
        <TitlebarContextMenu
          onClose={onClose}
          onMinimize={onMinimize}
          onToggleMaximize={onToggleMaximize}
        />
      </ContextMenu>,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Bar") });
    await user.click(await screen.findByRole("menuitem", { name: "Minimize" }));
    expect(onMinimize).toHaveBeenCalledTimes(1);

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Bar") });
    await user.click(await screen.findByRole("menuitem", { name: "Maximize" }));
    expect(onToggleMaximize).toHaveBeenCalledTimes(1);

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Bar") });
    const close = await screen.findByRole("menuitem", { name: "Close" });
    expect(close).toHaveAttribute("data-variant", "destructive");
    await user.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

`apps/terminal/tests/unit/context-menu.content.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContextMenu, ContextMenuTrigger } from "@gencore/ui-kit";
import { ContentContextMenu } from "../../src/modules/context-menu/context-menu.content";

describe("ContentContextMenu", () => {
  it("lists Cut, Copy, Paste, and Select All with shortcuts", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn(() => Promise.resolve("x")) },
    });

    render(
      <ContextMenu>
        <ContextMenuTrigger>
          <span>Pane</span>
        </ContextMenuTrigger>
        <ContentContextMenu />
      </ContextMenu>,
    );

    await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Pane") });
    expect(await screen.findByRole("menuitem", { name: /Cut/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Copy/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Paste/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Select All/ })).toBeInTheDocument();
    expect(screen.getByText("Ctrl+X")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+C")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+V")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+A")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gencore/terminal test tests/unit/context-menu.clipboard.test.ts tests/unit/context-menu.titlebar.test.tsx tests/unit/context-menu.content.test.tsx`

Expected: FAIL because the module files do not exist.

- [ ] **Step 3: Write minimal implementation**

`context-menu.clipboard.ts` — implement the six functions from Interfaces. Catch clipboard errors and return `false`. Do not import Tauri.

`context-menu.titlebar.tsx`:

```tsx
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@gencore/ui-kit";
import type { WindowControlHandlers } from "@gencore/ui-kit";
```

If `WindowControlHandlers` is not exported from the kit barrel, define a local props type with `onClose?`, `onMinimize?`, `onToggleMaximize?` instead of importing it. Do not add a kit export just for this.

Items: Minimize → `onMinimize?.()`, Maximize → `onToggleMaximize?.()`, separator, Close (`variant="destructive"`) → `onClose?.()`.

`context-menu.content.tsx` — on mount, `void canReadClipboard().then(setCanPaste)`. `hasSelection = hasTextSelection()` at render. Wire `onSelect` to `cutSelection`, `copySelection`, `() => { void pasteText(); }`, `selectAllContent`. Disabled flags as specified. Shortcuts exactly `Ctrl+X` / `Ctrl+C` / `Ctrl+V` / `Ctrl+A`.

In `app.component.tsx`, import the two menus and pass the slots. Do not change title copy, density, sidebar, or IPC.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @gencore/terminal test` and `pnpm --filter @gencore/terminal typecheck`

Expected: new tests PASS; existing app tests still PASS (heading + titlebar still show `Tauri Terminal Template`; version still in titlebar not statusbar).

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/src/modules/context-menu apps/terminal/tests/unit/context-menu.clipboard.test.ts apps/terminal/tests/unit/context-menu.titlebar.test.tsx apps/terminal/tests/unit/context-menu.content.test.tsx apps/terminal/src/modules/app/app.component.tsx
git commit -m "feat(terminal): add titlebar and content context menus"
```

---

### Task 5: Changeset and verify

**Files:**
- Create: `.changeset/shell-context-menus.md`

**Interfaces:**
- Consumes: Tasks 1–4 complete.
- Produces: a minor changeset for `@gencore/ui-kit` only. No explorer files. No app changeset.

- [ ] **Step 1: Write the changeset**

Create `.changeset/shell-context-menus.md`:

```md
---
"@gencore/ui-kit": minor
---

feat: add ContextMenu primitive and AppShell context-menu slots
```

- [ ] **Step 2: Verify**

Run:

```bash
pnpm --filter @gencore/ui-kit test
pnpm --filter @gencore/ui-kit typecheck
pnpm --filter @gencore/ui-kit lint
pnpm --filter @gencore/terminal test
pnpm --filter @gencore/terminal typecheck
pnpm --filter @gencore/terminal lint
```

Expected: all pass, output pristine.

- [ ] **Step 3: Commit**

```bash
git add .changeset/shell-context-menus.md
git commit -m "chore(ui-kit): changeset for ContextMenu and AppShell slots"
```
