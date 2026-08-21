# Nord official theme roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remap `@gencore/ui-kit` semantic tokens to official Nord roles (Polar Night / Snow Storm ambiance, Frost selected text, Aurora destructive/caution/warning/success/info) and apply Frost text to selected Tree rows and Terminal side-panel tabs.

**Architecture:** Keep the existing two theme stylesheets as the CSS source of truth. Change `--accent-foreground`, remap `--warning` to nord13, and add `--caution` (nord12). Register Tailwind `--color-caution`. Badge gets a `caution` variant; Tree selected rows add `text-accent-foreground`; Terminal selected tabs switch from `text-primary` to `text-accent-foreground`. No accent picker, no Settings UI, no Explorer source edits.

**Tech Stack:** React 19.2, Tailwind 4, CVA, Vitest, `@gencore/ui-kit`, `@gencore/terminal`. Official Nord palette (`nord0`–`nord15`) only.

**Spec:** `.superpowers/docs/specs/2026-08-20-nord-theme-roles-design.md`

## Global Constraints

- Latest **stable** only. No beta/rc/canary.
- Official Nord hex only (`nord0`–`nord15`). No ad-hoc hex, no Tailwind default palette colors.
- Polar Night is dark; Snow Storm is light (bright-to-dark: nord6 base, nord5 chrome, nord4 elevated).
- Accent *fills* stay nord2 (Polar Night) and nord4 (Snow Storm). Do not paint `--accent` with Frost.
- Frost text: Polar Night `--accent-foreground` = nord8; Snow Storm `--accent-foreground` = nord10. `--primary` and `--ring` stay nord8.
- Aurora: `--destructive` nord11, `--caution` nord12, `--warning` nord13, `--success` nord14, `--info` nord15. `--caution-foreground` = nord0.
- Traffic lights stay nord11 / nord13 / nord14. Do not edit traffic-light CSS or tests.
- `{module}.{role}.{ext}`. Tests only under that unit’s `tests/` directory.
- Do not edit `apps/explorer`. Do not edit `app.theme.css` density tokens. Do not add a theme switcher or Frost vs Aurora picker. Apps keep `defaultTheme="polar-night"`.
- No Button or menu `caution` variant.
- Patch changeset for `@gencore/ui-kit` only. Terminal is private — no app changeset.
- Stage **only** the files listed in the task. Never `git add -A`.
- Conventional commits. No Cursor/AI attribution trailers (`Co-authored-by: Cursor`, `Made-with: Cursor`, or similar).
- Work in place on the current branch. Do not create a worktree or switch branches unless asked.
- Do not bump major versions.
- Superpowers files stay under `.superpowers/docs/`. Do not write `docs/superpowers/`.

---

## File map

**ui-kit**

- Modify: `packages/ui-kit/tests/styles/theme.polar-night.test.ts`
- Modify: `packages/ui-kit/src/styles/theme.polar-night.css`
- Modify: `packages/ui-kit/src/styles/theme.snow-storm.css`
- Modify: `packages/ui-kit/src/tokens/tokens.colors.ts`
- Modify: `packages/ui-kit/src/tokens/tokens.nord.ts`
- Modify: `packages/ui-kit/src/styles/globals.css`
- Modify: `packages/ui-kit/src/primitives/badge/badge.variants.ts`
- Create: `packages/ui-kit/tests/primitives/badge/badge.test.tsx`
- Modify: `packages/ui-kit/src/primitives/tree/tree.variants.ts`
- Modify: `packages/ui-kit/tests/primitives/tree/tree.test.tsx`
- Modify: `packages/ui-kit/AGENTS.md`
- Create: `.changeset/nord-theme-roles.md`

**terminal**

