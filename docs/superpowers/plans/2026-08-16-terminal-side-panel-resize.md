# Terminal Side-Panel Drag Resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The terminal left side panel can be resized by dragging the seam where it meets the content area.

**Architecture:** Terminal-only. Pure clamp helpers plus a pointer-capture ARIA separator on `SidePanel`. AppShell and Explorer stay unchanged.

**Tech Stack:** React 19.2, Vitest, Testing Library. No new dependencies.

## Global Constraints

- Official Nord hex only. Flat macOS chrome: 1px separators, no drop shadows/gradients.
- Default width **240**. Min width **160**. Step **10**. Max is **50%** of `containerWidth` when `containerWidth > 0`, otherwise `Math.floor(window.innerWidth / 2)`, never below min.
- Handle: `role="separator"`, `aria-orientation="vertical"`, `aria-label="Resize side panel"`, `tabIndex={0}`, `data-slot="side-panel-resize"`.
- Session-only. No `localStorage`. No collapse-to-zero. No new npm packages.
- Tests live only under `apps/terminal/tests/`. No colocated `*.test.tsx`.
- Do not edit `@gencore/ui-kit`, Explorer, AppShell, titlebar, or context-menu files.
- Working tree is dirty with unrelated SDD. Stage **only** the files listed in the task. Never `git add -A`.
- **Do not commit.** The user has not asked for a commit.
- Work in place on `main` (running `tauri:dev`). Do not create a worktree or switch branches.

---

## File map

- Create: `apps/terminal/src/modules/side-panel/side-panel.resize.ts`
- Create: `apps/terminal/tests/unit/side-panel.resize.test.ts`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`
- Modify: `apps/terminal/tests/unit/side-panel.test.tsx`

---

### Task 1: Clamp helpers

**Files:**
- Create: `apps/terminal/tests/unit/side-panel.resize.test.ts`
- Create: `apps/terminal/src/modules/side-panel/side-panel.resize.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `DEFAULT_SIDE_PANEL_WIDTH: 240`
  - `MIN_SIDE_PANEL_WIDTH: 160`
  - `SIDE_PANEL_WIDTH_STEP: 10`
  - `maxSidePanelWidth(containerWidth: number): number`
  - `clampSidePanelWidth(width: number, containerWidth: number): number`

- [ ] **Step 1: Write the failing tests**

Create `apps/terminal/tests/unit/side-panel.resize.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  clampSidePanelWidth,
  DEFAULT_SIDE_PANEL_WIDTH,
  maxSidePanelWidth,
  MIN_SIDE_PANEL_WIDTH,
  SIDE_PANEL_WIDTH_STEP,
} from "../../src/modules/side-panel/side-panel.resize";

describe("side-panel resize math", () => {
  it("exports the locked width constants", () => {
    expect(DEFAULT_SIDE_PANEL_WIDTH).toBe(240);
    expect(MIN_SIDE_PANEL_WIDTH).toBe(160);
    expect(SIDE_PANEL_WIDTH_STEP).toBe(10);
  });

  it("uses half the container as the max when that is above the min", () => {
    expect(maxSidePanelWidth(800)).toBe(400);
  });

  it("never returns a max below the min width", () => {
    expect(maxSidePanelWidth(200)).toBe(MIN_SIDE_PANEL_WIDTH);
  });

  it("falls back to half of window.innerWidth when the container has no width", () => {
    const previous = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
    expect(maxSidePanelWidth(0)).toBe(500);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: previous });
  });

  it("clamps below-min widths up to the min", () => {
    expect(clampSidePanelWidth(100, 800)).toBe(MIN_SIDE_PANEL_WIDTH);
  });

  it("clamps above-max widths down to half the container", () => {
    expect(clampSidePanelWidth(500, 800)).toBe(400);
  });

  it("leaves an in-range width unchanged", () => {
    expect(clampSidePanelWidth(DEFAULT_SIDE_PANEL_WIDTH, 800)).toBe(240);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/side-panel.resize.test.ts`

Expected: FAIL because `side-panel.resize.ts` does not exist.

- [ ] **Step 3: Write the minimal implementation**

Create `apps/terminal/src/modules/side-panel/side-panel.resize.ts`:

```ts
export const DEFAULT_SIDE_PANEL_WIDTH = 240;
export const MIN_SIDE_PANEL_WIDTH = 160;
export const SIDE_PANEL_WIDTH_STEP = 10;

export function maxSidePanelWidth(containerWidth: number): number {
  const half =
    containerWidth > 0 ? Math.floor(containerWidth / 2) : Math.floor(window.innerWidth / 2);
  return Math.max(MIN_SIDE_PANEL_WIDTH, half);
}

export function clampSidePanelWidth(width: number, containerWidth: number): number {
  const max = maxSidePanelWidth(containerWidth);
  return Math.min(max, Math.max(MIN_SIDE_PANEL_WIDTH, width));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/side-panel.resize.test.ts`

Expected: PASS.

- [ ] **Step 5: Do not commit**

Leave the files unstaged. Do not run `git commit`.

---

### Task 2: Handle + resize behavior

