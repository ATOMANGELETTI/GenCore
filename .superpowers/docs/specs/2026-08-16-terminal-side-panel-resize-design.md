# Terminal side-panel drag resize

Date: 2026-08-16
Status: approved
Package: `@gencore/terminal` (app-only)

## Problem

The terminal left side panel is a fixed 240px (`w-60`) column. Users need to grab the seam where the panel meets the content area and drag to change its width.

## Goals

- Drag the panel|content seam to resize the left column.
- Default width 240px. Min 160px. Max 50% of the parent (`app-shell-body`), or `window.innerWidth / 2` when the parent has no layout width.
- Keyboard: ArrowLeft/ArrowRight by 10px; Home → min; End → max.
- Double-click the handle → reset to 240px.
- Re-clamp when the parent/window shrinks below the current width.
- Session-only. Accessible separator. Flat Nord chrome.

## Non-goals

- Persist width. Collapse/hide. Explorer. AppShell resize API. New npm deps. Window-drag region changes.

## Approach

Terminal-only pointer-capture handle on `SidePanel`. Pure clamp helpers in `side-panel.resize.ts`. No `@gencore/ui-kit` changes.

## Units

### side-panel.resize.ts

- **Does:** Width constants and clamp/max math.
- **Use:** `SidePanel` and unit tests.
- **Produces:** `DEFAULT_SIDE_PANEL_WIDTH` (240), `MIN_SIDE_PANEL_WIDTH` (160), `SIDE_PANEL_WIDTH_STEP` (10), `maxSidePanelWidth(containerWidth)`, `clampSidePanelWidth(width, containerWidth)`.

### SidePanel

- **Does:** Tabbed rail plus a seam handle that owns width state.
- **Change:** Replace `w-60` with `style={{ width }}` + `relative shrink-0`. Overlay an 8px handle (`data-slot="side-panel-resize"`) centered on the existing `border-r`.

## Testing

- `apps/terminal/tests/unit/side-panel.resize.test.ts` — clamp/max.
- `apps/terminal/tests/unit/side-panel.test.tsx` — default 240, separator a11y, keyboard, existing tabs.

## Constraints

- Latest stable only; no new dependencies.
- Nord tokens only; flat 1px chrome.
- Tests only under `apps/terminal/tests/`.
- Work in place on `main`. Stage only side-panel files.
- No git commit unless the user asks.
- Do not edit ui-kit or other in-flight SDD files.