- Modify: `apps/terminal/tests/unit/side-panel.test.tsx`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`

Do not modify `badge.types.ts` (`BadgeVariant` stays inferred from CVA). Do not modify `theme.provider.tsx`. Ghost/outline Button and menu variants already use `hover:text-accent-foreground` / `focus:text-accent-foreground` — leave them.

---

### Task 1: Official Nord semantic tokens

**Files:**
- Modify: `packages/ui-kit/tests/styles/theme.polar-night.test.ts`
- Modify: `packages/ui-kit/src/styles/theme.polar-night.css`
- Modify: `packages/ui-kit/src/styles/theme.snow-storm.css`
- Modify: `packages/ui-kit/src/tokens/tokens.colors.ts`
- Modify: `packages/ui-kit/src/tokens/tokens.nord.ts`
- Modify: `packages/ui-kit/src/styles/globals.css`
- Modify: `packages/ui-kit/AGENTS.md`
- Create: `.changeset/nord-theme-roles.md`

**Interfaces:**
- Consumes: existing `--nord-polar-*` / `--nord-snow-*` / `--nord-frost-*` / `--nord-aurora-*` palette variables (hex unchanged)
- Produces: `--accent-foreground` = `var(--nord-frost-8)` (Polar Night) and `var(--nord-frost-10)` (Snow Storm); `--caution` / `--caution-foreground`; `--warning` = `var(--nord-aurora-13)`. Tailwind utilities `bg-caution` / `text-caution-foreground`. `SemanticColorScale` gains `caution` and `cautionForeground`. `ThemeTokens` picks those keys up automatically from `Record<keyof SemanticColorScale, string>` — do not edit `theme.types.ts`.

- [ ] **Step 1: Write the failing stylesheet tests**

In `packages/ui-kit/tests/styles/theme.polar-night.test.ts`, replace the Polar Night semantic-role test and the Snow Storm background test with:

```ts
  it("maps the dark semantic roles onto the palette", () => {
    expect(polarNightCss).toContain("--background: var(--nord-polar-0);");
    expect(polarNightCss).toContain("--foreground: var(--nord-snow-4);");
    expect(polarNightCss).toContain("--card: var(--nord-polar-1);");
    expect(polarNightCss).toContain("--muted-foreground: var(--nord-polar-3);");
    expect(polarNightCss).toContain("--primary: var(--nord-frost-8);");
    expect(polarNightCss).toContain("--primary-foreground: var(--nord-polar-0);");
    expect(polarNightCss).toContain("--accent: var(--nord-polar-2);");
    expect(polarNightCss).toContain("--accent-foreground: var(--nord-frost-8);");
    expect(polarNightCss).toContain("--border: var(--nord-polar-2);");
    expect(polarNightCss).toContain("--input: var(--nord-polar-3);");
    expect(polarNightCss).toContain("--ring: var(--nord-frost-8);");
    expect(polarNightCss).toContain("--destructive: var(--nord-aurora-11);");
    expect(polarNightCss).toContain("--caution: var(--nord-aurora-12);");
    expect(polarNightCss).toContain("--caution-foreground: var(--nord-polar-0);");
    expect(polarNightCss).toContain("--warning: var(--nord-aurora-13);");
    expect(polarNightCss).toContain("--success: var(--nord-aurora-14);");
    expect(polarNightCss).toContain("--info: var(--nord-aurora-15);");
    expect(polarNightCss).toContain("--titlebar: var(--nord-polar-1);");
    expect(polarNightCss).toContain("--statusbar: var(--nord-polar-1);");
  });
```

```ts
  it("maps the light semantic roles onto Snow Storm backgrounds", () => {
    expect(snowStormCss).toContain("--background: var(--nord-snow-6);");
    expect(snowStormCss).toContain("--card: var(--nord-snow-5);");
    expect(snowStormCss).toContain("--foreground: var(--nord-polar-0);");
    expect(snowStormCss).toContain("--muted-foreground: var(--nord-polar-3);");
    expect(snowStormCss).toContain("--accent: var(--nord-snow-4);");
    expect(snowStormCss).toContain("--accent-foreground: var(--nord-frost-10);");
    expect(snowStormCss).toContain("--primary: var(--nord-frost-8);");
    expect(snowStormCss).toContain("--ring: var(--nord-frost-8);");
    expect(snowStormCss).toContain("--caution: var(--nord-aurora-12);");
    expect(snowStormCss).toContain("--caution-foreground: var(--nord-polar-0);");
    expect(snowStormCss).toContain("--warning: var(--nord-aurora-13);");
  });
```

Keep the palette-hex tests, `:root` default test, no-foreign-hex test, and Snow Storm “not `:root`” test unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/ui-kit test -- tests/styles/theme.polar-night.test.ts`

Expected: FAIL — Polar Night still has `--accent-foreground: var(--nord-snow-6)` and `--warning: var(--nord-aurora-12)`; `--caution` is missing; Snow Storm still has `--accent-foreground: var(--nord-polar-0)`.

