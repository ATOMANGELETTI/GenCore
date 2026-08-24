# Terminal Background Transparency and Edge-to-Edge Layout Design

**Date:** 2026-08-23
**Status:** Approved
**Topic:** Terminal Viewport Transparency, Seamless Edge-to-Edge Layout, and Internal Text Padding

## 1. Context & Problem Statement

In the GenCore Terminal app (`@gencore/terminal`), an ambient particle effect engine was introduced behind the terminal viewport (`<TerminalBackgroundEffect />` in `TerminalView`). However, the terminal pane appeared with an opaque black/dark rectangle covering the particles, with particles only visible around the 12px outer container margin (`p-3`).

### Root Causes
1. **Missing `allowTransparency: true` on xterm instance:**
   `@xterm/xterm` requires `allowTransparency: true` in `ITerminalOptions` passed to `new Terminal(...)` before `terminal.open(el)`. Without this flag, xterm's internal rendering layer fills an opaque background over the terminal canvas regardless of the alpha channel in `theme.background`.
2. **Outer Margin Gap (`p-3`) in `TerminalHostPane`:**
   `TerminalHostPane` wrapped the terminal mount node in `<div className="min-h-0 flex-1 p-3">`, creating an inset border around the terminal box rather than allowing the terminal to seamlessly fill the entire content area edge-to-edge.

---

## 2. Requirements & Goals

1. **Full Viewport Transparency Support:**
   - Initialize `new Terminal(...)` with `allowTransparency: true`.
   - When a background effect is active (`particles`, `molecules`, `orbs`), apply a high-visibility translucent Nord veil:
     - **Polar Night:** `rgba(46, 52, 64, 0.50)`
     - **Snow Storm:** `rgba(236, 239, 244, 0.55)`
   - When background effect is `"none"`, render solid `#2E3440` (Polar Night) or `#ECEFF4` (Snow Storm).

2. **Edge-to-Edge Layout with Clean Internal Text Padding:**
   - Remove outer `p-3` margin from `TerminalHostPane` wrapper so the host pane fills 100% of the viewport area without any border or letterboxing.
   - Apply standard `p-2` (8px) internal padding directly on the xterm mount container (`nodeRef`), giving terminal text comfortable breathing room while maintaining edge-to-edge background coverage.

3. **Compatibility & Performance:**
   - Fit addon (`FitAddon.fit()`) correctly measures the padded container dimensions.
   - Zero regression in copy/paste, serialization, session restoration, and keyboard shortcuts.
   - 100% compliance with strict Nord color system and security CSP rules.

---

## 3. Architecture & Changes

### A. Terminal Initialization (`terminal.xterm.ts`)
- In `createXterm(el, theme, effect)`:
  - Add `allowTransparency: true` to `new Terminal({ ... })`.

### B. Theme Background Definition (`terminal.theme.ts`)
- Update `nordXtermTheme(theme, effect)`:
  - `effect !== "none"`:
    - Dark mode (`polar-night`): `"rgba(46, 52, 64, 0.50)"`
    - Light mode (`snow-storm`): `"rgba(236, 239, 244, 0.55)"`
  - `effect === "none"`:
    - Dark mode: `nord["polar-0"]` (`#2e3440`)
    - Light mode: `nord["snow-6"]` (`#eceff4`)

### C. Terminal Host Pane Layout (`terminal.component.tsx`)
- In `TerminalHostPane`:
  - Change `<div className="min-h-0 flex-1 p-3"><div ref={nodeRef} className="h-full w-full overflow-hidden" /></div>`
  - To: `<div className="relative min-h-0 flex-1 overflow-hidden"><div ref={nodeRef} className="h-full w-full overflow-hidden p-2" /></div>`.

---

## 4. Testing Strategy

1. **Unit Tests:**
   - `terminal.theme.test.ts`: Verify `rgba(46, 52, 64, 0.50)` and `rgba(236, 239, 244, 0.55)` translucent veil.
   - `terminal.xterm.test.ts`: Verify `Terminal` mock receives `allowTransparency: true`.
2. **Typecheck & Lint:**
   - Run `pnpm --filter @gencore/terminal typecheck` and `pnpm --filter @gencore/terminal lint`.
3. **Workspace Full Verification:**
   - Run `pnpm turbo run lint typecheck test`.
