# Traffic Light Hover Morph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Titlebar traffic lights stay 12px Aurora circles at rest, morph to a 2px-rounded square on that light’s hover or keyboard focus, and lose their ×/−/+ glyphs.

**Architecture:** CSS-only `border-radius` transition on each `TrafficLights` button in `@gencore/ui-kit`. Kit `--radius-sm` is 6px (a circle on a 12px box), so hover uses a one-off `rounded-[2px]`. No JS hover state, no app or Tauri changes.

**Tech Stack:** React 19.2, CVA, Tailwind 4, Vitest, Testing Library, Changesets.

## Global Constraints

- Official Nord hex only (`nord0`–`nord15`). Aurora fills stay `#BF616A` / `#EBCB8B` / `#A3BE8C` via existing `--traffic-close` / `--traffic-minimize` / `--traffic-maximize`.
- Flat macOS chrome: no drop shadows, no scale, no hover color/brightness change, no cluster-wide morph.
- Hover radius is exactly `2px` (`enabled:hover:rounded-[2px]`). Do not use `rounded-sm` (6px = still a circle on `size-3`).
- Transition is `transition-[border-radius,colors] duration-150` plus `motion-reduce:transition-none`.
- Disabled lights do not morph (`enabled:hover` and `enabled:focus-visible` only).
- No glyphs. `aria-label`s stay `Close window`, `Minimize window`, `Toggle maximize window`.
- No public API change. No new global radius token. No motion library.
- Tests live only under `packages/ui-kit/tests/`. No colocated `*.test.tsx`.
- Latest stable only. Do not add dependencies.
- Working tree is dirty with unrelated Terminess/sidebar WIP. Stage **only** the files listed in the task. Never `git add -A`. Do not commit unless the task’s commit step says to, and then only those files.
- Work in place on `main` (running `tauri:dev`). Do not create a worktree or switch branches.

---

## File map

- Modify: `packages/ui-kit/src/composites/titlebar/titlebar.component.tsx` — remove glyphs and `group/traffic`.
- Modify: `packages/ui-kit/src/composites/titlebar/titlebar.variants.ts` — hover/focus radius morph; drop glyph typography.
- Modify: `packages/ui-kit/tests/composites/titlebar.test.tsx` — no-glyph + hover-class tests.
- Modify: `packages/ui-kit/src/styles/theme.polar-night.css` — drop `--traffic-glyph`.
- Modify: `packages/ui-kit/src/styles/theme.snow-storm.css` — drop `--traffic-glyph`.
- Modify: `packages/ui-kit/src/styles/globals.css` — drop `--color-traffic-glyph` only; do not touch Terminess font lines.
- Create: `packages/ui-kit/tests/styles/traffic-tokens.test.ts` — assert glyph tokens are gone.
- Create: `.changeset/traffic-light-hover.md` — patch for `@gencore/ui-kit`.

---

### Task 1: Hover morph and glyph removal

**Files:**
- Modify: `packages/ui-kit/tests/composites/titlebar.test.tsx`
- Modify: `packages/ui-kit/src/composites/titlebar/titlebar.component.tsx`
- Modify: `packages/ui-kit/src/composites/titlebar/titlebar.variants.ts`

**Interfaces:**
- Consumes: existing `Titlebar` / `TrafficLights` / `trafficLightVariants({ light, active })`. `TrafficLightKind` stays `"close" | "minimize" | "maximize"`.
- Produces: same public exports. Buttons have no text children. Enabled lights include classes `rounded-full`, `enabled:hover:rounded-[2px]`, and `enabled:focus-visible:rounded-[2px]`.

- [ ] **Step 1: Write the failing tests**

Append these two cases inside the existing `describe("Titlebar", …)` in `packages/ui-kit/tests/composites/titlebar.test.tsx`. Do not change the six existing tests.

```tsx
  it("renders traffic lights without glyphs", () => {
    render(<Titlebar onClose={vi.fn()} onMinimize={vi.fn()} onToggleMaximize={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Close window" })).toHaveTextContent("");
    expect(screen.getByRole("button", { name: "Minimize window" })).toHaveTextContent("");
    expect(screen.getByRole("button", { name: "Toggle maximize window" })).toHaveTextContent("");
    expect(screen.queryByText("\u00D7")).not.toBeInTheDocument();
    expect(screen.queryByText("\u2212")).not.toBeInTheDocument();
    expect(screen.queryByText("\u002B")).not.toBeInTheDocument();
  });

  it("morphs enabled lights to a 2px rounded square on hover via class", () => {
    render(<Titlebar onClose={vi.fn()} onMinimize={vi.fn()} onToggleMaximize={vi.fn()} />);

    for (const name of [
      "Close window",
      "Minimize window",
      "Toggle maximize window",
    ] as const) {
      const light = screen.getByRole("button", { name });
      expect(light).toHaveClass("rounded-full");
      expect(light).toHaveClass("enabled:hover:rounded-[2px]");
      expect(light).toHaveClass("enabled:focus-visible:rounded-[2px]");
    }
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gencore/ui-kit test -- tests/composites/titlebar.test.tsx`

Expected: FAIL. `renders traffic lights without glyphs` fails because × / − / + are in the document. `morphs enabled lights…` fails because `enabled:hover:rounded-[2px]` is not on the buttons. The six existing tests still pass.

- [ ] **Step 3: Write minimal implementation**