- [ ] **Step 3: Remap both theme stylesheets**

In `packages/ui-kit/src/styles/theme.polar-night.css`, change only the Interactive accent-foreground and State block to:

```css
  --accent: var(--nord-polar-2);
  --accent-foreground: var(--nord-frost-8);

  /* State */
  --destructive: var(--nord-aurora-11);
  --destructive-foreground: var(--nord-snow-6);
  --caution: var(--nord-aurora-12);
  --caution-foreground: var(--nord-polar-0);
  --warning: var(--nord-aurora-13);
  --warning-foreground: var(--nord-polar-0);
  --success: var(--nord-aurora-14);
  --success-foreground: var(--nord-polar-0);
  --info: var(--nord-aurora-15);
  --info-foreground: var(--nord-polar-0);
```

Leave Polar Night surfaces, `--primary`, `--ring`, chrome, and traffic lights unchanged.

In `packages/ui-kit/src/styles/theme.snow-storm.css`, change only the Interactive accent-foreground and State block to:

```css
  --accent: var(--nord-snow-4);
  --accent-foreground: var(--nord-frost-10);

  /* State */
  --destructive: var(--nord-aurora-11);
  --destructive-foreground: var(--nord-snow-6);
  --caution: var(--nord-aurora-12);
  --caution-foreground: var(--nord-polar-0);
  --warning: var(--nord-aurora-13);
  --warning-foreground: var(--nord-polar-0);
  --success: var(--nord-aurora-14);
  --success-foreground: var(--nord-polar-0);
  --info: var(--nord-aurora-15);
  --info-foreground: var(--nord-polar-0);
```

Leave Snow Storm surfaces, `--primary`, `--ring`, chrome, and traffic lights unchanged. Do not add `:root` to the Snow Storm file.

- [ ] **Step 4: Keep the TypeScript scale in lockstep**

In `packages/ui-kit/src/tokens/tokens.colors.ts`, insert `caution` / `cautionForeground` on `SemanticColorScale` immediately after `destructiveForeground`:

```ts
  destructive: NordColorName;
  destructiveForeground: NordColorName;
  caution: NordColorName;
  cautionForeground: NordColorName;
  warning: NordColorName;
  warningForeground: NordColorName;
```

Update `polarNightColors`:

```ts
  accent: "polar-2",
  accentForeground: "frost-8",
  destructive: "aurora-11",
  destructiveForeground: "snow-6",
  caution: "aurora-12",
  cautionForeground: "polar-0",
  warning: "aurora-13",
  warningForeground: "polar-0",
```

Update `snowStormColors`:

```ts
  accent: "snow-4",
  accentForeground: "frost-10",
  destructive: "aurora-11",
  destructiveForeground: "snow-6",
  caution: "aurora-12",
  cautionForeground: "polar-0",
  warning: "aurora-13",
  warningForeground: "polar-0",
```

Change the Snow Storm comment above `snowStormColors` to:

```ts
/** Light theme: Snow Storm. Frost primary is nord8; selected text is nord10 on nord4 fills. */
```

In `packages/ui-kit/src/tokens/tokens.nord.ts`, replace the Aurora block comment with:

```ts
/** `nord11`–`nord15`. Vivid accents reserved for state (error/caution/warning/success/info). */
```

Do not change any hex literals in `tokens.nord.ts`.

- [ ] **Step 5: Register Tailwind caution colors**

In `packages/ui-kit/src/styles/globals.css`, inside `@theme inline` immediately after `--color-destructive-foreground`, add:

```css
  --color-caution: var(--caution);
  --color-caution-foreground: var(--caution-foreground);
```

Do not change `--color-warning`, traffic tokens, `::selection`, or scrollbar colors.

- [ ] **Step 6: Run stylesheet tests to verify they pass**

Run: `pnpm --filter @gencore/ui-kit test -- tests/styles/theme.polar-night.test.ts tests/styles/traffic-tokens.test.ts`

Expected: PASS. Traffic-light tests still pass because those variables were not edited.

- [ ] **Step 7: Docs and changeset**

In `packages/ui-kit/AGENTS.md`, replace the first two bullets with:

