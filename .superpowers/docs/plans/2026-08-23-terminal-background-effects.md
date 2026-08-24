# Terminal Background Particle Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a beautiful, high-performance ambient particle effect engine behind the terminal viewport with 3 effect variations (particles, molecules, orbs + none), customizable mouse physics (ambient, repel, click ripples), and full configuration controls in the side panel Config tab.

**Architecture:** A lightweight HTML5 2D Canvas engine is placed behind the xterm.js terminal pane in `TerminalView`, rendering frame-rate-independent physics at 60fps with DPI scaling, visibility/minimized throttling, and `prefers-reduced-motion` compliance. Terminal xterm theme adapts with semi-translucent Nord veil for crisp text legibility. All settings persist in `TerminalConfigV1` via `localStorage` and `useConfig()`.

**Tech Stack:** React 19, TypeScript, HTML5 Canvas 2D, Nord Design System, Tailwind CSS 4, Vitest, Testing Library.

**Spec:** `.superpowers/docs/specs/2026-08-23-terminal-background-effects-design.md`

## Global Constraints

- Official Nord hex colors only (`nord['polar-0']` `#2e3440` to `nord['aurora-15']` `#b48ead`).
- Modular naming: `src/modules/{module}/{module}.{role}.{ext}`. Tests only under `tests/unit/`.
- No remote fonts or scripts. Strict CSP compatibility.
- Zero CPU footprint when effect is set to `"none"` or window is hidden/minimized.

---

### Task 1: Config Types, Storage, and Context Extension

**Files:**
- Modify: `apps/terminal/src/modules/config/config.types.ts`
- Modify: `apps/terminal/src/modules/config/config.storage.ts`
- Modify: `apps/terminal/src/modules/config/config.hook.ts`
- Test: `apps/terminal/tests/unit/config.storage.test.ts`

**Interfaces:**
- Consumes: `TerminalConfigV1`, `ConfigContextValue` from `config.types.ts`.
- Produces:
  - `BackgroundEffectType`: `"none" | "particles" | "molecules" | "orbs"`
  - `EffectInteractionMode`: `"ambient" | "repel" | "ripple"`
  - Extended `TerminalConfigV1` fields: `backgroundEffect`, `effectInteraction`, `effectOpacity`, `effectSpeed`
  - Extended `ConfigContextValue` methods: `setBackgroundEffect`, `setEffectInteraction`, `setEffectOpacity`, `setEffectSpeed`

- [ ] **Step 1: Write failing unit test for config storage and migration**

In `apps/terminal/tests/unit/config.storage.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { loadConfig, saveConfig } from "../../src/modules/config/config.storage";
import type { TerminalConfigV1 } from "../../src/modules/config/config.types";

describe("config.storage background effects", () => {
  it("provides default background effect values when loading empty storage", () => {
    localStorage.clear();
    const config = loadConfig();
    expect(config.backgroundEffect).toBe("particles");
    expect(config.effectInteraction).toBe("repel");
    expect(config.effectOpacity).toBe(0.5);
    expect(config.effectSpeed).toBe(1.0);
  });

  it("migrates legacy v1 config missing effect properties", () => {
    localStorage.clear();
    localStorage.setItem(
      "gencore.terminal.config.v1",
      JSON.stringify({ version: 1, theme: "polar-night", poshTheme: "gencore" })
    );
    const config = loadConfig();
    expect(config.theme).toBe("polar-night");
    expect(config.backgroundEffect).toBe("particles");
    expect(config.effectInteraction).toBe("repel");
    expect(config.effectOpacity).toBe(0.5);
    expect(config.effectSpeed).toBe(1.0);
  });

  it("saves and reloads custom background effect settings", () => {
    localStorage.clear();
    const custom: TerminalConfigV1 = {
      version: 1,
      theme: "snow-storm",
      poshTheme: "bubbles",
      backgroundEffect: "molecules",
      effectInteraction: "ripple",
      effectOpacity: 0.75,
      effectSpeed: 1.5,
    };
    saveConfig(custom);
    const loaded = loadConfig();
    expect(loaded).toEqual(custom);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test config.storage.test.ts`
Expected: FAIL with missing properties on `TerminalConfigV1` and `loadConfig()`.

- [ ] **Step 3: Update `config.types.ts`, `config.storage.ts`, and `config.hook.ts`**

