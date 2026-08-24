# Config Tab Top Menu & Category Subview Architecture

## Overview

Redesign the Terminal app's left side panel **Config** tab with an authentic Cursor-style top icon menu bar and category subviews. This replaces the single continuous scroll list with a clean, high-density toolbar featuring left-aligned category icons, an overflow/actions dropdown on the right, and dedicated, seamless subviews for each configuration domain.

## Goals & User Experience

- **Cursor-Style Aesthetic**: A compact 36px top toolbar with crisp stroke SVG icons (from `lucide-react`) and translucent rounded-square active pill highlights (`bg-accent text-accent-foreground` / Nord Frost accents).
- **Unified Seamless Background**: The settings body seamlessly shares the exact same dark Polar Night background as the menu (`bg-card` / `bg-background`), eliminating visual boxiness.
- **Dedicated Subviews**:
  1. **Appearance** (`Palette` icon): Theme palette selection (`Polar Night`, `Snow Storm`, `Match system`).
  2. **Background Effects** (`Sparkles` icon): Particle effect types (`Particles`, `Molecules`, `Orbs`, `Off`), Interaction physics (`Cursor Repulsion`, `Click Ripples & Repel`, `Ambient only`), Opacity slider with quick presets, and Speed slider.
  3. **Shell Prompt** (`Terminal` icon): Oh My Posh prompt styles (`GenCore`, `Bubbles`, `iTerm2`, `Wholespace`, `Wopian`, `Clean Detailed`, `Kali`).
  4. **AI Assistant** (`Bot` icon): Gemini API key management (Windows DPAPI protected save/replace/clear), Model selector (`gemini-3.7-flash`, etc.), and Terminal context line count input.
  5. **All Settings** (available via Dropdown): Continuous scroll view displaying all 4 categories sequentially.
- **Overflow & Action Dropdown (▾)**:
  - Down-arrow chevron button on the far right.
  - Dropdown menu powered by Radix / `@gencore/ui-kit` with items:
    - **All Settings** (switches to unified view)
    - **Appearance**, **Background Effects**, **Prompt Theme**, **Assistant** (direct jumps)
    - Separator
    - **Reset to Defaults** (resets settings for the active subview with confirmation)
- **Persistence & Keyboard Accessibility**:
  - Remembers the last active category in `localStorage` under `gencore:config:active-subview` (defaults to `"appearance"`).
  - WAI-ARIA compliant tablist: ArrowLeft, ArrowRight, Home, End navigation across category buttons, Enter/Space activation, Esc to dismiss dropdown.
  - Rich Nord tooltips on each toolbar icon button.

## Architecture & Modular Design

### Files Affected

1. **`apps/terminal/src/modules/config/config.types.ts`**:
   - Add `ConfigSubviewId` type: `"appearance" | "effects" | "prompt" | "assistant" | "all"`.
   - Update any associated interfaces if needed.

2. **`apps/terminal/src/modules/config/config.toolbar.tsx`** [NEW]:
   - Dedicated toolbar component hosting the category icon tablist, tooltips, active pill styling, and the dropdown menu.

3. **`apps/terminal/src/modules/config/subviews/`** [NEW subview components]:
   - `appearance-view.component.tsx`
   - `effects-view.component.tsx`
   - `prompt-view.component.tsx`
   - `assistant-view.component.tsx`

4. **`apps/terminal/src/modules/config/config.component.tsx`**:
   - Refactor to integrate `ConfigToolbar` at the top and render the active subview in the seamless scrollable container.

5. **Unit & Component Tests**:
   - `apps/terminal/tests/config/config.test.tsx`: Tests for subview switching, toolbar rendering, keyboard navigation, and persistence.

## Verification Plan

1. **Unit & Lint Tests**:
   - `pnpm turbo run lint typecheck test`
   - `cargo test --workspace`
2. **Visual Verification**:
   - Run Terminal app dev mode and verify in WebView2:
     - 4 category buttons render with correct SVG icons and tooltips.
     - Clicking each category smoothly switches the subview below.
     - Dropdown chevron button opens the menu, allowing selection of "All Settings" and individual categories.
     - Refreshing/reopening the app restores the last active category.
