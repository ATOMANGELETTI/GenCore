# Task 3 / Wave 3 — `@gencore/ui-kit` — Report

**Status:** DONE_WITH_CONCERNS
**Commits:** none (working tree left dirty as instructed)

## Verification

| Gate                                        | Result                     |
| ------------------------------------------- | -------------------------- |
| `pnpm install`                              | pass                       |
| `pnpm --filter @gencore/ui-kit typecheck`   | pass (`tsc --noEmit`)      |
| `pnpm --filter @gencore/ui-kit test`        | pass — 6 files, 29 tests   |
| `pnpm exec biome check packages/ui-kit`     | pass — 58 files, 0 errors  |
| `pnpm turbo run typecheck test lint --filter=@gencore/ui-kit` | 3/3 tasks successful |
| Tailwind 4.3.3 compile of `globals.css`     | pass (see "Visual review") |

## What was built

`packages/ui-kit` — private, `type: module`, `workspace:*` ready, exports map
copied verbatim from the brief.

```
src/
  tokens/     tokens.nord.ts  tokens.colors.ts  tokens.spacing.ts
              tokens.typography.ts  tokens.index.ts
  lib/        cn.ts
  styles/     globals.css  theme.polar-night.css  theme.snow-storm.css
  primitives/ button/ separator/ tooltip/ badge/ dropdown-menu/
  composites/ app-shell/ titlebar/ statusbar/ content-area/
  providers/  theme.provider.tsx  theme.types.ts
  index.ts
tests/        mirrors src/ — no colocated tests
README.md     usage + entry points + design rules
```

Every primitive/composite directory follows `{name}.component.tsx`,
`{name}.types.ts`, `{name}.variants.ts` with an `index.ts` barrel.

**Dependencies** (all latest stable at time of writing): `react`/`react-dom`
19.2.8, `radix-ui` 1.6.7 (unified package only — verified zero
`@radix-ui/react-*` imports), `class-variance-authority` 0.7.1, `clsx` 2.1.1,
`tailwind-merge` 3.6.0, `lucide-react` 1.31.0, `tailwindcss` 4.3.3. Dev:
`@gencore/config-typescript`, vitest 4.1.10, jsdom 30.0.1,
`@testing-library/react` 16.3.2 + `jest-dom` 7.0.1 + `user-event` 14.6.4,
`@types/react` 19.2.18, `@types/react-dom` 19.2.4, `@types/node`, typescript 7.0.2.

**No Tauri.** Verified by grep — the kit exposes `onClose` / `onMinimize` /
`onToggleMaximize` callbacks and the `data-tauri-drag-region` attribute, and the
host app owns the Tauri dependency.

## Nord accuracy self-review

All 16 official hex values are declared verbatim in both theme files and were
confirmed present in the compiled Tailwind output. A test asserts every
`--nord-*` declaration matches `tokens.nord.ts`, and a second test scans both
stylesheets for any colour literal outside the palette (none found).

Semantic mapping follows the brief exactly: background/card/popover =
nord0/nord1/nord1; foreground = nord4; muted-foreground = nord3; border/input/ring
= nord2/nord3/nord8; primary = nord8 with nord0 text; destructive/warning/success/info
= nord11/nord12/nord14/nord15; titlebar/statusbar = nord1 over nord0. Light theme
uses nord6/nord5 backgrounds with nord0/nord3 text and identical Frost/Aurora roles.

**Visual review by compilation.** I compiled `globals.css` with the real Tailwind
4.3.3 CLI and asserted the generated stylesheet contains every utility the
components rely on — the density-driven chrome heights
(`h-[var(--gencore-titlebar-height,32px)]` and the
`[--gencore-titlebar-height:28px]` compact override), all four traffic-light
colours, the semantic surface/state utilities, `backdrop-blur-[10px]`,
`tabular-nums`, the Radix transform-origin variable, and the group-hover glyph
reveal. Temporary output was deleted.

Flat rules honoured: no gradients, no shadow utilities anywhere, separators are
1px hairlines, and the only blur is a 10px backdrop on the titlebar and
statusbar. Spacing stays on the 4/8/12/16 grid, radii are 6–8px, and the font
stack is system-only with no remote font.

## Concerns

1. **Nord's muted foreground is not legible in dark mode.** The brief specifies
   `muted-foreground: nord3`, which is `#4C566A` on `#2E3440` — a measured
   contrast of 1.69:1, and 1.36:1 on the nord1 chrome. This is authentic Nord
   (nord3 is Nord's inactive/comment tone) but unreadable as body text. I kept
   the token exactly as specified, and changed only the component-level styling
   for text that must stay readable: the dark statusbar foreground is nord4
   (7.45:1, muted by size and weight instead of hue), and the dropdown label,
   dropdown shortcut, and outline badge use `text-foreground/70–80`. This works
   in both themes. **If you want strict token-literal styling instead, revert
   these four spots** — but the statusbar will be effectively invisible.

2. **`warning` and `info` are unusual Nord roles.** Per the brief, `warning` maps
   to nord12 (Aurora orange) rather than the conventional nord13 (yellow), and
   `info` maps to nord15 (Aurora purple) rather than a Frost blue. Implemented as
   specified; flagging in case the mapping was a transcription slip.

3. **Aurora red does not reach AA as a fill.** `destructive` (#BF616A) tops out at
   3.55:1 with Snow Storm text and 3.05:1 with Polar Night text. I chose the
   better of the two. This is inherent to the palette, not fixable without
   leaving Nord.

4. **Barrel files are `index.ts`, not `{name}.index.ts`.** The brief's file layout
   said `{name}.index.ts` but the verbatim exports map resolves
   `./primitives/*` to `./src/primitives/*/index.ts`. I followed the exports map
   since it was called out as verbatim.

5. **`react`/`react-dom` are `dependencies`, not `peerDependencies`.** This
   follows the brief's wording. Versions are pinned exactly and pnpm resolves a
   single instance from the store, so no duplicate-React hazard in Wave 4 — but
   peer deps would be the more conventional choice for a shared UI package.

## Changes outside `packages/ui-kit`

- **`biome.json`** — enabled `css.parser.tailwindDirectives`. Biome 2.5.8 fails to
  parse `@source` and `@theme` without it, so `globals.css` could not be linted
  or formatted. This was the only root change.

- **Pre-existing, untouched:** `pnpm exec biome check .` reports 3 formatting
  errors in Tauri-generated `crates/*/permissions/schemas/schema.json` files from
  Wave 1–2. These are out of scope ("do not modify crates") and are regenerated
  by the Tauri build, so they will reappear if formatted.

## Notes for Wave 4

- Import `@gencore/ui-kit/styles/globals.css` once at the app entry. It pulls in
  Tailwind, both themes, and an `@source "../**/*.{ts,tsx}"` directive so the
  app's Tailwind scans the kit's sources (workspace packages live under
  `node_modules`, which Tailwind skips by default).
- `AppShell` forwards `density` to CSS variables that `Titlebar` and `Statusbar`
  read, so window chrome scales from one prop.
- `ThemeProvider` accepts `tokens?: Partial<ThemeTokens>` and writes them as
  inline CSS custom properties, letting each app retint the kit without forking CSS.
