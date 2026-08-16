# Task 3 / Wave 3 — `@gencore/ui-kit`

Work from: `c:\Storage\Development\Workspace\Cursor\GenCore`

Wave 1–2 done. Do not modify crates. Create `packages/ui-kit` only.

## Goal

A modular, reusable, per-app-customizable design system: **modern flat UI, macOS-inspired chrome**, official **Nord** Polar Night / Snow Storm / Frost / Aurora. Default theme = Polar Night dark.

## Package

- Name: `@gencore/ui-kit`, private, `workspace:*` ready
- Depends on: `react@19.2.8`, `react-dom@19.2.8`, `radix-ui@1.6.7`, `class-variance-authority` latest stable, `clsx`, `tailwind-merge`, `lucide-react` latest stable
- Dev: `@gencore/config-typescript`, vitest, testing-library, jsdom, `@types/react`
- Tailwind via `@gencore/config-vite` or local vitest vite config using Tailwind 4.3.3
- tsconfig extends `@gencore/config-typescript` react-library
- Add `lint`/`test`/`typecheck` scripts so turbo can run them

Exports (verbatim):

```json
{
  ".": "./src/index.ts",
  "./styles/globals.css": "./src/styles/globals.css",
  "./styles/theme.polar-night.css": "./src/styles/theme.polar-night.css",
  "./styles/theme.snow-storm.css": "./src/styles/theme.snow-storm.css",
  "./primitives/*": "./src/primitives/*/index.ts",
  "./composites/*": "./src/composites/*/index.ts",
  "./tokens": "./src/tokens/tokens.index.ts"
}
```

Init shadcn non-interactive if useful: `pnpm dlx shadcn@latest init -d --base radix` inside the package, then **replace zinc tokens with Nord**. Or hand-author New York–style primitives on unified `radix-ui` imports (`import { Slot } from "radix-ui"` / named primitives). No `@radix-ui/react-*` individual packages.

## File layout (modular naming)

```
packages/ui-kit/src/
  tokens/tokens.nord.ts
  tokens/tokens.colors.ts
  tokens/tokens.spacing.ts
  tokens/tokens.typography.ts
  tokens/tokens.index.ts
  lib/cn.ts
  styles/globals.css
  styles/theme.polar-night.css
  styles/theme.snow-storm.css
  primitives/button/   separator/ tooltip/ badge/ dropdown-menu/
    {name}.component.tsx {name}.types.ts {name}.variants.ts {name}.index.ts
  composites/app-shell/ titlebar/ statusbar/ content-area/
  providers/theme.provider.tsx providers/theme.types.ts
  index.ts
packages/ui-kit/tests/   # mirrors src; no colocated tests
```

## Nord tokens (exact hex, no improvisation)

Polar Night: `#2E3440` `#3B4252` `#434C5E` `#4C566A` → `--nord-polar-0`…`3`
Snow Storm: `#D8DEE9` `#E5E9F0` `#ECEFF4` → `--nord-snow-4`…`6`
Frost: `#8FBCBB` `#88C0D0` `#81A1C1` `#5E81AC` → `--nord-frost-7`…`10`
Aurora: `#BF616A` `#D08770` `#EBCB8B` `#A3BE8C` `#B48EAD` → `--nord-aurora-11`…`15`

Dark (Polar Night) semantic:
- background/card/popover: nord0 / nord1 / nord1
- foreground/muted: nord4 / nord3
- border/input/ring: nord2 / nord3 / nord8
- primary: nord8, primary-foreground: nord0
- destructive/warning/success/info: nord11 / nord12 / nord14 / nord15
- titlebar/statusbar: nord1 over nord0 content

Light (Snow Storm): backgrounds nord6/nord5, text nord0/nord3, same Frost/Aurora roles.

Spacing 4/8/12/16. Radius 6–8px. System font stack only: `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui`. No remote fonts. Tabular nums for versions.

**Flat rules:** no panel gradients, no shadow stacks, no glassmorphism soup. Hairline 1px separators. Optional 8–12px backdrop-filter on titlebar/statusbar only.

## Composites (must exist)

`AppShell` slots: `title`, `version`, `titlebarStart`, `titlebarEnd`, `statusbarStart`, `statusbarEnd`, `children`. CVA `density`: `compact` | `comfortable`.

`Titlebar` (~28–32px): leading **traffic lights** (12px circles, Aurora `#BF616A` / `#EBCB8B` / `#A3BE8C`, inactive `nord3`, hover glyphs), drag region class `data-tauri-drag-region`, title, trailing version badge. **Do not import `@tauri-apps/api`.** Accept `onClose`, `onMinimize`, `onToggleMaximize` callbacks so the kit stays testable.

`Statusbar` (24–28px): muted type, slots + default “ready” + version.

`ContentArea`: flex-1, centered children.

`ThemeProvider`: `tokens?: Partial<ThemeTokens>`, class `dark` / theme class on wrapper.

## Tests (`packages/ui-kit/tests/`)

- `cn()` merge
- AppShell has titlebar / content / statusbar roles
- Titlebar renders title + version
- Traffic lights call the three callbacks
- Nord CSS variables present in polar-night theme file

## Constraints

- Latest stables. No second palette. No Storybook.
- Do not create apps, crates, .github, .husky, .vscode.
- Do not git commit.
- After `pnpm install`, run ui-kit `typecheck`, `test`, and root `biome check` on the package.

## Report

`.superpowers/sdd/task-3-report.md`