```md
- Official Nord hex only (`nord0`–`nord15`). Default theme is Polar Night (dark). Light theme is Snow Storm. Frost is primary/ring/selected text (`nord8` dark, `nord10` light selected text); Aurora is destructive/caution/warning/success/info (`nord11`–`nord15`)
- Flat macOS chrome: solid planes, 1px separators, compact controls, Aurora traffic lights (`#BF616A` / `#EBCB8B` / `#A3BE8C`)
```

Create `.changeset/nord-theme-roles.md`:

```md
---
"@gencore/ui-kit": patch
---

feat: map semantic tokens to official Nord Frost and Aurora roles
```

Do not run `pnpm changeset version`.

- [ ] **Step 8: Commit**

```bash
git add packages/ui-kit/tests/styles/theme.polar-night.test.ts packages/ui-kit/src/styles/theme.polar-night.css packages/ui-kit/src/styles/theme.snow-storm.css packages/ui-kit/src/tokens/tokens.colors.ts packages/ui-kit/src/tokens/tokens.nord.ts packages/ui-kit/src/styles/globals.css packages/ui-kit/AGENTS.md .changeset/nord-theme-roles.md
git commit -m "feat(ui-kit): map semantic tokens to official Nord roles"
```

---

### Task 2: Badge `caution` variant

**Files:**
- Create: `packages/ui-kit/tests/primitives/badge/badge.test.tsx`
- Modify: `packages/ui-kit/src/primitives/badge/badge.variants.ts`

**Interfaces:**
- Consumes: Tailwind `bg-caution` / `text-caution-foreground` and `bg-warning` / `text-warning-foreground` from Task 1
- Produces: `badgeVariants({ variant: "caution" })` includes `bg-caution text-caution-foreground`. `BadgeVariant` includes `"caution"` via `VariantProps<typeof badgeVariants>` — do not edit `badge.types.ts` or `badge.component.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/ui-kit/tests/primitives/badge/badge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "../../../src/primitives/badge";