In `packages/ui-kit/src/composites/titlebar/titlebar.component.tsx`, delete `trafficLightGlyph` and the inner `<span>`. Drop `group/traffic` from the wrapper (it exists only for cluster glyph reveal). Keep `trafficLightLabel` and the three `aria-label`s. `TrafficLights` becomes:

```tsx
export function TrafficLights({
  className,
  onClose,
  onMinimize,
  onToggleMaximize,
  ...props
}: TrafficLightsProps) {
  const lights: { kind: TrafficLightKind; onClick: (() => void) | undefined }[] = [
    { kind: "close", onClick: onClose },
    { kind: "minimize", onClick: onMinimize },
    { kind: "maximize", onClick: onToggleMaximize },
  ];

  return (
    <div
      data-slot="traffic-lights"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {lights.map(({ kind, onClick }) => (
        <button
          key={kind}
          type="button"
          data-slot={`traffic-light-${kind}`}
          aria-label={trafficLightLabel[kind]}
          disabled={!onClick}
          onClick={onClick}
          className={trafficLightVariants({ light: kind, active: Boolean(onClick) })}
        />
      ))}
    </div>
  );
}
```

Leave `Titlebar` unchanged.

In `packages/ui-kit/src/composites/titlebar/titlebar.variants.ts`, replace `trafficLightVariants` with:

```ts
export const trafficLightVariants = cva(
  [
    "size-3 rounded-full",
    "transition-[border-radius,colors] duration-150 outline-none",
    "enabled:hover:rounded-[2px] enabled:focus-visible:rounded-[2px]",
    "motion-reduce:transition-none",
    "focus-visible:ring-2 focus-visible:ring-ring/60",
  ],
  {
    variants: {
      light: {
        close: "bg-traffic-close",
        minimize: "bg-traffic-minimize",
        maximize: "bg-traffic-maximize",
      },
      active: {
        true: "",
        false: "bg-traffic-inactive",
      },
    },
    defaultVariants: { active: true },
  },
);
```

Do not add scale, hover color, or glyph classes. Do not change `titlebarVariants` or `titlebarTitleVariants`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/ui-kit test -- tests/composites/titlebar.test.tsx`

Expected: PASS (8 tests). Then run: `pnpm --filter @gencore/ui-kit test`

Expected: all ui-kit tests pass.

- [ ] **Step 5: Commit**

Stage only these three files:

```bash
git add packages/ui-kit/tests/composites/titlebar.test.tsx packages/ui-kit/src/composites/titlebar/titlebar.component.tsx packages/ui-kit/src/composites/titlebar/titlebar.variants.ts
git commit -m "feat(ui-kit): morph traffic lights to rounded squares on hover"
```

---

### Task 2: Dead glyph tokens and patch changeset

**Files:**
- Create: `packages/ui-kit/tests/styles/traffic-tokens.test.ts`
- Modify: `packages/ui-kit/src/styles/theme.polar-night.css`
- Modify: `packages/ui-kit/src/styles/theme.snow-storm.css`
- Modify: `packages/ui-kit/src/styles/globals.css` (delete `--color-traffic-glyph` only)
- Create: `.changeset/traffic-light-hover.md`

**Interfaces:**
- Consumes: Task 1’s glyph-free `TrafficLights` (no `text-traffic-glyph` class remains).
- Produces: no `--traffic-glyph` or `--color-traffic-glyph` in theme or Tailwind `@theme`. Fill tokens `--traffic-close` / `--traffic-minimize` / `--traffic-maximize` / `--traffic-inactive` unchanged.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-kit/tests/styles/traffic-tokens.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readStylesheet(name: string): string {
  return readFileSync(resolve(process.cwd(), "src/styles", name), "utf8");
}

describe("traffic light tokens", () => {
  it("does not keep a glyph color after icons were removed", () => {
    for (const name of [
      "globals.css",
      "theme.polar-night.css",
      "theme.snow-storm.css",
    ] as const) {
      const css = readStylesheet(name);
      expect(css, name).not.toMatch(/traffic-glyph/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/ui-kit test -- tests/styles/traffic-tokens.test.ts`

Expected: FAIL because `--traffic-glyph` / `--color-traffic-glyph` are still in those files.

- [ ] **Step 3: Remove the dead tokens**

In `packages/ui-kit/src/styles/theme.polar-night.css`, delete only this line:

```css
  --traffic-glyph: var(--nord-polar-0);
```

In `packages/ui-kit/src/styles/theme.snow-storm.css`, delete only this line:

```css
  --traffic-glyph: var(--nord-polar-0);
```

In `packages/ui-kit/src/styles/globals.css`, delete only this line:

```css
  --color-traffic-glyph: var(--traffic-glyph);
```

Do not change `--font-sans`, `--font-mono`, or any other globals.css lines (Terminess WIP). Leave the four traffic fill tokens in both themes.

Create `.changeset/traffic-light-hover.md`:

```md
---
"@gencore/ui-kit": patch
---

feat: morph titlebar traffic lights to rounded squares on hover
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/ui-kit test -- tests/styles/traffic-tokens.test.ts`

Expected: PASS.

Then run: `pnpm --filter @gencore/ui-kit test`

Expected: all ui-kit tests pass.

- [ ] **Step 5: Commit**

Stage only these five files:

```bash
git add packages/ui-kit/tests/styles/traffic-tokens.test.ts packages/ui-kit/src/styles/theme.polar-night.css packages/ui-kit/src/styles/theme.snow-storm.css packages/ui-kit/src/styles/globals.css .changeset/traffic-light-hover.md
git commit -m "chore(ui-kit): drop unused traffic-glyph token"
```