**Files:**
- Modify: `apps/terminal/tests/unit/side-panel.test.tsx`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`

**Interfaces:**
- Consumes: `DEFAULT_SIDE_PANEL_WIDTH`, `MIN_SIDE_PANEL_WIDTH`, `SIDE_PANEL_WIDTH_STEP`, `clampSidePanelWidth`, `maxSidePanelWidth` from `./side-panel.resize`.
- Produces: `SidePanel` complementary root with inline `width` (default 240). A child handle with `data-slot="side-panel-resize"`, `role="separator"`, `aria-orientation="vertical"`, `aria-label="Resize side panel"`, `tabIndex={0}`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`. Keyboard and double-click as specified. Pointer capture on drag. `ResizeObserver` on the parent re-clamps.

- [ ] **Step 1: Write the failing tests**

Append these cases to `apps/terminal/tests/unit/side-panel.test.tsx` without changing the existing tab tests. Import `userEvent` is already present.

```tsx
  it("defaults the complementary root to 240px wide", () => {
    render(<SidePanel />);

    expect(screen.getByRole("complementary")).toHaveStyle({ width: "240px" });
  });

  it("exposes a vertical resize separator on the panel seam", () => {
    render(<SidePanel />);

    const handle = screen.getByRole("separator", { name: "Resize side panel" });
    expect(handle).toHaveAttribute("data-slot", "side-panel-resize");
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-valuenow", "240");
    expect(handle).toHaveAttribute("aria-valuemin", "160");
  });

  it("grows the panel 10px on ArrowRight and shrinks 10px on ArrowLeft", async () => {
    const user = userEvent.setup();
    render(<SidePanel />);

    const handle = screen.getByRole("separator", { name: "Resize side panel" });
    handle.focus();
    await user.keyboard("{ArrowRight}");

    expect(handle).toHaveAttribute("aria-valuenow", "250");
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "250px" });

    await user.keyboard("{ArrowLeft}");
    expect(handle).toHaveAttribute("aria-valuenow", "240");
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "240px" });
  });

  it("jumps to min on Home and max on End", async () => {
    const user = userEvent.setup();
    render(<SidePanel />);

    const handle = screen.getByRole("separator", { name: "Resize side panel" });
    handle.focus();
    await user.keyboard("{Home}");

    expect(handle).toHaveAttribute("aria-valuenow", "160");
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "160px" });

    await user.keyboard("{End}");
    const max = handle.getAttribute("aria-valuemax");
    expect(handle).toHaveAttribute("aria-valuenow", max);
    expect(screen.getByRole("complementary")).toHaveStyle({ width: `${max}px` });
  });
```

- [ ] **Step 2: Run the new tests and confirm they fail**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/side-panel.test.tsx`

Expected: existing tab tests still pass; the four new tests fail (no handle / no inline width).

- [ ] **Step 3: Implement the handle**

In `side-panel.component.tsx`:

- Import the resize helpers.
- `const [width, setWidth] = React.useState(DEFAULT_SIDE_PANEL_WIDTH)`.
- `const rootRef = React.useRef<HTMLElement | null>(null)`.
- `containerWidth` from `rootRef.current?.parentElement?.clientWidth ?? 0`.
- `ResizeObserver` on the parent (and `window` resize) that `setWidth((current) => clampSidePanelWidth(current, parent.clientWidth))`.
- Aside: drop `w-60`, add `relative shrink-0`, `ref={rootRef}`, `style={{ width }}`. Keep `border-r border-border`.
- Handle as a `div` (not ui-kit `Separator`):
  - classes: `absolute top-0 right-0 z-10 h-full w-2 translate-x-1/2 cursor-col-resize touch-none`
  - `role="separator"` `aria-orientation="vertical"` `aria-label="Resize side panel"` `tabIndex={0}` `data-slot="side-panel-resize"`
  - `aria-valuemin={MIN_SIDE_PANEL_WIDTH}` `aria-valuemax={maxSidePanelWidth(containerWidth)}` `aria-valuenow={width}`
  - `onPointerDown`: `setPointerCapture`, store start X and start width
  - `onPointerMove` while captured: `setWidth(clampSidePanelWidth(startWidth + (clientX - startX), containerWidth))`
  - `onPointerUp` / `onLostPointerCapture`: end drag
  - `onKeyDown`: ArrowRight `+ STEP`, ArrowLeft `- STEP`, Home `MIN`, End `max`, preventDefault
  - `onDoubleClick`: `setWidth(DEFAULT_SIDE_PANEL_WIDTH)`
- Pointer geometry is covered by Task 1 math; do not add brittle jsdom pointer tests.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/terminal exec vitest run tests/unit/side-panel.test.tsx tests/unit/side-panel.resize.test.ts`

Expected: all pass.

- [ ] **Step 5: Do not commit**

Leave the files unstaged. Do not run `git commit`.

---

### Task 3: Verify

**Files:** none (read-only verification)

- [ ] **Step 1: Run terminal test, typecheck, and lint**

```sh
pnpm --filter @gencore/terminal test
pnpm --filter @gencore/terminal typecheck
pnpm --filter @gencore/terminal lint
```

Expected: all pass. Do not edit ui-kit or traffic-light files. Do not commit.