describe("Badge", () => {
  it("applies the caution variant classes", () => {
    render(<Badge variant="caution">Rare</Badge>);

    expect(screen.getByText("Rare")).toHaveClass("bg-caution", "text-caution-foreground");
  });

  it("keeps warning on warning tokens", () => {
    render(<Badge variant="warning">Warn</Badge>);

    expect(screen.getByText("Warn")).toHaveClass("bg-warning", "text-warning-foreground");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/ui-kit test -- tests/primitives/badge/badge.test.tsx`

Expected: FAIL — `caution` is not a valid `badgeVariants` variant (type error and/or missing `bg-caution`).

- [ ] **Step 3: Add the CVA variant**

In `packages/ui-kit/src/primitives/badge/badge.variants.ts`, insert `caution` immediately after `destructive` and before `warning`:

```ts
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        caution: "border-transparent bg-caution text-caution-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        success: "border-transparent bg-success text-success-foreground",
        info: "border-transparent bg-info text-info-foreground",
```

Do not add Button or menu `caution` variants. Do not change default/secondary/outline.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/ui-kit test -- tests/primitives/badge/badge.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-kit/tests/primitives/badge/badge.test.tsx packages/ui-kit/src/primitives/badge/badge.variants.ts
git commit -m "feat(ui-kit): add Badge caution variant"
```

---

### Task 3: Tree selected Frost text

**Files:**
- Modify: `packages/ui-kit/tests/primitives/tree/tree.test.tsx`
- Modify: `packages/ui-kit/src/primitives/tree/tree.variants.ts`

**Interfaces:**
- Consumes: `--accent` fill and `--accent-foreground` Frost text from Task 1
- Produces: selected `treeRowVariants` class string `bg-accent text-accent-foreground`

- [ ] **Step 1: Extend the failing assertion**

In `packages/ui-kit/tests/primitives/tree/tree.test.tsx`, inside `it("sizes, indents, and styles rows"...)`, change the selected-drive assertion to:

```tsx
    expect(drive).toHaveClass(
      "h-[22px]",
      "select-none",
      "bg-accent",
      "text-accent-foreground",
      "overflow-hidden",
    );
```

Keep the muted-file assertions (`opacity-45`, not `bg-accent`) and padding assertions unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/ui-kit test -- tests/primitives/tree/tree.test.tsx`

Expected: FAIL — selected row has `bg-accent` but not `text-accent-foreground`.

- [ ] **Step 3: Add selected text class**

In `packages/ui-kit/src/primitives/tree/tree.variants.ts`, change the `selected` true branch:

```ts
      selected: {
        true: "bg-accent text-accent-foreground",
        false: "",
      },
```

Do not change row height (`h-[22px]`), muted opacity, chevron classes, or overflow variants.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @gencore/ui-kit test -- tests/primitives/tree/tree.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-kit/tests/primitives/tree/tree.test.tsx packages/ui-kit/src/primitives/tree/tree.variants.ts
git commit -m "feat(ui-kit): frost selected tree row text"
```

---

### Task 4: Terminal selected side-panel tabs

**Files:**
- Modify: `apps/terminal/tests/unit/side-panel.test.tsx`
- Modify: `apps/terminal/src/modules/side-panel/side-panel.component.tsx`

**Interfaces:**
- Consumes: `text-accent-foreground` and `before:bg-primary` from Task 1 tokens; existing ghost `Button` tabs
- Produces: selected tab classes include `text-accent-foreground` and `before:bg-primary`; they do not include `text-primary` except via the `before:bg-primary` underline (the text color class is `text-accent-foreground`, not `text-primary`)

- [ ] **Step 1: Write the failing assertions**

In `apps/terminal/tests/unit/side-panel.test.tsx`, inside `it("exposes a Side panel tablist with Files, Assistant, and Settings tabs"...)`, after the existing icon `size-3` loop, add:

```tsx
    const filesTab = screen.getByRole("tab", { name: "Files" });
    expect(filesTab).toHaveClass("text-accent-foreground", "before:bg-primary");
    expect(filesTab).not.toHaveClass("text-primary");

    expect(screen.getByRole("tab", { name: "Assistant" })).toHaveClass("text-muted-foreground");
```

Keep the `h-6` tablist assertion and the Files / Assistant / Settings presence checks.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/side-panel.test.tsx`

Expected: FAIL — selected Files tab still has `text-primary` and does not have `text-accent-foreground`.

- [ ] **Step 3: Switch selected tab text to accent-foreground**

In `apps/terminal/src/modules/side-panel/side-panel.component.tsx`, change only the selected-tab class string:

```tsx
                      isSelected
                        ? "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
```

Do not change `h-6`, `size="icon"`, `h-full w-auto flex-1 rounded-none`, Lucide `size-3`, tooltips, or keyboard tablist behavior.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/terminal test -- tests/unit/side-panel.test.tsx`

Then: `pnpm --filter @gencore/ui-kit test`

Expected: PASS on both.

- [ ] **Step 5: Commit**

```bash
git add apps/terminal/tests/unit/side-panel.test.tsx apps/terminal/src/modules/side-panel/side-panel.component.tsx
git commit -m "feat(terminal): frost selected side-panel tab text"
```

---

## Self-review

**Spec coverage**

- Polar Night dark / Snow Storm light, bright-to-dark surfaces unchanged — Task 1 (fills still nord0/1/2 and nord6/5/4)
- Accent fills stay nord2 / nord4, not Frost — Task 1 tests assert `--accent: var(--nord-polar-2)` and `--accent: var(--nord-snow-4)`
- Frost selected text nord8 dark / nord10 light; primary/ring stay nord8 — Task 1
- Aurora 11/12/13/14/15 plus `--caution` — Task 1
- Tailwind `--color-caution` — Task 1
- Badge `caution` only — Task 2
- Tree selected `text-accent-foreground` — Task 3
- Terminal selected tabs `text-accent-foreground`, keep `before:bg-primary` — Task 4
- Patch changeset `@gencore/ui-kit` — Task 1
- ui-kit AGENTS.md + `tokens.nord.ts` Aurora blurb — Task 1
- Non-goals (picker, Settings, Explorer, Button caution, traffic lights, density, muted-foreground nord5, secondary nord9) — Global Constraints / do-not-edit lists

**Placeholder scan:** none.

**Type consistency:** `--caution` / `--caution-foreground` in both CSS files, `caution` / `cautionForeground` on `SemanticColorScale`, `--color-caution` in `globals.css`, Badge variant `"caution"` using `bg-caution text-caution-foreground`. `accentForeground` is `"frost-8"` in `polarNightColors` and `"frost-10"` in `snowStormColors`, matching the CSS variables. `ThemeTokens` and `BadgeVariant` stay inferred — no hand-edits to `theme.types.ts` or `badge.types.ts`.
