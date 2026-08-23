# Terminal Background Particle Effects Specification

**Date**: 2026-08-23  
**Status**: Approved  
**Author**: Antigravity  
**Target App**: `@gencore/terminal` (`apps/terminal`)  

---

## 1. Overview & Objectives

This specification defines the architecture, rendering algorithms, user interaction physics, configuration options, and UI controls for an ambient, dynamic particle effect system running behind the `@gencore/terminal` xterm.js viewport.

The effect system brings an elegant, professional visual atmosphere inspired by the Antigravity design language while preserving maximum contrast and readability for terminal sessions, maintaining 60fps performance with minimal CPU/GPU overhead, and integrating seamlessly into the Nord design palette.

---

## 2. Visual Variations

The system supports three distinct animated variations plus an explicit `none` (off) mode:

### 2.1 Particles (Antigravity Micro-Dust)
- **Concept**: A field of tiny, floating stardust nodes with subtle Brownian motion and a gentle anti-gravity upward drift.
- **Node Count**: 65–90 particles scaled adaptively to viewport area.
- **Geometry**: Circles of radius $1.0\text{px} - 2.8\text{px}$ with soft radial alpha decay.
- **Palette (Polar Night)**: Frost-7 (`#8fbcbb`), Frost-8 (`#88c0d0`), Frost-9 (`#81a1c1`), and subtle Aurora-15 (`#b48ead`).
- **Palette (Snow Storm)**: Polar-2 (`#3b4252`), Polar-3 (`#4c566a`), Frost-9 (`#81a1c1`), and Frost-10 (`#5e81ac`) with reduced alpha.
- **Twinkle & Life**: Sine-wave modulated alpha pulsing over individual particle lifespans.

### 2.2 Molecules (Constellation / Synapse Network)
- **Concept**: Floating interconnected nodes forming dynamic molecular/synaptic bonds when proximity thresholds are met.
- **Node Count**: 35–55 nodes with randomized 2D velocity vectors.
- **Connection Logic**: For any two nodes with Euclidean distance $d < 110\text{px}$, render a connective line with opacity proportional to $(1 - d / 110)^2$.
- **Palette (Polar Night)**: Frost-8 (`#88c0d0`) nodes with Frost-9 (`#81a1c1`) and Polar-3 (`#4c566a`) filaments.
- **Palette (Snow Storm)**: Polar-2 (`#3b4252`) nodes with Snow-3 (`#d8dee9`) and Polar-3 (`#4c566a`) filaments.

### 2.3 Orbs (Luminous Ambient Spheres)
- **Concept**: 6–8 large, deeply diffused luminous spheres drifting across the viewport, slowly breathing in radius and opacity.
- **Orb Radius**: $70\text{px} - 190\text{px}$ rendered using multi-stop radial gradients:
  - Center: Nord color at $18\% - 28\%$ alpha
  - Midpoint ($40\%$): Nord color at $8\% - 12\%$ alpha
  - Edge ($100\%$): Nord color at $0\%$ alpha
- **Blending**: `globalCompositeOperation = 'screen'` (Polar Night) / `source-over` (Snow Storm) to produce luminous ambient color blending.
- **Motion**: Dual-harmonic sinusoidal paths for organic, non-repetitive drifting.

### 2.4 None (Off)
- Render loop is stopped completely, canvas is cleared, and terminal reverts to standard opaque Nord background.

---

## 3. Interaction Physics Modes

The effect responds to mouse movement and clicks within the terminal viewport according to the selected mode:

1. **`ambient` (None)**: Autonomous motion only. Mouse events over the terminal are ignored by the particle simulation.
2. **`repel` (Cursor Repulsion & Proximity Glow)**:
   - Moving the cursor across the terminal creates a localized force field with radius $R_{repel} = 120\text{px}$.
   - Nearby particles experience an inverse displacement force pushing them outward from the cursor position $(x_m, y_m)$, with smooth dampening ($0.88 - 0.94$).
   - Particles within the radius temporarily increase their brightness/glow.
3. **`ripple` (Click Ripples & Repel)**:
   - Inherits cursor repulsion.
   - On `mousedown` inside the terminal viewport, spawns an expanding wave ring $(r_0 \to r_{max} = 220\text{px})$ over 600ms that disperses intersecting particles outward along the shockwave normal, followed by gentle harmonic recovery.

---

## 4. Architecture & Component Structure

