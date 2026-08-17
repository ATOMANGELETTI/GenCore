# File Tree Context Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Terminal-owned Files-tab context menu (Expand/Collapse, New File, New Folder, Refresh, Copy Path; blank area Refresh + Collapse All) using the existing ui-kit ContextMenu, and expand `C:\` by default.

**Architecture:** ui-kit Tree exposes `data-id` on rows. Terminal wraps the tree viewport in `ContextMenu` + `ContextMenuTrigger` (Tree does not forward a ref). `FileTreeContextMenu` owns items. The file-tree hook auto-expands `C:\` and accepts an optional create target. No new FS IPC.

**Tech Stack:** React 19.2, Vite 8, Tauri 2, `radix-ui` ContextMenu (already in ui-kit), Vitest, Testing Library, Changesets.

## Global Constraints

- Official Nord hex only (`nord0`–`nord15`). Menu chrome is the existing ui-kit ContextMenu CVA (`bg-popover`, `text-popover-foreground`, `border-border`, `bg-accent`). No ad-hoc hex, no box-shadow, no gradient, no extra enter/exit animation.
- Flat macOS chrome. Import primitives from `@gencore/ui-kit` / `radix-ui` (unified). Never `@radix-ui/react-*`. Never `@tauri-apps/*` inside `packages/ui-kit`. Never `window.__TAURI__`.
- Modular files: `{module}.{role}.{ext}`. Tests only under that unit’s `tests/`. No colocated `*.test.tsx`.
- No Sub/submenu. No shortcuts on tree menu items. No rename, delete, cut/copy files, Reveal in Explorer, toasts, or Tauri clipboard plugin. No new Isolation grants or capability identifiers.
- Exact menu copy: `Expand`, `Collapse`, `New File`, `New Folder`, `Refresh`, `Copy Path`, `Collapse All`.
- AppShell context-menu slots stay titlebar/content only. Do not wrap the whole SidePanel in an AppShell slot. Wrap only the Files tree viewport.
- Do not change Terminal template copy: `Tauri Terminal Template` plus version from `get_app_info`.
- Latest **stable** only. Do not add dependencies.
- Stage **only** the files listed in the task. Never `git add -A`. Work in place on `main` (running `tauri:dev`). Do not create a worktree or switch branches.
- Follow TDD: failing test first, watch it fail, then minimal implementation. Record RED/GREEN evidence in the report. Implementers use `superpowers:test-driven-development`.
- Conventional commit messages. Commit only the task files. Never add Cursor/AI attribution trailers (`Co-authored-by: Cursor`, `Made-with: Cursor`, or similar).
- Do not edit `apps/explorer`, Isolation hooks, `capabilities/main.json`, or `crates/gencore-plugin-fs`.
- Do not bump major versions. ui-kit changeset for Tree `data-id` is **patch**.
- PowerShell: use `;` not `&&`. Commits: `git commit -m @" ... "@`.

---

## File map

- Modify: `packages/ui-kit/src/primitives/tree/tree.component.tsx` — `data-id={row.id}` on each treeitem.
- Modify: `packages/ui-kit/tests/primitives/tree/tree.test.tsx` — assert `data-id`.
- Create: `.changeset/tree-row-data-id.md` — patch `@gencore/ui-kit`.
- Modify: `apps/terminal/src/modules/context-menu/context-menu.clipboard.ts` — add `copyText`.
- Modify: `apps/terminal/tests/unit/context-menu.clipboard.test.ts` — `copyText` cases.
- Create: `apps/terminal/src/modules/context-menu/context-menu.file-tree.tsx` — presentational menu.
- Create: `apps/terminal/tests/unit/context-menu.file-tree.test.tsx`.
- Modify: `apps/terminal/src/modules/file-tree/file-tree.hook.ts` — auto-expand `C:\`, `startCreate(kind, targetPath?)`, `refreshPath`.
- Modify: `apps/terminal/src/modules/file-tree/file-tree.component.tsx` — wrap + target resolve.
- Modify: `apps/terminal/tests/unit/file-tree.test.tsx` — default expand + menu integration.
- Modify: `apps/terminal/AGENTS.md` — one bullet for the Files context menu and default C: expand.

---

### Task 1: Tree row `data-id`

**Files:**
- Modify: `packages/ui-kit/src/primitives/tree/tree.component.tsx`
- Modify: `packages/ui-kit/tests/primitives/tree/tree.test.tsx`
- Create: `.changeset/tree-row-data-id.md`

**Interfaces:**
- Consumes: existing `TreeRow.id: string`.
- Produces: each `[data-slot="tree-row"]` also has `data-id={row.id}`.

- [ ] **Step 1: Write the failing assertion**

In `packages/ui-kit/tests/primitives/tree/tree.test.tsx`, inside `renders the two-row fixture with tree semantics`, after the `aria-expanded` assertions, add:

```ts
    expect(drive).toHaveAttribute("data-id", "C:\\");
    expect(file).toHaveAttribute("data-id", "C:\\readme.txt");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/ui-kit exec vitest run tests/primitives/tree/tree.test.tsx`

Expected: FAIL — `data-id` missing.

- [ ] **Step 3: Write minimal implementation**

On the treeitem `div` in `packages/ui-kit/src/primitives/tree/tree.component.tsx`, immediately after `data-slot="tree-row"`, add `data-id={row.id}`:

```tsx
            <div
              key={virtualRow.key}
              role="treeitem"
              data-slot="tree-row"
              data-id={row.id}
              aria-level={row.depth + 1}
```

Do not add ContextMenu to Tree. Do not add `forwardRef`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/ui-kit exec vitest run tests/primitives/tree/tree.test.tsx`

Expected: PASS.

- [ ] **Step 5: Add changeset**

Create `.changeset/tree-row-data-id.md`:

```md
---
"@gencore/ui-kit": patch
---

feat: expose Tree row ids as data-id for context menus
```

- [ ] **Step 6: Commit**

```powershell
git add packages/ui-kit/src/primitives/tree/tree.component.tsx packages/ui-kit/tests/primitives/tree/tree.test.tsx .changeset/tree-row-data-id.md
git commit -m @"
feat(ui-kit): expose Tree row ids for context menus
"@
```

---

### Task 2: `copyText` clipboard helper

**Files:**
- Modify: `apps/terminal/src/modules/context-menu/context-menu.clipboard.ts`
- Modify: `apps/terminal/tests/unit/context-menu.clipboard.test.ts`

**Interfaces:**
- Consumes: `navigator.clipboard.writeText`.
- Produces: `export async function copyText(text: string): Promise<boolean>` — `true` after a successful `writeText`; `false` if `writeText` is missing or throws.

- [ ] **Step 1: Write the failing tests**

Add to the import list in `apps/terminal/tests/unit/context-menu.clipboard.test.ts`: `copyText`.

Append:

```ts
  it("copyText writes the string and returns true", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    expect(await copyText("C:\\Windows")).toBe(true);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("C:\\Windows");
  });

  it("copyText returns false when writeText is missing", async () => {
    vi.stubGlobal("navigator", { clipboard: {} });
    expect(await copyText("C:\\Windows")).toBe(false);
  });

  it("copyText returns false when writeText throws", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn(() => Promise.reject(new Error("denied"))) },
    });
    expect(await copyText("C:\\Windows")).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/context-menu.clipboard.test.ts`

Expected: FAIL — `copyText` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `apps/terminal/src/modules/context-menu/context-menu.clipboard.ts`:

```ts
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) {
      return false;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

Do not add a Tauri clipboard plugin. Do not read the clipboard.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/context-menu.clipboard.test.ts`

Expected: PASS (including the new cases).

- [ ] **Step 5: Commit**

```powershell
git add apps/terminal/src/modules/context-menu/context-menu.clipboard.ts apps/terminal/tests/unit/context-menu.clipboard.test.ts
git commit -m @"
feat(terminal): add copyText helper for Copy Path
"@
```

---

### Task 3: Presentational `FileTreeContextMenu`

**Files:**
- Create: `apps/terminal/src/modules/context-menu/context-menu.file-tree.tsx`
- Create: `apps/terminal/tests/unit/context-menu.file-tree.test.tsx`

**Interfaces:**
- Consumes: ui-kit `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuSeparator`.
- Produces:

```ts
export type FileTreeMenuKind = "drive" | "dir" | "file" | "blank";

export interface FileTreeContextMenuProps {
  kind: FileTreeMenuKind;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onCopyPath: () => void;
  onCollapseAll: () => void;
}

export function FileTreeContextMenu(props: FileTreeContextMenuProps): React.ReactElement;
```

Item rules (exact labels):

- `blank`: `Refresh`, `Collapse All`. No New File/Folder, no Copy Path, no Expand/Collapse.
- `drive` or `dir`: `Expand` if `expanded` is false, else `Collapse`; then `New File`, `New Folder`, `Refresh`; separator; `Copy Path`.
- `file`: `New File`, `New Folder`, `Refresh`; separator; `Copy Path`. No Expand/Collapse.

- [ ] **Step 1: Write the failing tests**

Create `apps/terminal/tests/unit/context-menu.file-tree.test.tsx`:

```tsx
import { ContextMenu, ContextMenuTrigger } from "@gencore/ui-kit";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileTreeContextMenu } from "../../src/modules/context-menu/context-menu.file-tree";

function handlers() {
  return {
    onExpand: vi.fn(),
    onCollapse: vi.fn(),
    onNewFile: vi.fn(),
    onNewFolder: vi.fn(),
    onRefresh: vi.fn(),
    onCopyPath: vi.fn(),
    onCollapseAll: vi.fn(),
  };
}

async function openMenu(
  user: ReturnType<typeof userEvent.setup>,
  props: React.ComponentProps<typeof FileTreeContextMenu>,
) {
  render(
    <ContextMenu>
      <ContextMenuTrigger>
        <span>Tree</span>
      </ContextMenuTrigger>
      <FileTreeContextMenu {...props} />
    </ContextMenu>,
  );
  await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Tree") });
}

describe("FileTreeContextMenu", () => {
  it("shows Refresh and Collapse All on blank area", async () => {
    const user = userEvent.setup();
    const props = { kind: "blank" as const, expanded: false, ...handlers() };
    await openMenu(user, props);

    expect(await screen.findByRole("menuitem", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Collapse All" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "New File" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Copy Path" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Expand" })).not.toBeInTheDocument();
  });

  it("shows Collapse for an expanded folder and calls onNewFile", async () => {
    const user = userEvent.setup();
    const props = { kind: "dir" as const, expanded: true, ...handlers() };
    await openMenu(user, props);

    expect(await screen.findByRole("menuitem", { name: "Collapse" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Expand" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "New File" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "New Folder" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy Path" })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "New File" }));
    expect(props.onNewFile).toHaveBeenCalledTimes(1);
  });

  it("shows Expand for a collapsed drive", async () => {
    const user = userEvent.setup();
    await openMenu(user, { kind: "drive", expanded: false, ...handlers() });
    expect(await screen.findByRole("menuitem", { name: "Expand" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Collapse" })).not.toBeInTheDocument();
  });

  it("omits Expand/Collapse for a file", async () => {
    const user = userEvent.setup();
    await openMenu(user, { kind: "file", expanded: false, ...handlers() });
    expect(await screen.findByRole("menuitem", { name: "New File" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy Path" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Expand" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Collapse" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Collapse All" })).not.toBeInTheDocument();
  });
});
```

The test file needs `import type * as React from "react"` if `React.ComponentProps` is used, or inline the props type. Use `Parameters` instead if the import is noisy:

Replace the `openMenu` signature with:

```ts
import type { FileTreeContextMenuProps } from "../../src/modules/context-menu/context-menu.file-tree";

async function openMenu(
  user: ReturnType<typeof userEvent.setup>,
  props: FileTreeContextMenuProps,
) {
```

Export `FileTreeContextMenuProps` from the component file.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/context-menu.file-tree.test.tsx`

Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `apps/terminal/src/modules/context-menu/context-menu.file-tree.tsx`:

```tsx
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@gencore/ui-kit";

export type FileTreeMenuKind = "drive" | "dir" | "file" | "blank";

export interface FileTreeContextMenuProps {
  kind: FileTreeMenuKind;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onCopyPath: () => void;
  onCollapseAll: () => void;
}

export function FileTreeContextMenu({
  kind,
  expanded,
  onExpand,
  onCollapse,
  onNewFile,
  onNewFolder,
  onRefresh,
  onCopyPath,
  onCollapseAll,
}: FileTreeContextMenuProps) {
  if (kind === "blank") {
    return (
      <ContextMenuContent>
        <ContextMenuItem onSelect={onRefresh}>Refresh</ContextMenuItem>
        <ContextMenuItem onSelect={onCollapseAll}>Collapse All</ContextMenuItem>
      </ContextMenuContent>
    );
  }

  const expandable = kind === "drive" || kind === "dir";

  return (
    <ContextMenuContent>
      {expandable ? (
        <ContextMenuItem onSelect={expanded ? onCollapse : onExpand}>
          {expanded ? "Collapse" : "Expand"}
        </ContextMenuItem>
      ) : null}
      <ContextMenuItem onSelect={onNewFile}>New File</ContextMenuItem>
      <ContextMenuItem onSelect={onNewFolder}>New Folder</ContextMenuItem>
      <ContextMenuItem onSelect={onRefresh}>Refresh</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onCopyPath}>Copy Path</ContextMenuItem>
    </ContextMenuContent>
  );
}
```

No icons in the menu (titlebar/content menus have none). No shortcuts.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/context-menu.file-tree.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/terminal/src/modules/context-menu/context-menu.file-tree.tsx apps/terminal/tests/unit/context-menu.file-tree.test.tsx
git commit -m @"
feat(terminal): add Files-tab tree context menu items
"@
```

---

### Task 4: Auto-expand C: and hook helpers

**Files:**
- Modify: `apps/terminal/src/modules/file-tree/file-tree.hook.ts`
- Modify: `apps/terminal/tests/unit/file-tree.test.tsx`

**Interfaces:**
- Consumes: existing `listDrives`, `listDir`, `watchDir`, `startCreate` parent logic (`isExpandableKind` → child, else sibling via `parentWindowsPath`).
- Produces:
  - After successful `listDrives()`, if some drive has `path` matching `/^[Cc]:\\$/`, call existing `expand(path)` (list + watch). Other drives stay collapsed. Do not set `selectedId`.
  - `startCreate(kind: "file" | "dir", targetPath?: string)` — `targetPath ?? selectedId` is the create target. Same parent rules as today.
  - `refreshPath(path: string)` — if the node is `drive` or `dir` and expanded, `reloadDir(path)`; if collapsed, `expand(path)`; if file/symlink, use `parentWindowsPath(path)` then the same rule. Swallow errors.
  - Return `refreshPath` from `useFileTree`.
  - If C: is missing or expand throws, keep drives listed.

- [ ] **Step 1: Write the failing tests**

In `apps/terminal/tests/unit/file-tree.test.tsx`:

Replace `lists mocked children when C: is expanded` so it does **not** click C: (a click would collapse after default expand):

```ts
  it("lists mocked children when C: is expanded", async () => {
    await renderTree();

    expect(await screen.findByText("Windows")).toBeVisible();
    expect(screen.getByText(".hidden")).toBeVisible();
    expect(screen.getByText("readme.txt")).toBeVisible();
    expect(screen.queryByText("Windows")).toBeVisible();
    expect(listDir).toHaveBeenCalledWith("C:\\");
    expect(watchDir).toHaveBeenCalledWith("C:\\");
    const listOrder = listDir.mock.invocationCallOrder[0] ?? 0;
    const watchOrder = watchDir.mock.invocationCallOrder[0] ?? 0;
    expect(listOrder).toBeLessThan(watchOrder);
  });

  it("does not auto-expand D:", async () => {
    await renderTree();
    expect(await screen.findByText("Windows")).toBeVisible();
    expect(listDir).toHaveBeenCalledWith("C:\\");
    expect(listDir).not.toHaveBeenCalledWith("D:\\");
    expect(watchDir).not.toHaveBeenCalledWith("D:\\");
  });
```

Remove the `user.click` from `dims a hidden child with opacity-45` — wait for `.hidden` after mount.

Change `disables New File until a row is selected` so it does **not** click C: (that toggles collapse). After mount, C: is expanded but unselected. Select a **file**:

```ts
  it("disables New File until a row is selected", async () => {
    const { user } = await renderTree();

    expect(screen.getByRole("button", { name: "New File" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "New Folder" })).toBeDisabled();

    await user.click(await screen.findByRole("treeitem", { name: "readme.txt" }));

    expect(screen.getByRole("button", { name: "New File" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "New Folder" })).toBeEnabled();
  });
```

For tests that must have **C: selected and still expanded**, do not click the C: row. Focus the tree and press Enter (Tree `Enter` calls `onSelect` only):

```ts
    await screen.findByText("Windows");
    screen.getByRole("tree").focus();
    await user.keyboard("{Enter}");
```

Apply that pattern to:

- `creates a file as a child of the selected folder` — replace `await user.click(screen.getByRole("treeitem", { name: /^C:/ }));`
- `shows a failed createFile error on the draft input` — same
- `creates a file as a sibling of the selected file` — remove the C: click; `findByRole` readme.txt is enough
- `re-lists an expanded parent when a watch event fires` — remove the C: click; `findByText("Windows")` then fire the watch handler
- `hides children on collapse all while keeping drive roots` — remove the C: click; Windows is already visible

Keep `listDir.mock.calls.filter((call) => call[0] === "C:\\").length).toBeGreaterThanOrEqual(2)` in the create-child test (mount expand + reload after create).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/file-tree.test.tsx`

Expected: FAIL — `Windows` is not in the document on mount (C: still collapsed).

- [ ] **Step 3: Write minimal implementation**

In `apps/terminal/src/modules/file-tree/file-tree.hook.ts`:

1. After `listDrives()` succeeds, expand C: if present. Keep `cancelled` checks. Reuse `expand`:

```ts
    void listDrives()
      .then(async (drives) => {
        if (cancelled) {
          return;
        }
        setState((current) => applyDrives(current, drives));
        const cDrive = drives.find((drive) => /^[Cc]:\\$/.test(drive.path));
        if (!cDrive) {
          return;
        }
        try {
          await expand(cDrive.path);
        } catch {
          // C: stays visible and collapsed.
        }
      })
      .catch(() => undefined);
```

Add `expand` to the effect dependency array (it is already `useCallback` with `[]`).

2. Change `startCreate` to take an optional target:

```ts
  async function startCreate(kind: "file" | "dir", targetPath?: string) {
    const selectedId = targetPath ?? stateRef.current.selectedId;
    if (selectedId == null) {
      return;
    }
    // existing body using selectedId
```

3. Add `refreshPath` next to `refresh`, using existing `reloadDir`, `expand`, `parentWindowsPath`, `isExpandableKind`. Swallow errors with `.catch(() => undefined)` or try/catch.

```ts
  async function refreshPath(path: string) {
    const node = stateRef.current.nodes[path];
    if (!node) {
      return;
    }
    const target = isExpandableKind(node.kind) ? path : parentWindowsPath(path);
    const targetNode = stateRef.current.nodes[target];
    if (!targetNode || !isExpandableKind(targetNode.kind)) {
      return;
    }
    try {
      if (targetNode.expanded) {
        await reloadDir(target);
        return;
      }
      await expand(target);
    } catch {
      // Keep the last listing.
    }
  }
```

4. Return `refreshPath` from the hook.

Do not auto-select C:. Do not auto-expand D:.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/file-tree.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/terminal/src/modules/file-tree/file-tree.hook.ts apps/terminal/tests/unit/file-tree.test.tsx
git commit -m @"
feat(terminal): expand C: on Files tab load
"@
```

---

### Task 5: Wire the tree menu and integration tests

**Files:**
- Modify: `apps/terminal/src/modules/file-tree/file-tree.component.tsx`
- Modify: `apps/terminal/tests/unit/file-tree.test.tsx`
- Modify: `apps/terminal/AGENTS.md`

**Interfaces:**
- Consumes: Task 1 `data-id`, Task 2 `copyText`, Task 3 `FileTreeContextMenu`, Task 4 `startCreate` / `refreshPath` / auto-expand.
- Produces: FileTree viewport wrapped in ui-kit `ContextMenu` + `ContextMenuTrigger asChild` on the existing `min-h-0 flex-1 overflow-hidden` div (not on `Tree` — Tree does not forward a ref). `onContextMenu` resolves the target before Radix opens.

Target resolve (exact):

```ts
function resolveMenuTarget(
  event: React.MouseEvent,
  createParentPath: string | null,
): string | null {
  const row = (event.target as HTMLElement | null)?.closest?.("[data-slot='tree-row']");
  const id = row?.getAttribute("data-id");
  if (id === FILE_TREE_CREATE_ID) {
    return createParentPath;
  }
  return id ?? null;
}
```

- If target is a real node id: `onSelect(id)` and store it as `menuTargetId`.
- If create-draft: store `createParentPath` and `onSelect` that parent when non-null.
- If blank (`null`): `menuTargetId = null` (do not clear the tree selection).

`FileTreeMenuKind`: `drive` / `dir` from `node.kind`; `file` for `file` and `symlink`; `blank` when `menuTargetId` is null or the node is missing.

Handlers:

- Expand → `tree.onToggle(id)` only when expandable and collapsed (or always `onToggle` — it already toggles). Prefer calling `onToggle(menuTargetId)` for Expand and Collapse.
- New File → `void tree.startCreate("file", menuTargetId ?? undefined)`
- New Folder → `void tree.startCreate("dir", menuTargetId ?? undefined)`
- Refresh → blank: `void tree.refresh()`; else `void tree.refreshPath(menuTargetId)`
- Copy Path → `void copyText(node.path)` when a node is targeted
- Collapse All → `tree.collapseAll()`

Do not wrap the FILES toolbar in the context menu (toolbar stays outside the trigger).

- [ ] **Step 1: Write the failing integration tests**

Append to `apps/terminal/tests/unit/file-tree.test.tsx` (keep existing `renderTree` / mocks). Stub clipboard in the Copy Path test.

```ts
  it("opens a folder menu on right-click and creates a file in that folder", async () => {
    const { user } = await renderTree();
    await screen.findByText("Windows");

    await user.click(screen.getByRole("treeitem", { name: "readme.txt" }));
    await user.pointer({
      keys: "[MouseRight]",
      target: screen.getByRole("treeitem", { name: "Windows" }),
    });

    await user.click(await screen.findByRole("menuitem", { name: "New File" }));
    const input = screen.getByRole("textbox");
    await user.type(input, "from-menu.txt");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(createFile).toHaveBeenCalledWith("C:\\Windows\\from-menu.txt");
    });
  });

  it("shows Refresh and Collapse All when right-clicking the tree blank area", async () => {
    const { user } = await renderTree();
    await screen.findByText("Windows");

    await user.pointer({ keys: "[MouseRight]", target: screen.getByRole("tree") });

    expect(await screen.findByRole("menuitem", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Collapse All" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "New File" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Copy Path" })).not.toBeInTheDocument();
  });

  it("copies the Windows path from a file row menu", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { user } = await renderTree();

    await user.pointer({
      keys: "[MouseRight]",
      target: await screen.findByRole("treeitem", { name: "readme.txt" }),
    });
    await user.click(await screen.findByRole("menuitem", { name: "Copy Path" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("C:\\readme.txt");
    });
  });
```

Also add `afterEach` in this describe (or in the Copy Path test’s finally) to `vi.unstubAllGlobals()` if this file does not already.

If `createFile` path joining uses `C:\Windows\from-menu.txt` via `joinWindowsPath`, that is the expected string.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/file-tree.test.tsx`

Expected: FAIL — no menuitem on right-click.

- [ ] **Step 3: Write minimal implementation**

In `apps/terminal/src/modules/file-tree/file-tree.component.tsx`:

- Import `ContextMenu`, `ContextMenuTrigger` from `@gencore/ui-kit`.
- Import `FileTreeContextMenu` and `copyText`.
- `const [menuTargetId, setMenuTargetId] = React.useState<string | null>(null);`
- Wrap only the tree viewport div (the one with `className="min-h-0 flex-1 overflow-hidden"`):

```tsx
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="min-h-0 flex-1 overflow-hidden"
            onContextMenu={(event) => {
              const id = resolveMenuTarget(event, tree.create?.parentPath ?? null);
              setMenuTargetId(id);
              if (id) {
                tree.onSelect(id);
              }
            }}
          >
            <Tree
              rows={tree.rows}
              onSelect={tree.onSelect}
              onToggle={tree.onToggle}
              renderLeading={renderLeading}
              renderName={renderName}
              className="min-h-0 h-full flex-1"
              style={{ height: "100%" }}
            />
          </div>
        </ContextMenuTrigger>
        <FileTreeContextMenu
          kind={menuKindOf(menuTargetId ? tree.nodes[menuTargetId] : undefined)}
          expanded={Boolean(menuTargetId && tree.nodes[menuTargetId]?.expanded)}
          onExpand={() => {
            if (menuTargetId) {
              tree.onToggle(menuTargetId);
            }
          }}
          onCollapse={() => {
            if (menuTargetId) {
              tree.onToggle(menuTargetId);
            }
          }}
          onNewFile={() => {
            void tree.startCreate("file", menuTargetId ?? undefined);
          }}
          onNewFolder={() => {
            void tree.startCreate("dir", menuTargetId ?? undefined);
          }}
          onRefresh={() => {
            if (menuTargetId) {
              void tree.refreshPath(menuTargetId);
              return;
            }
            void tree.refresh();
          }}
          onCopyPath={() => {
            const path = menuTargetId ? tree.nodes[menuTargetId]?.path : undefined;
            if (path) {
              void copyText(path);
            }
          }}
          onCollapseAll={tree.collapseAll}
        />
      </ContextMenu>
```

Put `resolveMenuTarget` and `menuKindOf` in this file (not in ui-kit):

```ts
function menuKindOf(node: FileTreeNode | undefined): "drive" | "dir" | "file" | "blank" {
  if (!node) {
    return "blank";
  }
  if (node.kind === "drive") {
    return "drive";
  }
  if (node.kind === "dir") {
    return "dir";
  }
  return "file";
}
```

Keep the FILES toolbar **outside** the `ContextMenu`.

Update `apps/terminal/AGENTS.md` with one bullet:

```md
- Files tab right-click uses the ui-kit ContextMenu (Terminal-owned items: Expand/Collapse, New File, New Folder, Refresh, Copy Path; blank area Refresh + Collapse All). `C:\` expands on load. No new Isolation grants
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/file-tree.test.tsx tests/unit/context-menu.file-tree.test.tsx tests/unit/context-menu.clipboard.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/terminal/src/modules/file-tree/file-tree.component.tsx apps/terminal/tests/unit/file-tree.test.tsx apps/terminal/AGENTS.md
git commit -m @"
feat(terminal): add Files tree context menu
"@
```

---

## Self-review (controller)

1. **Spec coverage:** `data-id` → Task 1. Copy Path clipboard → Task 2. Item sets by kind → Task 3. Auto-expand C: / `startCreate` target / `refreshPath` → Task 4. Wrap + integration → Task 5. Blank vs row vs create-draft → Task 5. No Isolation/Explorer/`gencore-fs` edits — stated as constraints.
2. **Placeholders:** none.
3. **Types:** `FileTreeMenuKind`, `startCreate(kind, targetPath?)`, `refreshPath(path)`, `copyText(text)` used consistently.
