# `@gencore/ui-kit`

Shared design system. Apps consume it; they do not fork chrome.

- Official Nord hex only (`nord0`–`nord15`). Default theme is Polar Night (dark). Light theme is Snow Storm. Frost is primary/ring/selected text (`nord8` dark, `nord10` light selected text); Aurora is destructive/caution/warning/success/info (`nord11`–`nord15`)
- Flat macOS chrome: solid planes, 1px separators, compact controls, Aurora traffic lights (`#BF616A` / `#EBCB8B` / `#A3BE8C`)
- Bundled Terminess Nerd Font; no remote fonts; CSP `font-src` stays `'self'`
- **Never import `@tauri-apps/*` or call IPC.** Titlebar actions are callbacks the app wires up
- Version chip is an optional `onVersionClick` callback; the kit never opens URLs
- Primitives from `radix-ui` (unified package) + CVA. Do not add raw HTML controls when a primitive exists
- Modular files: `{module}.component.tsx`, `{module}.variants.ts`, `{module}.types.ts`
- Tests only in `packages/ui-kit/tests/`
- New primitives: follow the `add-ui-primitive` skill
