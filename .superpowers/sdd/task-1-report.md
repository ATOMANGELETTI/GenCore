# Task 1 Report: Hover morph and glyph removal

## What I implemented

CSS-only per-light hover/focus morph and glyph removal on `@gencore/ui-kit` titlebar traffic lights.

- Removed `trafficLightGlyph` and the inner `<span>` from `TrafficLights`. Buttons are now empty (aria-labels unchanged: `Close window`, `Minimize window`, `Toggle maximize window`).
- Dropped `group/traffic` from the cluster wrapper (it existed only for cluster glyph reveal).
- Left `Titlebar` unchanged.
- Replaced `trafficLightVariants` base classes with `size-3 rounded-full`, `transition-[border-radius,colors] duration-150`, `enabled:hover:rounded-[2px]`, `enabled:focus-visible:rounded-[2px]`, and `motion-reduce:transition-none`. Dropped glyph typography (`text-[8px]`, `text-traffic-glyph`, flex centering).
- Did not add scale, hover color, or glyph classes. Did not change `titlebarVariants` or `titlebarTitleVariants`.
- Did not drop `--traffic-glyph` tokens or add a changeset (Task 2).

## What I tested and test results

Focused: `pnpm --filter @gencore/ui-kit test -- tests/composites/titlebar.test.tsx`

- After implementation: **8 passed** (6 existing + 2 new).

Full package: `pnpm --filter @gencore/ui-kit test`

- **8 files, 36 tests passed.** Duration ~2.14s. Exit 0.

## TDD Evidence

### RED

Command:

```
pnpm --filter @gencore/ui-kit test -- tests/composites/titlebar.test.tsx
```

Result: **FAIL** — `2 failed | 6 passed (8)`

Relevant output before implementation:

```
FAIL  tests/composites/titlebar.test.tsx > Titlebar > renders traffic lights without glyphs
Error: expect(element).toHaveTextContent()
Received:
  ×

FAIL  tests/composites/titlebar.test.tsx > Titlebar > morphs enabled lights to a 2px rounded square on hover via class
Error: expect(element).toHaveClass("enabled:hover:rounded-[2px]")
Expected the element to have class:
  enabled:hover:rounded-[2px]
Received:
  flex size-3 items-center justify-center rounded-full text-[8px] leading-none font-bold text-traffic-glyph transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 bg-traffic-close
```

Why expected: production still rendered ×/−/+ glyph spans, and `trafficLightVariants` had no `enabled:hover:rounded-[2px]` / `enabled:focus-visible:rounded-[2px]`. The six existing tests still passed.

### GREEN

Same focused command after implementation:

```
pnpm --filter @gencore/ui-kit test -- tests/composites/titlebar.test.tsx
```

Result: **PASS** — `Tests  8 passed (8)`

Then full suite:

```
pnpm --filter @gencore/ui-kit test
```

Result: **PASS** — `Test Files  8 passed (8)` / `Tests  36 passed (36)`

## Files changed

Committed (only these three):

- `packages/ui-kit/tests/composites/titlebar.test.tsx`
- `packages/ui-kit/src/composites/titlebar/titlebar.component.tsx`
- `packages/ui-kit/src/composites/titlebar/titlebar.variants.ts`

Not committed (out of scope / dirty tree): hook state, SDD progress/brief, `docs/`.

## Self-review findings

- Implementation matches the brief verbatim. Public API unchanged. `TrafficLightKind` still `"close" | "minimize" | "maximize"`.
- Pre-commit Biome reformatted the new hover-class test’s `for` array onto one line. Assertions unchanged.
- Unused `--traffic-glyph` / `--color-traffic-glyph` tokens remain by design (Task 2).
- No extra files, no worktree, no branch switch, no `git add -A`.

## Issues or concerns

None for Task 1. Token cleanup and changeset are Task 2.

---

## Final-review fix: interpolate rest radius from 6px

### What I changed

- Rest traffic-light shape is now `rounded-[6px]` (circle-sized length on `size-3` / 12px) so `border-radius` can interpolate to `2px`. Hover/focus stay `enabled:hover:rounded-[2px]` and `enabled:focus-visible:rounded-[2px]`.
- Transition property is `transition-[border-radius] duration-150` only (`colors` is not a valid CSS `transition-property`).
- Morph test assertion updated from `rounded-full` to `rounded-[6px]`.

### TDD RED/GREEN evidence

**RED** — test updated first, production still `rounded-full`:

```
pnpm --filter @gencore/ui-kit test -- tests/composites/titlebar.test.tsx
```

Result: **FAIL** — `1 failed | 7 passed (8)`

```
FAIL  tests/composites/titlebar.test.tsx > Titlebar > morphs enabled lights to a 2px rounded square on hover via class
Error: expect(element).toHaveClass("rounded-[6px]")
Expected the element to have class:
  rounded-[6px]
Received:
  size-3 rounded-full transition-[border-radius,colors] duration-150 outline-none enabled:hover:rounded-[2px] enabled:focus-visible:rounded-[2px] ...
```

**GREEN** — after variants change, same command:

```
pnpm --filter @gencore/ui-kit test -- tests/composites/titlebar.test.tsx
```

Result: **PASS** — `Tests  8 passed (8)`

Covering files:

```
pnpm --filter @gencore/ui-kit test -- tests/composites/titlebar.test.tsx tests/styles/traffic-tokens.test.ts
```

Result: **PASS** — `Test Files  2 passed (2)` / `Tests  9 passed (9)`

### Files changed

Committed only:

- `packages/ui-kit/src/composites/titlebar/titlebar.variants.ts`
- `packages/ui-kit/tests/composites/titlebar.test.tsx`

Commit: `bcfea68` `fix(ui-kit): interpolate traffic-light hover radius from 6px`

### Concerns

None. Did not add a disabled-light test. Did not change tokens, changeset, apps, or other files.