Update `config.types.ts`:
```ts
export type BackgroundEffectType = "none" | "particles" | "molecules" | "orbs";
export type EffectInteractionMode = "ambient" | "repel" | "ripple";

export interface TerminalConfigV1 {
  version: 1;
  theme: ThemePreference;
  poshTheme: PoshThemeId;
  backgroundEffect: BackgroundEffectType;
  effectInteraction: EffectInteractionMode;
  effectOpacity: number;
  effectSpeed: number;
}

export interface ConfigContextValue {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  resolvedTheme: ThemeName;
  poshTheme: PoshThemeId;
  setPoshTheme: (next: PoshThemeId) => void;
  backgroundEffect: BackgroundEffectType;
  setBackgroundEffect: (next: BackgroundEffectType) => void;
  effectInteraction: EffectInteractionMode;
  setEffectInteraction: (next: EffectInteractionMode) => void;
  effectOpacity: number;
  setEffectOpacity: (next: number) => void;
  effectSpeed: number;
  setEffectSpeed: (next: number) => void;
}
```

Update `config.storage.ts` defaults and parser:
```ts
export const DEFAULT_CONFIG: TerminalConfigV1 = {
  version: 1,
  theme: "system",
  poshTheme: "gencore",
  backgroundEffect: "particles",
  effectInteraction: "repel",
  effectOpacity: 0.5,
  effectSpeed: 1.0,
};
```

Update `config.hook.ts` to manage and expose setters for the new properties.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test config.storage.test.ts`
Expected: PASS.

---

### Task 2: Pure Canvas 2D Engine Physics & Draw Routines

**Files:**
- Create: `apps/terminal/src/modules/terminal-effect/terminal-effect.types.ts`
- Create: `apps/terminal/src/modules/terminal-effect/terminal-effect.canvas.ts`
- Test: `apps/terminal/tests/unit/terminal-effect.canvas.test.ts`

**Interfaces:**
- Consumes: `BackgroundEffectType`, `EffectInteractionMode` from `config.types.ts`, `ThemeName` from `@gencore/ui-kit`.
- Produces:
  - `createSimulation(width: number, height: number, type: BackgroundEffectType, theme: ThemeName): SimulationState`
  - `stepSimulation(state: SimulationState, dt: number, pointer: PointerState, interaction: EffectInteractionMode, speed: number): void`
  - `renderSimulation(ctx: CanvasRenderingContext2D, state: SimulationState, opacity: number): void`
  - `triggerClickRipple(state: SimulationState, x: number, y: number): void`

- [ ] **Step 1: Write failing unit tests for canvas simulation math**

In `apps/terminal/tests/unit/terminal-effect.canvas.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  createSimulation,
  stepSimulation,
  triggerClickRipple,
} from "../../src/modules/terminal-effect/terminal-effect.canvas";

