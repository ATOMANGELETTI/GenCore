# Nord official theme roles

Date: 2026-08-20
Status: approved
Packages: `@gencore/ui-kit`, `@gencore/terminal`
Reference: [Nord Colors and Palettes](https://www.nordtheme.com/docs/colors-and-palettes)

## Problem

Polar Night and Snow Storm already exist as dark and light themes, but a few semantic roles drift from official Nord usage:

- `--accent-foreground` is Snow Storm / Polar Night text, not Frost, so hover and selection do not read as ice accents.
- `--warning` is nord12 (orange). Official Nord uses nord13 (yellow) for warnings and nord12 for rare dangerous/advanced UI.
- There is no `--caution` role for nord12.
- Selected tree rows paint `bg-accent` only; selected Terminal side-panel tabs use `text-primary` (frost-8 on both themes), which washes out on Snow Storm nord4 fills.

## Goals

- Keep Polar Night as the dark theme and Snow Storm as the light theme (recommended bright-to-dark: nord6 base, nord5 chrome, nord4 elevated).
- Keep accent *fills* on the ambiance palettes: Polar Night nord2, Snow Storm nord4 (official selection/highlight colors).
- Use Frost for primary, focus ring, and hover/selected *text*: nord8 on Polar Night, nord10 on Snow Storm (readable on nord4).
- Map Aurora to official UI meanings: nord11 destructive, nord12 caution, nord13 warning, nord14 success, nord15 info.
- Expose caution as CSS/Tailwind tokens and a Badge `caution` variant only.
- Selected tree rows and selected Terminal side-panel tabs use `text-accent-foreground`. Keep the 2px `before:bg-primary` tab indicator.

## Non-goals

Frost vs Aurora accent picker. Settings appearance UI. Theme persistence. Changing `defaultTheme` off Polar Night. Frost fills on `--accent`. Mapping `--secondary` to nord9. Remapping dark `--muted-foreground` to nord5. Button or menu `caution` variants. Explorer source edits (it inherits kit CSS). Traffic-light colors. App density tokens in `app.theme.css`. New hex outside nord0–nord15.

## Approach

One dark/light pair. Remap semantic CSS variables in the two theme stylesheets and keep `tokens.colors.ts` in lockstep. Register `--color-caution` in `globals.css`. Badge and Tree consume the new roles. Terminal selected tabs switch from `text-primary` to `text-accent-foreground`. Ghost/outline buttons and menu focus already use `text-accent-foreground` and pick Frost up from CSS.

## Units

### Theme tokens (ui-kit)

- **Does:** Declares official Nord hex (`nord0`–`nord15`) and semantic roles. Polar Night at `:root`. Snow Storm under `.theme-snow-storm` / `.light`.
- **Use:** Every kit primitive and both apps via `ThemeProvider` classes.
- **Depends on:** Official Nord palette only. No app-level color tokens.

Polar Night: `--accent-foreground` → `--nord-frost-8`. `--caution` → `--nord-aurora-12`. `--warning` → `--nord-aurora-13`. Surfaces unchanged (nord0 background, nord1 chrome, nord2 accent fill).

Snow Storm: `--accent-foreground` → `--nord-frost-10`. Same Aurora roles. Surfaces unchanged (nord6 background, nord5 chrome, nord4 accent fill).

`--primary` and `--ring` stay `--nord-frost-8` in both themes. `--caution-foreground` is `--nord-polar-0`. Traffic lights stay nord11 / nord13 / nord14.

### Badge caution (ui-kit)

- **Does:** CVA variant `caution` → `bg-caution text-caution-foreground`. `BadgeVariant` stays inferred from variants.
- **Use:** Status chips for rare/advanced (nord12) as distinct from warning (nord13).
- **Depends on:** `--caution` tokens from the theme files and `--color-caution` in `globals.css`.

### Tree selected text (ui-kit)

- **Does:** Selected row classes `bg-accent text-accent-foreground`.
- **Use:** File tree and any other Tree.
- **Depends on:** `--accent` fill (ambiance) and `--accent-foreground` (Frost).

### Terminal selected tabs

- **Does:** Selected Files/Assistant/Settings tab uses `text-accent-foreground` instead of `text-primary`. Hover on selected stays `text-accent-foreground`. `before:bg-primary` underline unchanged.
- **Use:** Side-panel tablist.
- **Depends on:** Theme tokens. No new IPC.

## Data flow

Unchanged. `ThemeProvider` sets `theme-polar-night dark` or `theme-snow-storm light`. CSS variables cascade. No persistence.

## Error handling

None. Invalid `ThemeName` is already a TypeScript union. Missing `--caution` would only happen if `globals.css` is not updated with the theme files; they ship together.

## Testing

- Stylesheet tests: Polar Night `--accent-foreground` frost-8, `--caution` aurora-12, `--warning` aurora-13. Snow Storm `--accent-foreground` frost-10 plus the same Aurora roles. Accent *fills* stay polar-2 / snow-4.
- Badge: `caution` and `warning` class names.
- Tree: selected row has `text-accent-foreground`.
- Side-panel: default Files tab has `text-accent-foreground`, not `text-primary`; `before:bg-primary` remains.

## Release

Patch changeset for `@gencore/ui-kit` (warning remap, new caution token, Badge `caution`). Terminal is private; no app changeset.

## Decisions

- Ambiance: Polar Night dark, Snow Storm light (bright-to-dark).
- Accent fills: nord2 / nord4, not Frost slabs.
- Selected/hover text: frost-8 dark, frost-10 light.
- Aurora: destructive 11, caution 12, warning 13, success 14, info 15.
- Caution consumers this pass: Badge only.
- Apps: Polar Night default. No picker.
