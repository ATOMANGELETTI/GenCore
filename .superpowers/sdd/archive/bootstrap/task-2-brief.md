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
