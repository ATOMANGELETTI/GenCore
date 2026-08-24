# Terminal Background Transparency and Edge-to-Edge Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable xterm transparency and full edge-to-edge layout with 8px internal text padding so background particle effects render cleanly behind terminal sessions without an opaque overlay or outer border.

**Architecture:** Initialize `@xterm/xterm` with `allowTransparency: true` in `createXterm`, update `nordXtermTheme` to apply a 50% opacity translucent Nord veil when an effect is active, and update `TerminalHostPane` to eliminate outer margin gaps while adding `p-2` text padding on the xterm mount container.

**Tech Stack:** React 19, TypeScript, xterm.js 6, Nord Design System, Tailwind CSS 4, Vitest.

**Spec:** `.superpowers/docs/specs/2026-08-23-terminal-transparency-layout-design.md`

## Global Constraints

- Official Nord hex colors only (`nord['polar-0']` `#2e3440` to `nord['aurora-15']` `#b48ead`).
- Modular naming: `src/modules/{module}/{module}.{role}.{ext}`. Tests only under `tests/unit/`.
- No remote fonts or scripts. Strict CSP compatibility.
- Zero CPU footprint when effect is set to `"none"`.

---

### Task 1: Xterm Transparency and 50% Opacity Nord Theme

**Files:**
- Modify: `apps/terminal/src/modules/terminal/terminal.theme.ts`
- Modify: `apps/terminal/src/modules/terminal/terminal.xterm.ts`
- Test: `apps/terminal/tests/unit/terminal.theme.test.ts`
- Test: `apps/terminal/tests/unit/terminal.xterm.test.ts`

**Interfaces:**
- Consumes: `BackgroundEffectType`, `ThemeName`.
- Produces: `nordXtermTheme(theme: ThemeName, effect?: BackgroundEffectType): ITheme`, `createXterm(el: HTMLElement, theme: ThemeName, effect?: BackgroundEffectType): XtermHost`.

- [ ] **Step 1: Write failing unit test for xterm transparency and 50% veil**

In `apps/terminal/tests/unit/terminal.theme.test.ts`:
Update test expectations for `particles`, `molecules`, and `orbs` to expect `rgba(46, 52, 64, 0.50)` for Polar Night and `rgba(236, 239, 244, 0.55)` for Snow Storm.

In `apps/terminal/tests/unit/terminal.xterm.test.ts`:
Add test asserting `createXterm` instantiates `Terminal` with `{ allowTransparency: true }`.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @gencore/terminal test terminal.theme.test.ts terminal.xterm.test.ts`
Expected: FAIL on opacity mismatch and missing transparency assertion.

- [ ] **Step 3: Update `terminal.theme.ts` and `terminal.xterm.ts`**

In `apps/terminal/src/modules/terminal/terminal.theme.ts`:
```ts
export function nordXtermTheme(theme: ThemeName, effect: BackgroundEffectType = "none"): ITheme {
  const semantic = resolveColors(theme === "snow-storm" ? snowStormColors : polarNightColors);

  let background: string;
  if (effect === "none") {
    background = theme === "snow-storm" ? nord["snow-6"] : nord["polar-0"];
  } else {
    background = theme === "snow-storm" ? "rgba(236, 239, 244, 0.55)" : "rgba(46, 52, 64, 0.50)";
  }

  const foreground = theme === "snow-storm" ? nord["polar-0"] : nord["snow-4"];

  return {
    background,
    foreground,
    cursor: nord["frost-8"],
    cursorAccent: background,
    selectionBackground: semantic.accent,
    selectionForeground: semantic.accentForeground,
    selectionInactiveBackground: semantic.accent,
    ...ansiTheme,
  };
}
```

In `apps/terminal/src/modules/terminal/terminal.xterm.ts`:
```ts
export function createXterm(
  el: HTMLElement,
  theme: ThemeName,
  effect: BackgroundEffectType = "none",
): XtermHost {
  const terminal = new Terminal({
    allowProposedApi: true,
    allowTransparency: true,
    fontFamily: '"Terminess Nerd Font Mono", monospace',
    fontSize: 13,
    lineHeight: 1.2,
    cursorBlink: true,
    cursorStyle: "bar",
    theme: nordXtermTheme(theme, effect),
    scrollback: 4096,
    rightClickSelectsWord: false,
  });
  // ...
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/terminal test terminal.theme.test.ts terminal.xterm.test.ts`
Expected: PASS.

---

### Task 2: Edge-to-Edge Terminal Viewport & Internal Text Padding

**Files:**
- Modify: `apps/terminal/src/modules/terminal/terminal.component.tsx`
- Test: `apps/terminal/tests/unit/terminal.component.test.tsx` (or `terminal.provider.test.tsx`)

**Interfaces:**
- Consumes: `<TerminalHostPane />` in `terminal.component.tsx`.
- Produces: Seamless full-bleed container layout with `p-2` text padding on `nodeRef`.

- [ ] **Step 1: Update `TerminalHostPane` layout**

In `apps/terminal/src/modules/terminal/terminal.component.tsx`:
Change:
```tsx
      <div className="min-h-0 flex-1 p-3">
        <div ref={nodeRef} className="h-full w-full overflow-hidden" />
      </div>
```
To:
```tsx
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={nodeRef} className="h-full w-full overflow-hidden p-2" />
      </div>
```

- [ ] **Step 2: Run all terminal unit tests**

Run: `pnpm --filter @gencore/terminal test`
Expected: PASS.

- [ ] **Step 3: Run typecheck and lint**

Run: `pnpm --filter @gencore/terminal typecheck`
Run: `pnpm --filter @gencore/terminal lint`
Expected: 0 errors, clean.

---

### Task 3: Full Workspace Verification

**Files:**
- None (system-wide validation)

- [ ] **Step 1: Run turbo test suite**

Run: `pnpm turbo run lint typecheck test`
Expected: All packages and apps pass cleanly.