describe("terminal-effect.canvas physics", () => {
  it("initializes particles within canvas boundaries", () => {
    const state = createSimulation(800, 600, "particles", "polar-night");
    expect(state.particles.length).toBeGreaterThan(30);
    for (const p of state.particles) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(800);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(600);
    }
  });

  it("updates particle positions over time", () => {
    const state = createSimulation(800, 600, "particles", "polar-night");
    const initialY = state.particles[0]!.y;
    const initialX = state.particles[0]!.x;
    stepSimulation(state, 0.1, { x: -1000, y: -1000, active: false }, "ambient", 1.0);
    expect(state.particles[0]!.x !== initialX || state.particles[0]!.y !== initialY).toBe(true);
  });

  it("applies cursor repulsion when pointer is active", () => {
    const state = createSimulation(800, 600, "molecules", "polar-night");
    const target = state.molecules[0]!;
    target.x = 400;
    target.y = 300;
    target.vx = 0;
    target.vy = 0;
    stepSimulation(state, 0.05, { x: 410, y: 300, active: true }, "repel", 1.0);
    // Cursor is to the right (410), node at (400) should be repelled to the left (vx < 0)
    expect(target.vx).toBeLessThan(0);
  });

  it("spawns and steps click ripples", () => {
    const state = createSimulation(800, 600, "particles", "polar-night");
    triggerClickRipple(state, 200, 200);
    expect(state.ripples.length).toBe(1);
    expect(state.ripples[0]!.radius).toBe(0);
    stepSimulation(state, 0.1, { x: 200, y: 200, active: true }, "ripple", 1.0);
    expect(state.ripples[0]!.radius).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test terminal-effect.canvas.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `terminal-effect.types.ts` and `terminal-effect.canvas.ts`**

Define types:
```ts
export interface BaseEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

export interface ParticleEntity extends BaseEntity {
  radius: number;
  baseAlpha: number;
  pulseSpeed: number;
  phase: number;
}

export interface MoleculeNode extends BaseEntity {
  radius: number;
  alpha: number;
}

export interface OrbEntity extends BaseEntity {
  baseRadius: number;
  currentRadius: number;
  alpha: number;
  phase: number;
  wobbleSpeed: number;
}

export interface ClickRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}
```

Implement algorithms in `terminal-effect.canvas.ts` utilizing Nord colors:
- Nord Frost (`#8fbcbb`, `#88c0d0`, `#81a1c1`, `#5e81ac`), Polar (`#2e3440`, `#3b4252`, `#4c566a`), Snow (`#d8dee9`, `#e5e9f0`, `#eceff4`), Aurora (`#b48ead`).
- Efficient pairwise distance check for molecules ($O(N^2)$ where $N \le 55$, easily under 0.05ms per frame).
- Smooth radial gradients for Orbs with `globalCompositeOperation = 'screen'` in dark mode.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test terminal-effect.canvas.test.ts`
Expected: PASS.

---

### Task 3: Terminal Effect Component & Lifecycle Hook

**Files:**
- Create: `apps/terminal/src/modules/terminal-effect/terminal-effect.hook.ts`
- Create: `apps/terminal/src/modules/terminal-effect/terminal-effect.component.tsx`
- Test: `apps/terminal/tests/unit/terminal-effect.component.test.tsx`

**Interfaces:**
- Consumes: `useConfig()`, `useTheme()`, `createSimulation`, `stepSimulation`, `renderSimulation`.
- Produces: `<TerminalBackgroundEffect containerRef?: React.RefObject<HTMLDivElement> />`

- [ ] **Step 1: Write failing component test**

In `apps/terminal/tests/unit/terminal-effect.component.test.tsx`:
```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfigProvider } from "../../src/modules/config/config.hook";
import { TerminalBackgroundEffect } from "../../src/modules/terminal-effect/terminal-effect.component";

describe("<TerminalBackgroundEffect />", () => {
  it("renders a canvas with accessibility attributes and full inset positioning", () => {
    const { container } = render(
      <ConfigProvider>
        <TerminalBackgroundEffect />
      </ConfigProvider>
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeTruthy();
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    expect(canvas?.className).toContain("pointer-events-none");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test terminal-effect.component.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement hook and component**

In `terminal-effect.hook.ts`:
- Sets up `HTMLCanvasElement` ref and 2D context.
- Handles `ResizeObserver` on parent container with `window.devicePixelRatio` scaling.
- Mounts mouse event listeners on the terminal viewport container (`mousemove`, `mouseleave`, `mousedown`) to pass pointer coordinates to simulation.
- Runs `requestAnimationFrame` loop calculating `dt`.
- Detects `document.visibilityState` to suspend rendering when hidden.
- Checks `window.matchMedia('(prefers-reduced-motion: reduce)')` to freeze velocities.

In `terminal-effect.component.tsx`:
- Returns `<canvas data-slot="terminal-background-effect" className="pointer-events-none absolute inset-0 h-full w-full z-0" aria-hidden="true" />`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test terminal-effect.component.test.tsx`
Expected: PASS.

---

### Task 4: Terminal View Layering & Xterm Translucent Theme

**Files:**
- Modify: `apps/terminal/src/modules/terminal/terminal.theme.ts`
- Modify: `apps/terminal/src/modules/terminal/terminal.component.tsx`
- Test: `apps/terminal/tests/unit/terminal.theme.test.ts`

**Interfaces:**
- Consumes: `BackgroundEffectType`, `ThemeName`.
- Produces: `nordXtermTheme(theme: ThemeName, effect?: BackgroundEffectType): ITheme`

- [ ] **Step 1: Write failing theme test for translucent background support**

In `apps/terminal/tests/unit/terminal.theme.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { nordXtermTheme } from "../../src/modules/terminal/terminal.theme";

describe("nordXtermTheme transparency", () => {
  it("returns solid background when backgroundEffect is none", () => {
    const dark = nordXtermTheme("polar-night", "none");
    expect(dark.background).toBe("#2e3440");
    const light = nordXtermTheme("snow-storm", "none");
    expect(light.background).toBe("#eceff4");
  });

  it("returns translucent background veil when backgroundEffect is active", () => {
    const dark = nordXtermTheme("polar-night", "particles");
    expect(dark.background).toMatch(/^rgba\(46,\s*52,\s*64,\s*0\.7\d*\)$/);
    const light = nordXtermTheme("snow-storm", "particles");
    expect(light.background).toMatch(/^rgba\(236,\s*239,\s*244,\s*0\.7\d*\)$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test terminal.theme.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `terminal.theme.ts` and `terminal.component.tsx`**

In `terminal.theme.ts`:
- Update `nordXtermTheme(theme: ThemeName, effect: BackgroundEffectType = "none")`.
- When `effect !== "none"`, set `background: theme === "snow-storm" ? "rgba(236, 239, 244, 0.78)" : "rgba(46, 52, 64, 0.74)"`.

In `terminal.component.tsx`:
- In `TerminalView`, instantiate `<TerminalBackgroundEffect />` inside `viewportRef` at `z-0`.
- Update `host.terminal.options.theme = nordXtermTheme(theme, backgroundEffect)` when theme or `backgroundEffect` changes.
- Ensure host panes have `z-10 relative` so terminal text and cursor render over the canvas without obstruction.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test terminal.theme.test.ts`
Expected: PASS.

---

### Task 5: Side Panel Config Tab UI Controls

**Files:**
- Modify: `apps/terminal/src/modules/config/config.component.tsx`
- Test: `apps/terminal/tests/unit/config.component.test.tsx`

**Interfaces:**
- Consumes: `useConfig()` (`backgroundEffect`, `setBackgroundEffect`, `effectInteraction`, `setEffectInteraction`, `effectOpacity`, `setEffectOpacity`, `effectSpeed`, `setEffectSpeed`).
- Produces: Config tab sections with effect selector cards, interaction mode radio group, opacity slider, speed slider.

- [ ] **Step 1: Write failing UI tests for new config controls**

In `apps/terminal/tests/unit/config.component.test.tsx`:
```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Config } from "../../src/modules/config/config.component";
import { ConfigProvider } from "../../src/modules/config/config.hook";

describe("<Config /> background effect controls", () => {
  it("renders the background effect option cards and switches effect", () => {
    render(
      <ConfigProvider>
        <Config />
      </ConfigProvider>
    );
    expect(screen.getByText(/Terminal Background Effect/i)).toBeInTheDocument();
    const orbsOption = screen.getByRole("radio", { name: /Orbs/i });
    expect(orbsOption).toBeInTheDocument();
    fireEvent.click(orbsOption);
    expect(orbsOption.getAttribute("aria-checked")).toBe("true");
  });

  it("renders opacity and speed sliders and updates values", () => {
    render(
      <ConfigProvider>
        <Config />
      </ConfigProvider>
    );
    const opacitySlider = screen.getByLabelText(/Effect Opacity/i);
    expect(opacitySlider).toBeInTheDocument();
    fireEvent.change(opacitySlider, { target: { value: "0.75" } });
    expect(screen.getByText("75%")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test config.component.test.tsx`
Expected: FAIL with text not found.

- [ ] **Step 3: Implement Config UI section in `config.component.tsx`**

Add:
1. **Effect Type Selector**:
   - Cards for `none` (Off), `particles` (Antigravity Particles), `molecules` (Molecules), `orbs` (Luminous Orbs) with Lucide icons (`Ban`, `Sparkles`, `Share2` or `Atom`, `Orbit` or `SunMedium`).
2. **Mouse Interaction Mode**:
   - Radio buttons for `ambient` (None), `repel` (Cursor Repel), `ripple` (Click Ripples).
3. **Opacity Control**:
   - Slider input (`min="0.1"`, `max="1.0"`, `step="0.05"`) with percentage badge and quick-preset buttons (`Subtle: 30%`, `Balanced: 50%`, `Vivid: 75%`).
4. **Speed Control**:
   - Slider input (`min="0.2"`, `max="2.0"`, `step="0.1"`) with multiplier badge (`1.0x`) and preset chips (`0.5x`, `1.0x`, `1.5x`).
- Apply strict Nord styling consistent with other Config tab sections (flat macOS look, compact density, keyboard navigability).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/terminal test config.component.test.tsx`
Expected: PASS.

---

### Task 6: Comprehensive Verification & Workspace Health

**Files:**
- None (verification across all workspace packages and apps)

- [ ] **Step 1: Run terminal app tests**
Run: `pnpm --filter @gencore/terminal test`
Expected: All tests pass.

- [ ] **Step 2: Run terminal app typecheck & lint**
Run: `pnpm --filter @gencore/terminal typecheck`
Run: `pnpm --filter @gencore/terminal lint`
Expected: Clean with 0 errors.

- [ ] **Step 3: Run full workspace test suite**
Run: `pnpm turbo run lint typecheck test`
Expected: All packages and apps pass cleanly.
