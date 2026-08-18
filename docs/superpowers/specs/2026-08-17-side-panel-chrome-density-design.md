# Side-panel chrome density

Date: 2026-08-17
Status: approved
Packages: `@gencore/ui-kit`, `@gencore/terminal`

## Problem

The Files toolbar actions and the Files / Assistant / Settings tabs read larger than the rest of the Terminal compact chrome. The four actions use `icon-sm` (28×28) and fill the 28px FILES row. The bottom tab strip is 32px, taller than the 28px titlebar and the 24px statusbar.

## Goals

- Keep the FILES header row at 28px (`h-7`). Do not shrink the row, only the four action controls inside it.
- New File, New Folder, Refresh, and Collapse All become 20×20 with 12px Lucide glyphs.
- The bottom tab strip becomes 24px (`h-6`), matching the statusbar.
- Files / Assistant / Settings glyphs become 12px. Tabs stay full-width; only height and glyph size change.
- Keep tooltips, `aria-label`s, the 2px selected-tab indicator, ghost styling, and keyboard tablist behavior.

## Non-goals

Titlebar height, statusbar height, tree row height, FILES label typography, Explorer app, new tab actions, replacing Lucide with custom SVGs.

## Approach

Add a reusable `icon-xs` size to the ui-kit `Button`. Terminal uses it on the four FILES actions and shortens the side-panel tablist. No new primitives, density tokens, or IPC.

## Units

### Button `icon-xs` (ui-kit)

- **Does:** 20×20 icon button. CVA size `icon-xs` is `size-5 p-0 [&_svg:not([class*='size-'])]:size-3` so a child SVG without its own `size-*` class is 12px.
- **Use:** Compact chrome icon actions. Terminal FILES toolbar is the first consumer.
- **Depends on:** Existing `buttonVariants` CVA. `ButtonSize` stays inferred from variants.

### File-tree toolbar (terminal)

- **Does:** Same four ghost actions, now `size="icon-xs"`. Lucide children keep no `size-*` class so they pick up the 12px default. Refresh spin class stays (`animate-spin` only).
- **Use:** Files tab header.
- **Depends on:** `@gencore/ui-kit` Button + Tooltip. Row remains `h-7`.

### Side-panel tablist (terminal)

- **Does:** Tab strip `h-6` (24px). Each tab still `variant="ghost"` with `h-full w-auto flex-1 rounded-none`. Lucide icons `size-3`.
- **Use:** Files / Assistant / Settings switcher.
- **Depends on:** Existing Button + Tooltip. No `icon-xs` here — tabs are stretched, not 20×20 squares.

## Data flow

Unchanged. Size-only CSS. No IPC, layout state, or tab-selection changes.

## Error handling

None. Disabled New File / New Folder behavior is unchanged.

## Testing

- ui-kit: `icon-xs` applies `size-5` (extend the existing `icon-sm` test).
- Terminal file-tree: toolbar row still `h-7`; the four labeled buttons still render.
- Terminal side-panel: tablist still exposes Files / Assistant / Settings; strip uses `h-6`.

## Release

Patch changeset for `@gencore/ui-kit` (`icon-xs` Button size). Terminal is private; no app changeset unless the ui-kit bump requires the usual internal dependency patch.

## Decisions

| Item | Choice |
| --- | --- |
| FILES row height | 28px, unchanged |
| FILES action hit target | 20×20 (`icon-xs`) |
| FILES / tab glyphs | 12px (`size-3`) |
| Bottom tab strip | 24px (`h-6`), match statusbar |
| Tab hit area | Full-width third of the panel × 24px |
| Selected tab | Existing 2px top `primary` bar |
| Scope | ui-kit Button + Terminal side panel only |
