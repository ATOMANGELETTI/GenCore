---
name: add-ui-primitive
description: Adds a new shadcn/Radix-based UI primitive to @gencore/ui-kit with Nord tokens, CVA variants, and tests. Use when the user asks to add, wrap, or expose a new component (button, dialog, tooltip, etc.) in the shared ui-kit package.
---

# Add UI primitive

Use this when adding a new primitive component to `@gencore/ui-kit`.

## Steps

1. Check if `radix-ui` already exports the underlying primitive
   (`import { X } from "radix-ui"`). If not, confirm with the user before pulling in a
   non-Radix dependency.
2. Create the module folder: `packages/ui-kit/src/modules/{component}/`.
   - `{component}.component.tsx` — the exported component, wrapping the Radix primitive.
   - `{component}.variants.ts` — `cva(...)` definition for style variants.
   - `{component}.types.ts` — prop types, `VariantProps<typeof variants>`.
3. Colors: use only Nord hex tokens (`nord0`–`nord15`) already defined in the ui-kit
   theme — never introduce new arbitrary hex values.
4. Chrome style: flat, 1px borders, no shadows/gradients, matching existing primitives.
5. Export the component from the package's public entry point (barrel `index.ts` —
   re-export only, no logic).
6. Add tests under `packages/ui-kit/tests/{component}/` (not colocated) covering:
   render, variant prop application, and any interaction behavior.
7. Run `pnpm --filter @gencore/ui-kit typecheck`, `test`, and `lint` before finishing.

## Constraints

- No raw HTML controls when a Radix/ui-kit primitive already covers the use case.
- Bundled Terminess Nerd Font only; do not add remote fonts or extra `@font-face` families (CSP `font-src` stays `'self'`).
- Follow the `modular-naming` and UI-kit conventions in the root `AGENTS.md` for file layout and styling.
