# Gilded version chip: outline and text only

Date: 2026-08-20
Status: approved
Packages: `@gencore/ui-kit`

## Problem

The interactive titlebar version chip fills with a Nord gold gradient on hover and focus (`hover:text-nord-polar-0` on a solid aurora-12/13/snow-6 slab). That reads as a gold badge, not as gilded type and outline.

## Goals

- Idle stays the outline Badge: `border-border`, transparent fill, muted text.
- Hover and `:focus-visible` keep the existing `gild-sheen` animation, but paint it only on the version glyphs and the 1px outline.
- The chip interior stays `--titlebar` so it reads hollow, not a gold fill.
- Keyboard focus keeps the existing frost ring (`focus-visible:ring-2 focus-visible:ring-ring/60`).
- `prefers-reduced-motion`: static `nord-aurora-13` text and border, transparent fill, no animation.
- Polar Night and Snow Storm use the same treatment.
- Click still calls `onVersionClick`. The static chip (no callback) is unchanged.

## Non-goals

Snow Storm contrast tweak. Idle gold. App source edits. Traffic lights. Theme token remaps. New hex outside nord0–nord15. Extra DOM around the version button.

## Approach

Rewrite `titlebarVersionVariants` hover/focus on the existing `<button>` (Badge `asChild`). Stack three backgrounds:

1. Gold sheen gradient clipped to `text`.
2. `linear-gradient(var(--titlebar), var(--titlebar))` clipped to `padding-box` so the border-box layer cannot fill the chip.
3. The same gold sheen clipped to `border-box`.

Hover/focus also set `color` and `-webkit-text-fill-color` to transparent, `border-color` to transparent, `background-origin: border-box`, and `background-size` `220% 100%` on the two sheen layers / `100% 100%` on the titlebar layer. Keep `overflow-hidden` and the existing `@keyframes gild-sheen` in `globals.css`.

## Units

### Titlebar version variants (ui-kit)

- **Does:** Declares hover, focus-visible, and reduced-motion classes for the interactive version chip.
- **Use:** `Titlebar` when `version` and `onVersionClick` are both set.
- **Depends on:** Nord aurora-12/13, snow-6, `--titlebar`, `--animate-gild-sheen`. No new tokens.

### Titlebar composite (ui-kit)

- **Does:** Unchanged structure. Interactive chip is still `Badge asChild` wrapping a `<button>`.
- **Use:** Both apps via `AppShell` / `Titlebar`.
- **Depends on:** `titlebarVersionVariants`.

## Data flow

Unchanged. Apps pass `onVersionClick`; the kit does not open URLs.

## Error handling

None. Missing `--titlebar` would only happen if theme CSS is not loaded; Polar Night and Snow Storm both define it.

## Testing

`packages/ui-kit/tests/composites/titlebar.test.tsx`: interactive chip keeps `cursor-pointer`, `hover:animate-gild-sheen`, and `motion-reduce:hover:animate-none`. Assert hollow/outline-sheen classes (`hover:text-transparent` or `-webkit-text-fill-color`, stacked `background-clip`). Do not assert `hover:text-nord-polar-0`. Static chip and click tests stay as they are.

## Release

Patch changeset for `@gencore/ui-kit`. Apps are private; no app changeset.

## Decisions

- Gold sheen on hover/focus only; idle stays muted outline.
- Sheen on both text and outline (not text-only).
- Hollow fill is `--titlebar`, not CSS `transparent` (transparent padding-box would let the border-box gradient fill the chip).
- Same Nord gold in both themes.
- No extra wrapper or pseudo-element.
