# Traffic light hover morph

Date: 2026-08-16
Status: approved
Package: `@gencore/ui-kit`

## Problem

Titlebar traffic lights are 12px Aurora circles. On cluster hover they reveal × / − / + glyphs. The desired chrome is shape-only: each light morphs from a circle to a rounded square when that light is hovered, then returns to a circle when the pointer leaves. Glyphs go away.

## Goals

- Rest: 12px circle, existing Aurora fill (red / yellow / green) or inactive grey when disabled.
- Hover of one light: that light only animates to a same-size square with a 2px corner radius. The other two stay circles.
- Pointer leave: that light animates back to a circle.
- Keyboard: `:focus-visible` uses the same rounded-square shape.
- Disabled lights do not morph.
- No glyphs, no scale, no hover color/brightness change, no cluster-wide morph.
- `aria-label`s stay (`Close window`, `Minimize window`, `Toggle maximize window`).
- Apps keep existing `Titlebar` / `AppShell` callbacks. No public API change.

## Non-goals

- Changing light size, gap, or Aurora colors.
- Windows/Linux caption-button layout.
- A motion library or JavaScript hover state.
- A new global radius token.

## Approach

CSS-only `border-radius` transition on each traffic-light button. Rest uses `rounded-[6px]` (a circle-sized length on a 12px box) so the radius can interpolate. Hover is a one-off `rounded-[2px]`. Do not use `rounded-full` (Tailwind 4 emits `infinity` px, which does not animate to 2px).

## Units

### TrafficLights

- **Does:** Renders the three window-control buttons and wires click handlers.
- **Use:** Internal to `Titlebar`; also exported for tests and rare direct use.
- **Depends on:** `trafficLightVariants`, `WindowControlHandlers`.
- **Change:** Remove `trafficLightGlyph`, the inner glyph `<span>`, and `group/traffic` (that class exists only for the cluster glyph reveal). Buttons stay empty aside from `aria-label`.

### trafficLightVariants

- **Does:** CVA classes for size, shape, fill, focus ring, and the hover morph.
- **Use:** Applied on each light button.
- **Depends on:** existing traffic color tokens (`bg-traffic-close` / `minimize` / `maximize` / `inactive`).
- **Change:**
  - Keep `size-3`, Aurora fills, `outline-none`, `focus-visible:ring-2 focus-visible:ring-ring/60`.
  - Rest shape: `rounded-[6px]` (circle on a 12px box; interpolates).
  - Drop glyph typography (`text-[8px]`, `leading-none`, `font-bold`, `text-traffic-glyph`).
  - Add `enabled:hover:rounded-[2px]` and `enabled:focus-visible:rounded-[2px]`.
  - Transition `border-radius` over 150ms (`transition-[border-radius] duration-150`).
  - `motion-reduce:transition-none` for an instant swap when the user prefers reduced motion.

### Theme tokens

- **Does:** Map Nord Aurora to semantic traffic colors.
- **Change:** Remove unused `--traffic-glyph` and `--color-traffic-glyph` from Polar Night, Snow Storm, and `globals.css`. Leave the four fill tokens unchanged.

## Data flow

No new state. Pointer and keyboard use native CSS:

```
enabled + hover or focus-visible → border-radius 2px
otherwise                        → border-radius full (circle)
```

Click handlers stay as today: `onClose` / `onMinimize` / `onToggleMaximize` from the host app. Missing handler → `disabled` + `bg-traffic-inactive` + no morph.

## Error handling

Not applicable. This is presentational CSS on existing buttons. Disabled lights remain unclickable and circular.

## Testing

Update `packages/ui-kit/tests/composites/titlebar.test.tsx`:

- Keep: title/version, drag region, callback clicks, Aurora classes, disabled+inactive, `showTrafficLights={false}`.
- Add: buttons contain no × / − / + text.
- Add: each enabled light’s class list includes `rounded-[6px]` and `enabled:hover:rounded-[2px]`.

Do not assert computed animation frames in jsdom.

## Release

Patch changeset for `@gencore/ui-kit`. Visual behavior change only; no public prop or type change.

## Files

- `packages/ui-kit/src/composites/titlebar/titlebar.component.tsx`
- `packages/ui-kit/src/composites/titlebar/titlebar.variants.ts`
- `packages/ui-kit/src/styles/theme.polar-night.css`
- `packages/ui-kit/src/styles/theme.snow-storm.css`
- `packages/ui-kit/src/styles/globals.css`
- `packages/ui-kit/tests/composites/titlebar.test.tsx`
- a new patch changeset under `.changeset/`

No app, capability, or Tauri changes.