### 4.1 Module Layout (following `modular-naming`)
```
apps/terminal/src/modules/terminal-effect/
├── terminal-effect.canvas.ts      # Pure Canvas 2D math, particle structs, simulation tick & draw routines
├── terminal-effect.component.tsx   # React canvas wrapper, DPI resize observer, RAF loop, mouse event hooks
├── terminal-effect.hook.ts        # React hook connecting canvas to useConfig(), theme, and visibility state
└── terminal-effect.types.ts       # Types: EffectType, InteractionMode, Particle, Molecule, Orb, Ripple
```

### 4.2 Terminal Viewport Integration
- `TerminalView` renders `<TerminalBackgroundEffect />` positioned absolute `inset-0 pointer-events-none z-0` inside the terminal viewport container.
- `TerminalHostPane` (`xterm.js`) sits at `z-10 relative bg-transparent`.
- `terminal.theme.ts`:
  - When `backgroundEffect === 'none'`: `nordXtermTheme(theme)` returns standard solid background (`nord['polar-0']` or `nord['snow-6']`).
  - When `backgroundEffect !== 'none'`: `nordXtermTheme(theme)` returns a semi-translucent Nord veil:
    - Polar Night: `rgba(46, 52, 64, 0.74)` (hex `#2e3440` with $74\%$ alpha)
    - Snow Storm: `rgba(236, 239, 244, 0.78)` (hex `#eceff4` with $78\%$ alpha)
  - This ensures high ANSI text contrast while allowing the ambient background movement to shine through gently.

### 4.3 Lifecycle & Performance Engine
- `requestAnimationFrame` with timestamp delta `dt` capped at $\max(dt, 0.05)$ to prevent teleportation on frame drops.
- **Visibility Suspension**: `document.addEventListener('visibilitychange')` pauses the loop when the window is minimized or occluded.
- **Reduced Motion**: Detects `window.matchMedia('(prefers-reduced-motion: reduce)')` to freeze velocities and render static particle frames.
- **DPI Scaling**: Recomputes canvas buffer width/height by `window.devicePixelRatio` on resize.

---

## 5. Configuration & Persistence

### 5.1 Config State Schema
Extended `TerminalConfigV1` in `apps/terminal/src/modules/config/config.types.ts`:
```ts
export type BackgroundEffectType = "none" | "particles" | "molecules" | "orbs";
export type EffectInteractionMode = "ambient" | "repel" | "ripple";

export interface TerminalConfigV1 {
  version: 1;
  theme: ThemePreference;
  poshTheme: PoshThemeId;
  backgroundEffect: BackgroundEffectType;
  effectInteraction: EffectInteractionMode;
  effectOpacity: number; // 0.1 to 1.0 (default: 0.5)
  effectSpeed: number;   // 0.2 to 2.0 (default: 1.0)
}
```

### 5.2 Storage & Migration
`config.storage.ts` provides safe fallbacks when parsing legacy configs lacking the new properties:
- `backgroundEffect`: defaults to `"particles"`
- `effectInteraction`: defaults to `"repel"`
- `effectOpacity`: defaults to `0.5`
- `effectSpeed`: defaults to `1.0`

### 5.3 Config UI in Side Panel (`Config` Component)
New section in Side Panel: **Terminal Background Effect**:
1. **Effect Mode Cards**: Grid of 4 selectable cards (`Off`, `Particles`, `Molecules`, `Orbs`) with icon, title, and subtitle.
2. **Interaction Mode Selector**: 3-option radio group (`Ambient only`, `Cursor Repel`, `Click Ripples`).
3. **Opacity Control**: Slider from $10\%$ to $100\%$ with percentage indicator and preset chips (`Subtle: 30%`, `Balanced: 50%`, `Vivid: 75%`).
4. **Speed Multiplier**: Slider from $0.2\times$ to $2.0\times$ with active multiplier badge.

---

## 6. Testing & Quality Assurance

1. **Unit Tests**:
   - `tests/unit/config.storage.test.ts`: Serialization, defaults, and migration for all background effect keys.
   - `tests/unit/terminal-effect.canvas.test.ts`: Simulation ticks, bounds bouncing/wrapping, distance calculations, and shockwave propagation.
   - `tests/unit/terminal.theme.test.ts`: Dynamic background color transparency calculation based on effect mode and theme.
   - `tests/unit/config.component.test.tsx`: UI interaction testing for cards, radio buttons, sliders, and live config updates.
2. **Performance Criteria**:
   - $\le 0.5\%$ CPU overhead during active animation on 60Hz/120Hz displays.
   - $0.0\%$ CPU overhead when effect is set to `none` or window is hidden/minimized.
3. **Accessibility**:
   - Text contrast ratio passes WCAG AA on both Polar Night and Snow Storm themes.
   - Respects `prefers-reduced-motion`.
